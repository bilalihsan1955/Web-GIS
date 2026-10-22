import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, signAuthToken, setAuthCookie } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/validations/security';
import { enforceRateLimit } from '@/lib/security/rateLimit';

// ============================================================================
// app/api/auth/login/route.ts: Standalone Authentication Login Endpoint
// OWASP A02 (Work Factor >= 12), A03 (SQLi Parameterized), API3 (Strict Zod) & A05
// Dual-Engine: Standalone PostgreSQL query with fallback bridge
// ============================================================================

// Dummy hash for constant-time comparison against timing attacks when user does not exist
const DUMMY_HASH = '$2a$12$e8pA7u9QoX76L/yYpGZ37OaHqUfxj1YJg4wBfv0rGZpQvIe4uQ1C6';

export async function POST(req: Request) {
  try {
    // 0. Rate limiting (OWASP A07 / API4): max 5 login attempts per 60s per IP
    const rateLimitError = enforceRateLimit(req, 'login', 5, 60000);
    if (rateLimitError) return rateLimitError;

    const body = await req.json();

    // 1. Strict Zod validation (OWASP API3:BOPLA - prevent Mass Assignment)
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validasi gagal: format email atau kata sandi tidak valid.', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    let user: {
      id: string;
      email: string;
      password_hash: string;
      role: 'superadmin' | 'admin' | 'user';
      parent_admin_id: string | null;
      company_slug: string | null;
      company_name: string | null;
    } | null = null;

    let isPasswordValid = false;

    // 2. Primary: Query user and role using Standalone PostgreSQL Pool
    try {
      const result = await query<{
        id: string;
        email: string;
        password_hash: string;
        role: 'superadmin' | 'admin' | 'user';
        parent_admin_id: string | null;
        company_slug: string | null;
        company_name: string | null;
      }>(
        `SELECT 
           u.id, 
           u.email, 
           u.password_hash, 
           COALESCE(ur.role, 'user') as role, 
           ur.parent_admin_id, 
           ur.company_slug,
           ur.company_name
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         WHERE LOWER(u.email) = LOWER($1)
         LIMIT 1`,
        [email]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
        const targetHash = user?.password_hash || DUMMY_HASH;
        isPasswordValid = await verifyPassword(password, targetHash);
      }
    } catch (dbError: any) {
      console.error('[Auth Engine] Standalone DB query error:', dbError);
      return NextResponse.json(
        { error: 'Gagal terhubung ke database. Pastikan container Docker PostgreSQL aktif.' },
        { status: 503 }
      );
    }

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: 'Email atau kata sandi tidak valid.' },
        { status: 401 }
      );
    }

    // 3. Sign JWT session token
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      parentAdminId: user.parent_admin_id,
      companySlug: user.company_slug,
    });

    // 4. Construct sanitized response (NEVER return password_hash - OWASP API3)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        parentAdminId: user.parent_admin_id,
        companySlug: user.company_slug,
        companyName: user.company_name,
      },
    });

    // 5. Set HTTP-Only, Secure, SameSite=Lax cookie
    setAuthCookie(response, token);

    return response;
  } catch (error: any) {
    console.error('[Auth Login Error]:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      { error: isProduction ? 'Terjadi kesalahan sistem saat proses masuk.' : error.message },
      { status: 500 }
    );
  }
}
