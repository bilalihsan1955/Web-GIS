import { NextResponse } from 'next/server';
import { requireAuth, assertAdminOrSuperAdmin } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/jwt';
import { withTransaction, query } from '@/lib/db';
import { enforceRateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/dashboard/create-user/route.ts: Standalone User Creation API
// Zero-Trust RBAC & Bcrypt Cost 12 (OWASP A02:2021 & A03:SQLi Parameterized)
// ============================================================================

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, 'create-user', 10, 60000);
    if (rateLimitError) return rateLimitError;

    const session = await requireAuth(request);
    assertAdminOrSuperAdmin(session);

    const body = await request.json();
    const { email, password, role: requestedRole, parentAdminId: requestedParentAdminId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if email already exists
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [cleanEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Alamat email ini sudah terdaftar di sistem.' }, { status: 409 });
    }

    let role = 'user';
    let parentAdminId: string | null = null;

    if (session.role === 'superadmin') {
      role = requestedRole || 'user';
      parentAdminId = requestedParentAdminId || null;
    } else if (session.role === 'admin') {
      role = requestedRole === 'admin' ? 'admin' : 'user';
      parentAdminId = session.parentAdminId || session.userId;
    }

    const passwordHash = await hashPassword(password);

    const createdUser = await withTransaction(async (client) => {
      const userRes = await client.query<{ id: string; email: string }>(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email`,
        [cleanEmail, passwordHash]
      );

      const newUserId = userRes.rows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, email, role, parent_admin_id)
         VALUES ($1, $2, $3, $4)`,
        [newUserId, cleanEmail, role, parentAdminId]
      );

      return { id: newUserId, email: cleanEmail, role };
    });

    return NextResponse.json({ success: true, user: createdUser }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal membuat pengguna baru.' }, { status });
  }
}
