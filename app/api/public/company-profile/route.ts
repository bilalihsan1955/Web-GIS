import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let profileData: any = null;

    if (uuidRegex.test(slug)) {
      const res = await query(
        `SELECT user_id, company_name, company_description, company_logo, company_slug 
         FROM user_roles 
         WHERE user_id = $1 
         LIMIT 1`,
        [slug]
      );
      if (res.rows.length > 0) {
        const data = res.rows[0];
        if (data.company_slug) {
          return NextResponse.json(
            { error: 'This dashboard must be accessed via its custom URL slug.' },
            { status: 403 }
          );
        }
        profileData = data;
      }
    } else {
      const res = await query(
        `SELECT user_id, company_name, company_description, company_logo, company_slug 
         FROM user_roles 
         WHERE company_slug = $1 
         LIMIT 1`,
        [slug]
      );
      if (res.rows.length > 0) {
        profileData = res.rows[0];
      }
    }

    if (!profileData || !profileData.company_name) {
      return NextResponse.json({ error: 'Company profile not found or incomplete' }, { status: 404 });
    }

    return NextResponse.json({ profile: profileData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
