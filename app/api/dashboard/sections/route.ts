import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, parent_admin_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Only admins can create sections' }, { status: 403 });
    }

    const body = await req.json();
    const { name, created_by } = body;

    if (!name) {
      return NextResponse.json({ error: 'Section name is required' }, { status: 400 });
    }

    const targetCreatedBy = roleData.role === 'superadmin' && created_by 
      ? created_by 
      : (roleData.parent_admin_id || user.id);

    // Insert section
    const { data, error } = await supabase
      .from('company_sections')
      .insert({
        name,
        created_by: targetCreatedBy
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Section ID is required' }, { status: 400 });
    }

    // Check permissions
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'superadmin')) {
        return NextResponse.json({ error: 'Only admins can delete sections' }, { status: 403 });
    }

    // Delete section
    const { error } = await supabase
      .from('company_sections')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
