import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/public/nodes/route.ts: Public Spatial Nodes Endpoint for Mapbox & 360 Viewer
// Queries Standalone PostgreSQL directly (Decoupled from Supabase RPC)
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

    let nodesSql = `
      SELECT 
        sn.id,
        sn.image_url,
        sn.longitude,
        sn.latitude,
        sn.capture_date,
        l.name as location_name,
        l.description as location_description,
        json_build_object(
          'name', l.name,
          'description', l.description
        ) as locations
      FROM spatial_nodes sn
      LEFT JOIN locations l ON sn.location_id = l.id
      WHERE sn.is_published = true
    `;

    const params: any[] = [];
    if (groupUserIds.length > 0) {
      nodesSql += ` AND sn.created_by = ANY($1)`;
      params.push(groupUserIds);
    }

    nodesSql += ` ORDER BY sn.created_at DESC`;

    const result = await query(nodesSql, params);

    return NextResponse.json({
      success: true,
      nodes: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat titik peta.' }, { status: 500 });
  }
}
