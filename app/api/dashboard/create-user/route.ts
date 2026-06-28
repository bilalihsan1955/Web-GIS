import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 1. Authenticate the requester
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify requester has 'admin' role
    const { data: userRoleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRoleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Requires admin privileges' }, { status: 403 })
    }

    // 3. Parse request body
    const { email, password, role } = await request.json()
    
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 4. Create user using Admin Client (Service Role Key)
    const adminSupabase = createAdminClient()
    
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for admin-created accounts
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 5. Insert new user's role into user_roles table
    const { error: insertRoleError } = await adminSupabase
      .from('user_roles')
      .insert([
        { user_id: newUser.user.id, role: role }
      ])

    if (insertRoleError) {
      // Rollback user creation if role insertion fails to maintain data consistency
      await adminSupabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Failed to assign role: ' + insertRoleError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: newUser.user.id, email: newUser.user.email, role } 
    }, { status: 201 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
