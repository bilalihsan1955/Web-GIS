import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/jwt';
import { query } from '@/lib/db';

// ============================================================================
// app/api/auth/me/route.ts: Current Authenticated User Session Endpoint
// Returns current session profile with tenant metadata
// ============================================================================

export async function GET(req: Request) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const res = await query(
      `SELECT u.id, u.email, ur.role, ur.parent_admin_id, ur.company_name, ur.company_slug, ur.company_logo
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1
       LIMIT 1`,
      [session.userId]
    );

    const user = res.rows[0];
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || session.role,
        parentAdminId: user.parent_admin_id,
        companyName: user.company_name,
        companySlug: user.company_slug,
        companyLogo: user.company_logo,
      },
    });
  } catch (error: any) {
    console.error('[Auth Me Error]:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
