import { NextResponse } from 'next/server';
import { requireAuth, getGroupUserIds } from '@/lib/auth/rbac';
import { query, withTransaction } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================================================
// app/api/dashboard/nodes/route.ts: Multi-Tenant Spatial Nodes API
// Protected by requireAuth & getGroupUserIds (OWASP API1:BOLA & A03:SQLi)
// Replaces client-side Supabase calls with Standalone PostgreSQL queries
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

    // Build parameterized query for spatial nodes
    let nodesSql = `
      SELECT 
        sn.id,
        sn.location_id,
        sn.longitude,
        sn.latitude,
        sn.image_url,
        sn.is_published,
        sn.capture_date,
        sn.created_by,
        sn.created_at,
        json_build_object(
          'id', l.id,
          'name', l.name,
          'description', l.description,
          'section_id', l.section_id,
          'company_sections', CASE WHEN cs.id IS NOT NULL THEN json_build_object('id', cs.id, 'name', cs.name) ELSE NULL END
        ) as locations,
        json_build_object(
          'email', ur.email,
          'role', ur.role,
          'parent_admin_id', ur.parent_admin_id,
          'parent', CASE WHEN pur.email IS NOT NULL THEN json_build_object('email', pur.email) ELSE NULL END
        ) as creator
      FROM spatial_nodes sn
      LEFT JOIN locations l ON sn.location_id = l.id
      LEFT JOIN company_sections cs ON l.section_id = cs.id
      LEFT JOIN user_roles ur ON sn.created_by = ur.user_id
      LEFT JOIN user_roles pur ON ur.parent_admin_id = pur.user_id
    `;

    const params: any[] = [];
    if (groupUserIds.length > 0) {
      nodesSql += ` WHERE sn.created_by = ANY($1)`;
      params.push(groupUserIds);
    }

    nodesSql += ` ORDER BY sn.created_at DESC`;

    const nodesRes = await query(nodesSql, params);

    // If superadmin, also fetch list of admin companies for filtering
    let adminGroups: any[] = [];
    if (session.role === 'superadmin') {
      const adminGroupsRes = await query(
        `SELECT user_id, company_name, email, company_logo, company_slug 
         FROM user_roles 
         WHERE role = 'admin' AND parent_admin_id IS NULL 
         ORDER BY company_name ASC`
      );
      adminGroups = adminGroupsRes.rows;
    }

    // Count total users
    let totalUsersCount = 0;
    if (session.role === 'superadmin') {
      const countRes = await query(`SELECT COUNT(*) as count FROM users`);
      totalUsersCount = parseInt(countRes.rows[0]?.count || '0', 10);
    } else {
      totalUsersCount = groupUserIds.length;
    }

    return NextResponse.json({
      success: true,
      nodes: nodesRes.rows,
      adminGroups,
      totalUsers: totalUsersCount,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal memuat data titik spasial.' }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { nodeId, locationName, description, sectionId, captureDate, isPublished, imageUrl } = body;

    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID wajib disertakan.' }, { status: 400 });
    }

    // Check ownership
    const nodeRes = await query<{ created_by: string; location_id: string }>(
      `SELECT created_by, location_id FROM spatial_nodes WHERE id = $1 LIMIT 1`,
      [nodeId]
    );

    if (nodeRes.rows.length === 0) {
      return NextResponse.json({ error: 'Titik node tidak ditemukan.' }, { status: 404 });
    }

    const node = nodeRes.rows[0];

    if (session.role !== 'superadmin') {
      const groupUserIds = await getGroupUserIds(session);
      if (!groupUserIds.includes(node.created_by)) {
        return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki izin mengedit titik ini.' }, { status: 403 });
      }
    }

    await withTransaction(async (client) => {
      // Update spatial_node
      await client.query(
        `UPDATE spatial_nodes 
         SET capture_date = $1, 
             is_published = $2, 
             image_url = COALESCE($3, image_url), 
             updated_at = NOW() 
         WHERE id = $4`,
        [captureDate || null, Boolean(isPublished), imageUrl || null, nodeId]
      );

      // Update location
      if (node.location_id) {
        await client.query(
          `UPDATE locations 
           SET name = COALESCE($1, name), 
               description = COALESCE($2, description), 
               section_id = $3, 
               updated_at = NOW() 
           WHERE id = $4`,
          [locationName || null, description !== undefined ? description : null, sectionId || null, node.location_id]
        );
      }
    });

    return NextResponse.json({ success: true, message: 'Titik node berhasil diperbarui.' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal memperbarui node.' }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { locationName, sectionId, longitude, latitude, imageUrl, captureDate, assignToGroupId } = body;

    if (!locationName || longitude === undefined || latitude === undefined || !imageUrl) {
      return NextResponse.json({ error: 'Parameter lokasi, koordinat, dan gambar wajib diisi.' }, { status: 400 });
    }

    const targetOwnerId =
      session.role === 'superadmin' && assignToGroupId && assignToGroupId !== 'all'
        ? assignToGroupId
        : session.parentAdminId || session.userId;

    // Resolve tenant group users for duplicate coordinate check
    let groupUserIds = [targetOwnerId];
    const grpRes = await query<{ user_id: string }>(
      `SELECT user_id FROM user_roles WHERE user_id = $1 OR parent_admin_id = $1`,
      [targetOwnerId]
    );
    if (grpRes.rows.length > 0) {
      groupUserIds = grpRes.rows.map((r) => r.user_id);
    }

    // Check duplicate coordinate within ~1m tolerance (0.00001 deg)
    const dupRes = await query(
      `SELECT id FROM spatial_nodes 
       WHERE created_by = ANY($1) 
         AND ABS(latitude - $2) <= 0.00001 
         AND ABS(longitude - $3) <= 0.00001 
       LIMIT 1`,
      [groupUserIds, latitude, longitude]
    );
    if (dupRes.rows.length > 0) {
      return NextResponse.json(
        { error: 'Upload ditolak: Titik panorama dengan koordinat GPS ini sudah ada dalam kelompok perusahaan Anda.' },
        { status: 409 }
      );
    }

    const sanitizedLocationName = String(locationName).trim().slice(0, 255);
    const companySuffix = targetOwnerId.slice(0, 8);
    const baseSlug = sanitizedLocationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'loc';
    const slug = `${baseSlug}-${companySuffix}`;

    const createdNode = await withTransaction(async (client) => {
      // Find or create location
      const locRes = await client.query<{ id: string }>(
        `SELECT id FROM locations WHERE slug = $1 AND created_by = $2 LIMIT 1`,
        [slug, targetOwnerId]
      );

      let locId = '';
      if (locRes.rows.length > 0) {
        locId = locRes.rows[0].id;
        if (sectionId) {
          await client.query(`UPDATE locations SET section_id = $1, updated_at = NOW() WHERE id = $2`, [
            sectionId,
            locId,
          ]);
        }
      } else {
        const newLoc = await client.query<{ id: string }>(
          `INSERT INTO locations (name, slug, section_id, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [sanitizedLocationName, slug, sectionId || null, targetOwnerId]
        );
        locId = newLoc.rows[0].id;
      }

      const newNode = await client.query<{ id: string }>(
        `INSERT INTO spatial_nodes (location_id, longitude, latitude, image_url, is_published, capture_date, created_by)
         VALUES ($1, $2, $3, $4, true, $5, $6)
         RETURNING id`,
        [locId, longitude, latitude, imageUrl, captureDate || null, targetOwnerId]
      );

      return { id: newNode.rows[0].id, locationId: locId };
    });

    return NextResponse.json({ success: true, node: createdNode });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal menyimpan titik panorama.' }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    let idsToDelete: string[] = [];

    if (queryId) {
      idsToDelete = [queryId];
    } else {
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        }
      } catch {
        // Body might be empty
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'ID node diperlukan.' }, { status: 400 });
    }

    let groupUserIds: string[] = [];
    if (session.role !== 'superadmin') {
      groupUserIds = await getGroupUserIds(session);
    }

    await withTransaction(async (client) => {
      const nodesRes = await client.query<{ id: string; created_by: string; location_id: string }>(
        `SELECT id, created_by, location_id FROM spatial_nodes WHERE id = ANY($1)`,
        [idsToDelete]
      );

      const validNodes =
        session.role === 'superadmin'
          ? nodesRes.rows
          : nodesRes.rows.filter((n) => groupUserIds.includes(n.created_by));

      if (validNodes.length === 0) {
        return;
      }

      const validIds = validNodes.map((n) => n.id);
      const locIds = Array.from(new Set(validNodes.map((n) => n.location_id).filter(Boolean)));

      // Delete nodes
      await client.query(`DELETE FROM spatial_nodes WHERE id = ANY($1)`, [validIds]);

      // Cascade delete locations if no other nodes reference them
      for (const locId of locIds) {
        const countRes = await client.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM spatial_nodes WHERE location_id = $1`,
          [locId]
        );
        if (parseInt(countRes.rows[0]?.count || '0', 10) === 0) {
          await client.query(`DELETE FROM locations WHERE id = $1`, [locId]);
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Node berhasil dihapus.' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Gagal menghapus node.' }, { status });
  }
}
