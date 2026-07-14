import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';

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

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleData?.role !== 'superadmin' && roleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Requires administrative privileges' }, { status: 403 });
    }

    const { userId, role } = await req.json();
    const adminSupabase = createAdminClient();

    // Only superadmin can change user roles
    if (roleData.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin can change user roles' }, { status: 403 });
    }

    const { error } = await adminSupabase.from('user_roles').update({ role }).eq('user_id', userId);
    if (error) throw error;

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

    const { userId } = await req.json();
    const adminSupabase = createAdminClient();
    const targetGroupId = roleData.parent_admin_id || user.id;

    // If requester is admin, verify target user belongs to their group
    if (roleData.role === 'admin') {
      const { data: targetRole } = await adminSupabase.from('user_roles').select('parent_admin_id').eq('user_id', userId).single();
      
      // Co-Admins or Owners can delete users in their group, BUT cannot delete the Company Owner
      if (userId === targetGroupId) {
         return NextResponse.json({ error: 'Forbidden: Cannot delete the Company Owner' }, { status: 403 });
      }

      if (targetRole?.parent_admin_id !== targetGroupId) {
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
