const fs = require('fs');

let content = fs.readFileSync('hooks/useNodeMutations.ts', 'utf8');

content = content.replace(
  /const \[editLocationDescription, setEditLocationDescription\] = useState\(''\);/,
  "const [editLocationDescription, setEditLocationDescription] = useState('');\n  const [editLocationSectionId, setEditLocationSectionId] = useState('');"
);

content = content.replace(
  /setEditLocationDescription\(node\.locations\?\.description \|\| ''\);/,
  "setEditLocationDescription(node.locations?.description || '');\n    setEditLocationSectionId(node.locations?.section_id || '');"
);

content = content.replace(
  /await supabase\.from\('locations'\)\.update\(\{ description: editLocationDescription \}\)\.eq\('id', locId\);/,
  "await supabase.from('locations').update({ description: editLocationDescription, section_id: editLocationSectionId || null }).eq('id', locId);"
);

content = content.replace(
  /insert\(\{ name: editLocationName, slug, description: editLocationDescription \}\)/,
  "insert({ name: editLocationName, slug, description: editLocationDescription, section_id: editLocationSectionId || null })"
);

fs.writeFileSync('hooks/useNodeMutations.ts', content);
console.log('Updated useNodeMutations.ts');
