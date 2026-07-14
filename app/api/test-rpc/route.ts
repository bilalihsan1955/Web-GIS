import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: nodes, error } = await supabase.rpc('get_nodes_for_admin_group', {
    admin_identifier: 'admin-um'
  });

  return NextResponse.json({ 
    count: nodes?.length,
    error,
    nodes 
  });
}
