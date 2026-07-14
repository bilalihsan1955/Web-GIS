import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).single();
    if (!roleData) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Determine which admin's profile to fetch
    // Co-Admins and Users both fall back to the Owner's ID
    const adminIdToFetch = roleData.parent_admin_id || user.id;

    const { data: profileData } = await supabase
      .from('user_roles')
      .select('company_name, company_description, company_logo, company_slug')
      .eq('user_id', adminIdToFetch)
      .single();

    return NextResponse.json({ profile: profileData, admin_id: adminIdToFetch });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', user.id).single();
    if (!roleData) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Target the Owner's user_id if this is a Co-Admin or User
    const targetUserId = roleData.parent_admin_id || user.id;

    const body = await req.json();
    const { company_name, company_description, company_logo } = body;

    let company_slug = undefined;
    if (company_name) {
      company_slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      // Make sure it is not empty
      if (!company_slug) company_slug = `company-${Date.now()}`;
    }

    const adminSupabase = createAdminClient();
    
    let updateData: any = {
      company_name,
      company_description,
      company_logo,
    };
    
    if (company_slug) {
      updateData.company_slug = company_slug;
    }

    let { error } = await adminSupabase
      .from('user_roles')
      .update(updateData)
      .eq('user_id', targetUserId);

    // If there is a unique constraint violation (code 23505), append a random suffix
    if (error && error.code === '23505' && company_slug) {
      company_slug = `${company_slug}-${Math.floor(Math.random() * 10000)}`;
      updateData.company_slug = company_slug;
      
      const retryResponse = await adminSupabase
        .from('user_roles')
        .update(updateData)
        .eq('user_id', targetUserId);
        
      error = retryResponse.error;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, slug: company_slug });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
