import { NextResponse } from 'next/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient, createAdminClient } from '@/utils/supabase/server';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
});

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  confirmEmail: z.string().email().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleData } = await supabase.from('user_roles').select('role, parent_admin_id').eq('user_id', user.id).single();
    if (roleData?.role !== 'superadmin' && roleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Requires administrative privileges' }, { status: 403 });
    }

    const requesterRole = roleData.role;
    const requesterId = user.id;
    const targetGroupId = roleData.parent_admin_id || requesterId; // The Owner's ID for this group
    const adminSupabase = createAdminClient();
    
    // 1. Get all users from Auth API
    const { data: authUsers, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) throw listError;

    // 2. Get all roles
    const { data: rolesData, error: rolesError } = await adminSupabase.from('user_roles').select('*');
    if (rolesError) throw rolesError;

    // 3. Merge, filter and include parent admin details
    const users = authUsers.users.map((u) => {
      const roleObj = rolesData.find((r) => r.user_id === u.id);
      const parentAdminObj = roleObj?.parent_admin_id ? rolesData.find((r) => r.user_id === roleObj.parent_admin_id) : null;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role: roleObj ? roleObj.role : 'user',
        parent_admin_id: roleObj?.parent_admin_id || null,
        parent_admin_email: parentAdminObj?.email || null
      };
    }).filter((u) => {
      if (requesterRole === 'superadmin') return true;
      if (requesterRole === 'admin') {
        // Admins only see users that belong to their group (including the owner, co-admins, and users)
        return u.parent_admin_id === targetGroupId || u.id === targetGroupId;
      }
      return false;
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleData } = await supabase.from('user_roles').select('role, parent_admin_id').eq('user_id', user.id).single();
    if (roleData?.role !== 'superadmin' && roleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Requires administrative privileges' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.format() }, { status: 400 });
    }
    const { userId, role, email, password } = parsed.data;
    
    const adminSupabase = createAdminClient();

    if (roleData.role === 'admin') {
      // Verify target user belongs to admin's group
      const targetGroupId = roleData.parent_admin_id || user.id;
      const { data: targetRole } = await adminSupabase.from('user_roles').select('parent_admin_id').eq('user_id', userId).single();
      
      if (targetRole?.parent_admin_id !== targetGroupId && userId !== targetGroupId) {
         return NextResponse.json({ error: 'Forbidden: You can only edit users in your group' }, { status: 403 });
      }
      // Admins cannot change someone to superadmin
      if (role === 'superadmin') {
         return NextResponse.json({ error: 'Forbidden: Cannot elevate role to superadmin' }, { status: 403 });
      }
    }

    // 1. Update Auth data (email, password)
    const authUpdatePayload: any = {};
    if (email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = password;
    
    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(
        userId,
        authUpdatePayload
      );
      if (updateAuthError) throw updateAuthError;
    }

    // 2. Update Role
    if (role) {
      const { error: roleError } = await adminSupabase.from('user_roles').update({ role }).eq('user_id', userId);
      if (roleError) throw roleError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleData } = await supabase.from('user_roles').select('role, parent_admin_id').eq('user_id', user.id).single();
    if (roleData?.role !== 'superadmin' && roleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Requires administrative privileges' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = deleteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.format() }, { status: 400 });
    }
    const { userId, confirmEmail } = parsed.data;

    const adminSupabase = createAdminClient();

    // Fetch target user's role info
    const { data: targetRoleData } = await adminSupabase.from('user_roles').select('role, parent_admin_id, email, company_logo').eq('user_id', userId).single();

    // Determine if target is a Company Owner (admin without parent_admin_id)
    const isCompanyOwner = targetRoleData?.role === 'admin' && !targetRoleData?.parent_admin_id;

    // === COMPANY OWNER CASCADE DELETE ===
    if (isCompanyOwner) {
      // Only superadmin or the owner themselves can delete a Company Owner
      const isSelf = user.id === userId;
      if (roleData.role !== 'superadmin' && !isSelf) {
        return NextResponse.json({ error: 'Forbidden: Only Super Admin or the Company Owner themselves can delete a Company Owner' }, { status: 403 });
      }

      // Require email confirmation
      if (!confirmEmail || confirmEmail !== targetRoleData?.email) {
        return NextResponse.json({ error: 'Email confirmation does not match. Please type the exact email to confirm deletion.' }, { status: 400 });
      }

      // 1. Find all users in this group (users with parent_admin_id = ownerId)
      const { data: groupMembers } = await adminSupabase
        .from('user_roles')
        .select('user_id')
        .eq('parent_admin_id', userId);
      
      const allGroupUserIds = [
        ...(groupMembers || []).map((m: { user_id: string }) => m.user_id),
        userId // Include the owner
      ];

      // 2. Collect all image_urls from spatial_nodes created by group members
      const { data: groupNodes } = await adminSupabase
        .from('spatial_nodes')
        .select('image_url')
        .in('created_by', allGroupUserIds);

      // 3. Collect company logo URL
      const allImageUrls: string[] = [];
      if (groupNodes) {
        for (const node of groupNodes) {
          if (node.image_url) allImageUrls.push(node.image_url);
        }
      }
      if (targetRoleData?.company_logo) {
        allImageUrls.push(targetRoleData.company_logo);
      }

      // 4. Delete files from Supabase Storage + legacy local files
      for (const url of allImageUrls) {
        try {
          // Extract filename from URL (last path segment)
          const urlObj = new URL(url);
          const fileName = urlObj.pathname.split('/').pop();
          if (!fileName) continue;

          const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
          if (!safeName) continue;

          // Try removing from both storage buckets
          await adminSupabase.storage.from('panoramas').remove([safeName]);
          await adminSupabase.storage.from('logos').remove([safeName]);
        } catch {
          // Continue even if individual file deletion fails
        }

        // Also clean up legacy local files in public/ folder
        try {
          if (url.startsWith('/uploads/') || url.startsWith('/images/logo/')) {
            const subDir = url.startsWith('/images/logo/') ? 'images/logo' : 'uploads';
            const localFileName = url.split('/').pop()?.replace(/[^a-zA-Z0-9.\-_]/g, '');
            if (localFileName) {
              const uploadDir = path.join(process.cwd(), 'public', subDir);
              const absolutePath = path.join(uploadDir, localFileName);
              if (path.resolve(absolutePath).startsWith(path.resolve(uploadDir))) {
                try {
                  await fs.access(absolutePath);
                  await fs.unlink(absolutePath);
                } catch {
                  // File already gone or inaccessible
                }
              }
            }
          }
        } catch {
          // Continue even if local file cleanup fails
        }
      }

      // 5. Delete all spatial_nodes owned by group members
      const { error: nodesError } = await adminSupabase
        .from('spatial_nodes')
        .delete()
        .in('created_by', allGroupUserIds);
      if (nodesError) console.error('Error deleting spatial_nodes:', nodesError);

      // 6. Delete all locations owned by group members
      const { error: locationsError } = await adminSupabase
        .from('locations')
        .delete()
        .in('created_by', allGroupUserIds);
      if (locationsError) console.error('Error deleting locations:', locationsError);

      // 7. Delete all group member users from auth (this cascades to user_roles)
      // Delete members first, then the owner
      for (const member of (groupMembers || [])) {
        try {
          await adminSupabase.auth.admin.deleteUser(member.user_id);
        } catch (err) {
          console.error(`Error deleting group member ${member.user_id}:`, err);
        }
      }

      // 8. Delete the Company Owner from auth
      const { error } = await adminSupabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      return NextResponse.json({ success: true, cascade: true });
    }

    // === REGULAR USER DELETE (non-Company Owner) ===
    const targetGroupId = roleData.parent_admin_id || user.id;

    // Self-deletion guard only for non-owner regular users
    if (user.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account from here.' }, { status: 403 });
    }

    // If requester is admin, verify target user belongs to their group
    if (roleData.role === 'admin') {
      if (userId === targetGroupId) {
        return NextResponse.json({ error: 'Forbidden: Cannot delete the Company Owner' }, { status: 403 });
      }
      if (targetRoleData?.parent_admin_id !== targetGroupId) {
        return NextResponse.json({ error: 'Forbidden: You can only delete users in your group' }, { status: 403 });
      }
    }

    // Deleting from auth.users automatically cascades to user_roles
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

