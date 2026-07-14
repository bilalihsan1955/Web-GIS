import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: nodes, error } = await supabase.rpc('get_nodes_for_admin_group', {
    admin_identifier: 'admin-um'
  });
  console.log("RPC Data count:", nodes?.length);
  if (nodes) console.log(JSON.stringify(nodes, null, 2));
}
run();
