import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  const { data, error } = await supabase
    .from('spatial_nodes')
    .select(`
      id,
      created_by,
      creator:user_roles!fk_spatial_nodes_created_by_user_roles (
        role,
        parent_admin_id
      )
    `)
    .limit(5);

  return NextResponse.json({ data, error });
}
