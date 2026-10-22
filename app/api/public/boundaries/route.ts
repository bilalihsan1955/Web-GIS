import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/public/boundaries/route.ts: Public Spatial Boundaries (GeoJSON) Endpoint
// Delivers GeoJSON boundary polygons for public company maps & preview
// ============================================================================

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('adminId');

    let groupUserIds: string[] = [];

    if (adminId && adminId !== 'all') {
      // 1. Resolve Admin User ID from Slug or UUID
      const roleRes = await query<{ user_id: string }>(
        `SELECT user_id FROM user_roles WHERE company_slug = $1 OR user_id::text = $1 LIMIT 1`,
        [adminId]
      );

      if (roleRes.rows.length > 0) {
        const ownerId = roleRes.rows[0].user_id;
        const groupRes = await query<{ user_id: string }>(
          `SELECT user_id FROM user_roles WHERE user_id = $1 OR parent_admin_id = $1`,
          [ownerId]
        );
        groupUserIds = groupRes.rows.map((r) => r.user_id);
      }
    }

    let boundariesSql = `
      SELECT id, name, color, opacity, total_area_ha, feature_count, is_visible, created_by, created_at, geojson
      FROM company_boundaries
      WHERE is_visible = true
    `;

    const params: any[] = [];
    if (groupUserIds.length > 0) {
      boundariesSql += ` AND created_by = ANY($1)`;
      params.push(groupUserIds);
    }

    boundariesSql += ` ORDER BY created_at DESC`;

    const result = await query(boundariesSql, params);

    return NextResponse.json({
      success: true,
      boundaries: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat batas wilayah.' }, { status: 500 });
  }
}
