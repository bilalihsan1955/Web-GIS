import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, assertAdminOrSuperAdmin } from '@/lib/auth/rbac';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/dashboard/company-profile/route.ts: Standalone Company Profile API
// Uses lib/db & Zero-Trust RBAC (OWASP API1 & A03:SQLi Parameterized)
// ============================================================================

const updateProfileSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  company_description: z.string().max(1000).optional().nullable(),
  company_logo: z.union([z.string().max(2048), z.literal(''), z.null()]).optional(),
  target_admin_id: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);

    const roleRes = await query<{ role: string; parent_admin_id: string | null }>(
      `SELECT role, parent_admin_id FROM user_roles WHERE user_id = $1 LIMIT 1`,
      [session.userId]
    );

    if (roleRes.rows.length === 0) {
      return NextResponse.json({ error: 'Peran pengguna tidak ditemukan.' }, { status: 404 });
    }

    const roleData = roleRes.rows[0];
    const adminIdToFetch = roleData.parent_admin_id || session.userId;

    const profileRes = await query<{
      company_name: string | null;
      company_description: string | null;
      company_logo: string | null;
      company_slug: string | null;
    }>(
      `SELECT company_name, company_description, company_logo, company_slug 
       FROM user_roles 
       WHERE user_id = $1 
       LIMIT 1`,
      [adminIdToFetch]
    );

    return NextResponse.json({
      profile: profileRes.rows[0] || null,
      admin_id: adminIdToFetch,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal memuat profil perusahaan.' }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth(req);
    assertAdminOrSuperAdmin(session);

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi data profil tidak valid.', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { company_name, company_description, company_logo, target_admin_id } = parsed.data;

    let targetUserId = session.parentAdminId || session.userId;
    if (session.role === 'superadmin' && target_admin_id) {
      targetUserId = target_admin_id;
    }

    let company_slug: string | undefined = undefined;
    if (company_name) {
      company_slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!company_slug) company_slug = `company-${Date.now()}`;
    }

    const logoValue = company_logo === '' ? null : company_logo;

    try {
      await query(
        `UPDATE user_roles 
         SET company_name = COALESCE($1, company_name),
             company_description = COALESCE($2, company_description),
             company_logo = COALESCE($3, company_logo),
             company_slug = COALESCE($4, company_slug),
             updated_at = NOW()
         WHERE user_id = $5`,
        [company_name || null, company_description || null, logoValue, company_slug || null, targetUserId]
      );
    } catch (dbErr: any) {
      // Code 23505: Unique violation for company_slug
      if (dbErr.code === '23505' && company_slug) {
        company_slug = `${company_slug}-${Math.floor(Math.random() * 10000)}`;
        await query(
          `UPDATE user_roles 
           SET company_name = COALESCE($1, company_name),
               company_description = COALESCE($2, company_description),
               company_logo = COALESCE($3, company_logo),
               company_slug = $4,
               updated_at = NOW()
           WHERE user_id = $5`,
          [company_name || null, company_description || null, logoValue, company_slug, targetUserId]
        );
      } else {
        throw dbErr;
      }
    }

    return NextResponse.json({ success: true, slug: company_slug });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal memperbarui profil perusahaan.' }, { status });
  }
}

export async function POST(req: Request) {
  return PUT(req);
}
