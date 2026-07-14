import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // The slug could be a UUID or a company_slug
    let profileData = null;

    // Try as UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(slug)) {
      const { data } = await adminSupabase
        .from('user_roles')
        .select('company_name, company_description, company_logo, company_slug')
        .eq('user_id', slug)
        .single();
      
      if (data) {
        if (data.company_slug) {
          // Rule: If company_slug exists, access via UUID is forbidden
          return NextResponse.json({ error: 'This dashboard must be accessed via its custom URL slug.' }, { status: 403 });
        }
        profileData = data;
      }
    } else {
      // Try as company_slug
      const { data } = await adminSupabase
        .from('user_roles')
        .select('company_name, company_description, company_logo, company_slug')
        .eq('company_slug', slug)
        .single();
      profileData = data;
    }

    if (!profileData || !profileData.company_name) {
      return NextResponse.json({ error: 'Company profile not found or incomplete' }, { status: 404 });
    }

    return NextResponse.json({ profile: profileData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
