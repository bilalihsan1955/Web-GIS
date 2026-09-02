import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

// Helper to get authenticated user's role and allowed company group user IDs
async function getUserGroupContext(supabase: any, adminSupabase: any, userId: string) {
  const { data: roleData } = await adminSupabase
    .from('user_roles')
    .select('role, parent_admin_id')
    .eq('user_id', userId)
    .maybeSingle();

  const userRole = roleData?.role || 'user';
  const userGroupId = roleData?.parent_admin_id || userId;

  const { data: groupUsers } = await adminSupabase
    .from('user_roles')
    .select('user_id')
    .or(`user_id.eq.${userGroupId},parent_admin_id.eq.${userGroupId}`);

  const groupUserIds = (groupUsers || []).map((u: any) => u.user_id);
  if (groupUserIds.length === 0) groupUserIds.push(userGroupId);

  return { userRole, userGroupId, groupUserIds };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const adminSupabase = createAdminClient();

    const { userRole, userGroupId, groupUserIds } = await getUserGroupContext(supabase, adminSupabase, user.id);

    let targetAdminId = userGroupId;
    if (userRole === 'superadmin' && companyId && companyId !== 'all') {
      targetAdminId = companyId;
    }

    let query = adminSupabase
      .from('company_boundaries')
      .select('*')
      .order('created_at', { ascending: false });

    if (userRole === 'superadmin' && companyId && companyId !== 'all') {
      const { data: targetGroupUsers } = await adminSupabase
        .from('user_roles')
        .select('user_id')
        .or(`user_id.eq.${targetAdminId},parent_admin_id.eq.${targetAdminId}`);
      const targetGroupUserIds = (targetGroupUsers || []).map((u: any) => u.user_id);
      if (targetGroupUserIds.length === 0) targetGroupUserIds.push(targetAdminId);
      query = query.in('created_by', targetGroupUserIds);
    } else if (userRole !== 'superadmin') {
      query = query.in('created_by', groupUserIds);
    }

    const { data: boundaries, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ boundaries: boundaries || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boundaries, assignToGroupId } = body;

    if (!boundaries || !Array.isArray(boundaries) || boundaries.length === 0) {
      return NextResponse.json({ error: 'No boundaries provided' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { userRole, groupUserIds } = await getUserGroupContext(supabase, adminSupabase, user.id);

    // Enforce multi-tenant security on POST
    let createdByUserId = user.id;
    if (userRole === 'superadmin' && assignToGroupId && assignToGroupId !== 'all') {
      createdByUserId = assignToGroupId;
    } else if (userRole !== 'superadmin') {
      // Non-superadmins can ONLY assign boundaries to their own company group
      if (assignToGroupId && !groupUserIds.includes(assignToGroupId)) {
        return NextResponse.json({ error: 'Forbidden: Cannot create boundary for another company' }, { status: 403 });
      }
    }

    const recordsToInsert = boundaries.map((b: any) => ({
      name: b.name || 'Boundary Layer',
      geojson: b.geojson,
      color: b.color || '#06b6d4',
      opacity: b.opacity ?? 0.35,
      total_area_ha: b.totalAreaHa || 0,
      feature_count: b.featureCount || 1,
      is_visible: true,
      created_by: createdByUserId,
    }));

    const { data: inserted, error } = await adminSupabase
      .from('company_boundaries')
      .insert(recordsToInsert)
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, boundaries: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, is_visible, color, opacity, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Boundary ID is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { userRole, groupUserIds } = await getUserGroupContext(supabase, adminSupabase, user.id);

    const updatePayload: any = {};
    if (typeof is_visible === 'boolean') updatePayload.is_visible = is_visible;
    if (color) updatePayload.color = color;
    if (typeof opacity === 'number') updatePayload.opacity = opacity;
    if (name) updatePayload.name = name;

    let updateQuery = adminSupabase
      .from('company_boundaries')
      .update(updatePayload)
      .eq('id', id);

    // Enforce multi-tenant security on PUT
    if (userRole !== 'superadmin') {
      updateQuery = updateQuery.in('created_by', groupUserIds);
    }

    const { data: updated, error } = await updateQuery.select('*').maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: 'Boundary layer not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, boundary: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Boundary ID is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { userRole, groupUserIds } = await getUserGroupContext(supabase, adminSupabase, user.id);

    let deleteQuery = adminSupabase
      .from('company_boundaries')
      .delete()
      .eq('id', id);

    // Enforce multi-tenant security on DELETE
    if (userRole !== 'superadmin') {
      deleteQuery = deleteQuery.in('created_by', groupUserIds);
    }

    const { error } = await deleteQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
