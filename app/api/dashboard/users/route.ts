import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, assertAdminOrSuperAdmin } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/jwt';
import { query, withTransaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/dashboard/users/route.ts: Standalone Users Management API
// Zero-Trust RBAC & Cascading Isolation (OWASP API1:BOLA & A03:SQLi Parameterized)
// ============================================================================

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
});

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  confirmEmail: z.string().email().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    assertAdminOrSuperAdmin(session);

    let sql = `
      SELECT 
        u.id,
        u.email,
        u.created_at,
        COALESCE(ur.role, 'user') as role,
        ur.parent_admin_id,
        pur.email as parent_admin_email
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN user_roles pur ON ur.parent_admin_id = pur.user_id
    `;

    const params: any[] = [];

    if (session.role === 'admin') {
      const ownerId = session.parentAdminId || session.userId;
      sql += ` WHERE ur.parent_admin_id = $1 OR ur.user_id = $1`;
      params.push(ownerId);
    }

    sql += ` ORDER BY u.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ users: result.rows });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal memuat daftar pengguna.' }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth(req);
    assertAdminOrSuperAdmin(session);

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid.', details: parsed.error.format() }, { status: 400 });
    }

    const { userId, role, email, password } = parsed.data;

    // Check target user role
    const targetRes = await query<{ role: string; parent_admin_id: string | null; email: string }>(
      `SELECT role, parent_admin_id, email FROM user_roles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (targetRes.rows.length === 0) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const targetUser = targetRes.rows[0];

    if (session.role === 'admin') {
      const ownerId = session.parentAdminId || session.userId;
      if (targetUser.parent_admin_id !== ownerId && userId !== ownerId) {
        return NextResponse.json({ error: 'Akses ditolak: Hanya dapat mengedit pengguna dalam kelompok Anda.' }, { status: 403 });
      }
      if (role === 'superadmin') {
        return NextResponse.json({ error: 'Akses ditolak: Tidak dapat menaikkan peran menjadi Superadmin.' }, { status: 403 });
      }
    }

    await withTransaction(async (client) => {
      if (password) {
        const passwordHash = await hashPassword(password);
        await client.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
          passwordHash,
          userId,
        ]);
      }

      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        await client.query(`UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2`, [cleanEmail, userId]);
        await client.query(`UPDATE user_roles SET email = $1, updated_at = NOW() WHERE user_id = $2`, [
          cleanEmail,
          userId,
        ]);
      }

      if (role) {
        await client.query(`UPDATE user_roles SET role = $1, updated_at = NOW() WHERE user_id = $2`, [role, userId]);
      }
    });

    return NextResponse.json({ success: true, message: 'Data pengguna berhasil diperbarui.' });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal memperbarui data pengguna.' }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth(req);
    assertAdminOrSuperAdmin(session);

    const body = await req.json();
    const parsed = deleteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parameter tidak valid.', details: parsed.error.format() }, { status: 400 });
    }

    const { userId, confirmEmail } = parsed.data;

    const targetRes = await query<{ role: string; parent_admin_id: string | null; email: string }>(
      `SELECT role, parent_admin_id, email FROM user_roles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (targetRes.rows.length === 0) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const targetUser = targetRes.rows[0];
    const isCompanyOwner = targetUser.role === 'admin' && !targetUser.parent_admin_id;

    if (isCompanyOwner) {
      const isSelf = session.userId === userId;
      if (session.role !== 'superadmin' && !isSelf) {
        return NextResponse.json(
          { error: 'Akses ditolak: Hanya Superadmin atau Pemilik Perusahaan yang dapat menghapus akun ini.' },
          { status: 403 }
        );
      }

      if (!confirmEmail || confirmEmail.toLowerCase() !== targetUser.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Konfirmasi email tidak sesuai. Ketikkan email yang tepat untuk konfirmasi.' },
          { status: 400 }
        );
      }
    } else {
      // Regular user delete
      if (session.userId === userId) {
        return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri di sini.' }, { status: 403 });
      }

      if (session.role === 'admin') {
        const ownerId = session.parentAdminId || session.userId;
        if (targetUser.parent_admin_id !== ownerId) {
          return NextResponse.json({ error: 'Akses ditolak: Hanya dapat menghapus pengguna dalam kelompok Anda.' }, { status: 403 });
        }
      }
    }

    // Cascade delete user in Standalone PostgreSQL
    await withTransaction(async (client) => {
      // If company owner, also delete any sub-users whose parent is this owner
      if (isCompanyOwner) {
        await client.query(`DELETE FROM users WHERE id IN (SELECT user_id FROM user_roles WHERE parent_admin_id = $1)`, [
          userId,
        ]);
      }
      // Delete user (foreign keys with ON DELETE CASCADE will clean up user_roles, nodes, boundaries, sections, locations)
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    });

    return NextResponse.json({ success: true, message: 'Pengguna berhasil dihapus.' });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal menghapus pengguna.' }, { status });
  }
}
