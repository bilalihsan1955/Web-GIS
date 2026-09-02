import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

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

    // Check user role
    const { data: roleData } = await adminSupabase
      .from('user_roles')
      .select('role, parent_admin_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const userRole = roleData?.role || 'user';
    const userGroupId = roleData?.parent_admin_id || user.id;

    let targetAdminId = userGroupId;
    if (userRole === 'superadmin' && companyId && companyId !== 'all') {
      targetAdminId = companyId;
    }

    // Get all user_ids in this company group
    const { data: groupUsers } = await adminSupabase
      .from('user_roles')
      .select('user_id')
      .or(`user_id.eq.${targetAdminId},parent_admin_id.eq.${targetAdminId}`);

    const groupUserIds = (groupUsers || []).map(u => u.user_id);
    if (groupUserIds.length === 0) groupUserIds.push(targetAdminId);

    let query = adminSupabase
      .from('company_boundaries')
      .select('*')
      .order('created_at', { ascending: false });

    if (userRole !== 'superadmin' || (companyId && companyId !== 'all')) {
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

    // Determine target created_by user ID
    let createdByUserId = user.id;
    if (assignToGroupId && assignToGroupId !== 'all') {
      createdByUserId = assignToGroupId;
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

    const updatePayload: any = {};
    if (typeof is_visible === 'boolean') updatePayload.is_visible = is_visible;
    if (color) updatePayload.color = color;
    if (typeof opacity === 'number') updatePayload.opacity = opacity;
    if (name) updatePayload.name = name;

    const { data: updated, error } = await adminSupabase
      .from('company_boundaries')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { error } = await adminSupabase
      .from('company_boundaries')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
