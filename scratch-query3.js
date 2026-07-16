require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('spatial_nodes')
    .select(`
      id,
      created_at,
      locations(name, description, section_id, company_sections(name))
    `)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log(JSON.stringify({ data, error }, null, 2));
}

test();
