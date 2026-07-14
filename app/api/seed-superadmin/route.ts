import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    // 1. Setup Admin Client
    const supabaseAdmin = createAdminClient();

    // 2. Create User via Auth Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'superadmin@gis.local',
      password: 'SuperAdmin123$',
      email_confirm: true,
    });

    // 4. Error Handling: Gracefully catch if user already exists
    if (createError) {
      if (createError.status === 422 || createError.message.includes('already registered')) {
        // If the user already exists, let's try to update or ensure role is superadmin
        const { data: searchUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = searchUsers?.users.find(u => u.email === 'superadmin@gis.local');
        
        if (existingUser) {
          // Update the role to superadmin in user_roles table
          const { error: updateRoleError } = await supabaseAdmin
            .from('user_roles')
            .upsert({ user_id: existingUser.id, role: 'superadmin' });
            
          if (updateRoleError) throw updateRoleError;
          
          return NextResponse.json({
            success: true,
            message: 'Superadmin user already existed, but its role has been successfully updated/verified as superadmin!',
            user: {
              id: existingUser.id,
              email: existingUser.email,
              role: 'superadmin'
            }
          });
        }
        
        return NextResponse.json({
          success: false,
          message: 'Superadmin user already exists, and we failed to lookup/verify their role.',
        }, { status: 409 });
      }
      
      return NextResponse.json({
        success: false, 
        error: createError.message 
      }, { status: 400 });
    }

    if (!userData.user) {
      return NextResponse.json({ success: false, error: 'User creation failed (no user returned)' }, { status: 500 });
    }

    const userId = userData.user.id;

    // 3. Assign Role ('superadmin') in the user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert([
        { user_id: userId, role: 'superadmin' }
      ]);

    if (roleError) {
      // Rollback user creation if role assignment fails to keep DB clean
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to assign superadmin role: ${roleError.message}. User creation was rolled back.` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Superadmin user and role successfully created!',
      user: {
        id: userId,
        email: userData.user.email,
        role: 'superadmin'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred during superadmin user seeding.' 
    }, { status: 500 });
  }
}
