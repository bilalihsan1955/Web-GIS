import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('get_nodes_for_admin_group', {
    admin_identifier: '68cdb7da-3590-4040-ae38-af9fb01a589c' // using the UM UUID or slug
  });
  console.log("RPC Data for UUID:", data?.length);
  
  const { data: d2 } = await supabase.rpc('get_nodes_for_admin_group', {
    admin_identifier: 'admin-um'
  });
  console.log("RPC Data for Slug:", d2?.length);
}
run();
