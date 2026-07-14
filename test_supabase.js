const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('spatial_nodes')
    .select(`
      id, created_by,
      creator:user_roles!fk_spatial_nodes_created_by_user_roles (
        role,
        parent_admin_id
      )
    `)
    .limit(5);
    
  console.log(JSON.stringify(data, null, 2));
}

run();
