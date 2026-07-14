const fs = require('fs');

let content = fs.readFileSync('components/admin/SmartUploader.tsx', 'utf8');

// Replace the existing fetchSections logic
const targetEffect = `  useEffect(() => {
    setIsMounted(true);
    const fetchSections = async () => {
      let query = supabase.from('company_sections').select('id, name').order('created_at', { ascending: true });
      if (assignToGroupId) {
        query = query.eq('created_by', assignToGroupId);
      }
      const { data } = await query;
      if (data) setSections(data);
    };
    fetchSections();
  }, [assignToGroupId]);`;

const replacementEffect = `  const fetchSections = useCallback(async () => {
    let query = supabase.from('company_sections').select('id, name').order('created_at', { ascending: true });
    if (assignToGroupId) {
      query = query.eq('created_by', assignToGroupId);
    }
    const { data } = await query;
    if (data) setSections(data);
  }, [assignToGroupId, supabase]);

  useEffect(() => {
    setIsMounted(true);
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (isSectionDropdownOpen) {
      fetchSections();
    }
  }, [isSectionDropdownOpen, fetchSections]);`;

content = content.replace(targetEffect, replacementEffect);
fs.writeFileSync('components/admin/SmartUploader.tsx', content);
console.log('Updated SmartUploader.tsx');
