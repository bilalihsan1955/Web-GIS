import { NextResponse } from 'next/server';
import { requireAuth, getGroupUserIds } from '@/lib/auth/rbac';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/dashboard/sections/route.ts: Standalone PostgreSQL Sections API
// Fully decoupled from Supabase client / server
// ============================================================================

export async function GET(req: Request) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    let groupUserIds: string[] = [];

    if (session.role === 'superadmin') {
      if (companyId && companyId !== 'all') {
        const usersRes = await query<{ user_id: string }>(
          `SELECT user_id FROM user_roles WHERE user_id = $1 OR parent_admin_id = $1`,
          [companyId]
        );
        groupUserIds = usersRes.rows.map((r) => r.user_id);
      }
    } else {
      groupUserIds = await getGroupUserIds(session);
    }

    let sql = `SELECT id, name, created_by, created_at FROM company_sections`;
    const params: any[] = [];

    if (groupUserIds.length > 0) {
      sql += ` WHERE created_by = ANY($1)`;
      params.push(groupUserIds);
    }

    sql += ` ORDER BY created_at ASC`;

    const res = await query(sql, params);
    return NextResponse.json({ success: true, sections: res.rows });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal memuat seksi wilayah.' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);

    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya administrator yang dapat membuat seksi.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, created_by } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama seksi wilayah wajib diisi.' }, { status: 400 });
    }

    const targetCreatedBy =
      session.role === 'superadmin' && created_by
        ? created_by
        : (session.parentAdminId || session.userId);

    const res = await query(
      `INSERT INTO company_sections (name, created_by, created_at, updated_at) 
       VALUES ($1, $2, NOW(), NOW()) 
       RETURNING id, name, created_by, created_at`,
      [name.trim(), targetCreatedBy]
    );

    return NextResponse.json({ success: true, section: res.rows[0] });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal menambahkan seksi wilayah.' }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireAuth(req);

    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya administrator yang dapat memperbarui seksi.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'ID dan nama seksi diperlukan.' }, { status: 400 });
    }

    let groupUserIds: string[] = [];
    if (session.role !== 'superadmin') {
      groupUserIds = await getGroupUserIds(session);
    }

    let updateSql = `UPDATE company_sections SET name = $1, updated_at = NOW() WHERE id = $2`;
    const params: any[] = [name.trim(), id];

    if (session.role !== 'superadmin') {
      updateSql += ` AND created_by = ANY($3)`;
      params.push(groupUserIds);
    }

    await query(updateSql, params);
    return NextResponse.json({ success: true, message: 'Seksi berhasil diperbarui.' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal memperbarui seksi.' }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth(req);

    if (session.role !== 'admin' && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya administrator yang dapat menghapus seksi.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID seksi diperlukan.' }, { status: 400 });
    }

    let groupUserIds: string[] = [];
    if (session.role !== 'superadmin') {
      groupUserIds = await getGroupUserIds(session);
    }

    let deleteSql = `DELETE FROM company_sections WHERE id = $1`;
    const params: any[] = [id];

    if (session.role !== 'superadmin') {
      deleteSql += ` AND created_by = ANY($2)`;
      params.push(groupUserIds);
    }

    await query(deleteSql, params);
    return NextResponse.json({ success: true, message: 'Seksi berhasil dihapus.' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal menghapus seksi.' }, { status });
  }
}
