import { NextResponse } from 'next/server';
import { requireAuth, getGroupUserIds } from '@/lib/auth/rbac';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/dashboard/boundaries/route.ts: Standalone Multi-Tenant Boundaries API
// Uses lib/db Parameterized SQL & Zero-Trust RBAC (OWASP API1:BOLA & A03:SQLi)
// ============================================================================

export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const includeGeojson = searchParams.get('include_geojson') === 'true';

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

    const selectFields = includeGeojson
      ? 'id, name, color, opacity, total_area_ha, feature_count, is_visible, created_by, created_at, geojson'
      : 'id, name, color, opacity, total_area_ha, feature_count, is_visible, created_by, created_at';

    let sql = `SELECT ${selectFields} FROM company_boundaries`;
    const params: any[] = [];

    if (groupUserIds.length > 0) {
      sql += ` WHERE created_by = ANY($1)`;
      params.push(groupUserIds);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ boundaries: result.rows });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal memuat batas wilayah.' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const { boundaries, assignToGroupId } = body;

    if (!boundaries || !Array.isArray(boundaries) || boundaries.length === 0) {
      return NextResponse.json({ error: 'Data batas wilayah tidak boleh kosong.' }, { status: 400 });
    }

    let createdByUserId = session.userId;
    if (session.role === 'superadmin' && assignToGroupId && assignToGroupId !== 'all') {
      createdByUserId = assignToGroupId;
    } else if (session.role !== 'superadmin') {
      const allowedIds = await getGroupUserIds(session);
      if (assignToGroupId && !allowedIds.includes(assignToGroupId)) {
        return NextResponse.json({ error: 'Akses ditolak: Tidak dapat membuat batas untuk perusahaan lain.' }, { status: 403 });
      }
    }

    const inserted: any[] = [];
    for (const b of boundaries) {
      const res = await query(
        `INSERT INTO company_boundaries (name, geojson, color, opacity, total_area_ha, feature_count, is_visible, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING *`,
        [
          b.name || 'Boundary Layer',
          JSON.stringify(b.geojson),
          b.color || '#06b6d4',
          typeof b.opacity === 'number' ? b.opacity : 0.35,
          typeof b.totalAreaHa === 'number' ? b.totalAreaHa : 0,
          typeof b.featureCount === 'number' ? b.featureCount : 1,
          createdByUserId,
        ]
      );
      if (res.rows[0]) inserted.push(res.rows[0]);
    }

    return NextResponse.json({ success: true, boundaries: inserted });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal menyimpan batas wilayah.' }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const { id, is_visible, color, opacity, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID batas wilayah wajib diisi.' }, { status: 400 });
    }

    let groupUserIds: string[] = [];
    if (session.role !== 'superadmin') {
      groupUserIds = await getGroupUserIds(session);
    }

    let updateSql = `
      UPDATE company_boundaries 
      SET is_visible = COALESCE($1, is_visible),
          color = COALESCE($2, color),
          opacity = COALESCE($3, opacity),
          name = COALESCE($4, name),
          updated_at = NOW()
      WHERE id = $5
    `;
    const params: any[] = [
      typeof is_visible === 'boolean' ? is_visible : null,
      color || null,
      typeof opacity === 'number' ? opacity : null,
      name || null,
      id,
    ];

    if (groupUserIds.length > 0) {
      updateSql += ` AND created_by = ANY($6)`;
      params.push(groupUserIds);
    }

    updateSql += ` RETURNING *`;

    const result = await query(updateSql, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Batas wilayah tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, boundary: result.rows[0] });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal memperbarui batas wilayah.' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID batas wilayah wajib diisi.' }, { status: 400 });
    }

    let groupUserIds: string[] = [];
    if (session.role !== 'superadmin') {
      groupUserIds = await getGroupUserIds(session);
    }

    let deleteSql = `DELETE FROM company_boundaries WHERE id = $1`;
    const params: any[] = [id];

    if (groupUserIds.length > 0) {
      deleteSql += ` AND created_by = ANY($2)`;
      params.push(groupUserIds);
    }

    deleteSql += ` RETURNING id`;

    const result = await query(deleteSql, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Batas wilayah tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Gagal menghapus batas wilayah.' }, { status });
  }
}
