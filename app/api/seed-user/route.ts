import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seeding endpoints are disabled in production' }, { status: 403 });
  }

  try {
    // 1. Setup Admin Client
    const supabaseAdmin = createAdminClient();

    // 2. Create User via Auth Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@gis.local',
      password: 'AdminPassword123!',
      email_confirm: true,
    });

    // 4. Error Handling: Gracefully catch if user already exists
    if (createError) {
      if (createError.status === 422 || createError.message.includes('already registered')) {
        return NextResponse.json({
          success: false,
          message: 'Admin user already exists. If you need to re-create it, please delete it from the Supabase dashboard first.',
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

    // 3. Assign Role ('admin') in the user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { user_id: userId, role: 'admin' }
      ]);

    if (roleError) {
      // Rollback user creation if role assignment fails to keep DB clean
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to assign admin role: ${roleError.message}. User creation was rolled back.` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user and role successfully created!',
      user: {
        id: userId,
        email: userData.user.email,
        role: 'admin'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred during admin user seeding.' 
    }, { status: 500 });
  }
}
