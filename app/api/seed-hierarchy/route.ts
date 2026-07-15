import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seeding endpoints are disabled in production' }, { status: 403 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const results: any[] = [];

    // Helper function to create an admin or user and upsert their role
    async function createOrVerifyAccount(email: string, password: string, role: 'admin' | 'user', parentAdminId: string | null = null) {
      // 1. Try to create the user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      let userId = '';

      if (createError) {
        if (createError.status === 422 || createError.message.includes('already registered')) {
          // User already exists, retrieve their ID
          const { data: searchUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = searchUsers?.users.find(u => u.email === email);
          if (!existingUser) {
            throw new Error(`Failed to retrieve existing user ID for ${email}`);
          }
          userId = existingUser.id;
        } else {
          throw createError;
        }
      } else {
        userId = userData.user!.id;
      }

      // 2. Upsert the role in user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: userId,
          role,
          parent_admin_id: parentAdminId,
          email,
        });

      if (roleError) throw roleError;

      results.push({ email, role, parentAdminId, userId, status: createError ? 'verified_and_updated' : 'newly_created' });
      return userId;
    }

    // ==========================================
    // 1. SEED GRUP ADMIN UB (5 Users)
    // ==========================================
    const adminUbId = await createOrVerifyAccount(
      'admin.ub@gis.local',
      'AdminUB123$',
      'admin'
    );

    for (let i = 1; i <= 5; i++) {
      await createOrVerifyAccount(
        `user${i}.ub@gis.local`,
        `UserUB123$`,
        'user',
        adminUbId
      );
    }

    // ==========================================
    // 2. SEED GRUP ADMIN UM (3 Users)
    // ==========================================
    const adminUmId = await createOrVerifyAccount(
      'admin.um@gis.local',
      'AdminUM123$',
      'admin'
    );

    for (let i = 1; i <= 3; i++) {
      await createOrVerifyAccount(
        `user${i}.um@gis.local`,
        `UserUM123$`,
        'user',
        adminUmId
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Seeding hierarchical users and roles completed successfully!',
      results
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred during hierarchical seeding.' 
    }, { status: 500 });
  }
}
