const fs = require('fs');
let content = fs.readFileSync('components/admin/EditNodeModal.tsx', 'utf8');

// Imports
content = content.replace(
  /import \{ useState \} from 'react';/,
  "import { useState, useEffect, useCallback } from 'react';\nimport { createClient } from '@/utils/supabase/client';"
);

// Interface
content = content.replace(
  /dynamicSections: string\[\];/,
  "adminId?: string;\n  editLocationSectionId: string;\n  setEditLocationSectionId: (val: string) => void;"
);

// Props
content = content.replace(
  /dynamicSections,/,
  "adminId,\n  editLocationSectionId,\n  setEditLocationSectionId,"
);

// Component Body
const componentTop = `  const { t } = useLanguage();
  const [isEditSectionDropdownOpen, setIsEditSectionDropdownOpen] = useState(false);
  const supabase = createClient();
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);

  const fetchSections = useCallback(async () => {
    let query = supabase.from('company_sections').select('id, name').order('created_at', { ascending: true });
    if (adminId) {
      query = query.eq('created_by', adminId);
    }
    const { data } = await query;
    if (data) setSections(data);
  }, [adminId, supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchSections();
    }
  }, [isOpen, fetchSections]);

  useEffect(() => {
    if (isEditSectionDropdownOpen) {
      fetchSections();
    }
  }, [isEditSectionDropdownOpen, fetchSections]);
`;

content = content.replace(
  /  const \{ t \} = useLanguage\(\);\n  const \[isEditSectionDropdownOpen, setIsEditSectionDropdownOpen\] = useState\(false\);/,
  componentTop
);

// Dropdown UI
const oldDropdown = `                  <div 
                    onClick={() => setIsEditSectionDropdownOpen(!isEditSectionDropdownOpen)}
                    className="w-full bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center shadow-none dark:shadow-inner hover:bg-white/80 dark:hover:bg-black/60 transition-colors backdrop-blur-sm"
                  >
                    <span>{editLocationDescription || 'Pilih Sektor...'}</span>
                    <ChevronDown className={\`w-4 h-4 transition-transform \${isEditSectionDropdownOpen ? 'rotate-180' : ''}\`} />
                  </div>
                  
                  {isEditSectionDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in max-h-48 overflow-y-auto">
                      {dynamicSections.map((sec) => (
                        <div 
                          key={sec}
                          className="px-4 py-3 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer transition-colors text-sm text-slate-700 dark:text-slate-200"
                          onClick={() => {
                            setEditLocationDescription(sec);
                            setIsEditSectionDropdownOpen(false);
                          }}
                        >
                          {sec}
                        </div>
                      ))}
                    </div>
                  )}`;

const newDropdown = `                  <div 
                    onClick={() => setIsEditSectionDropdownOpen(!isEditSectionDropdownOpen)}
                    className="w-full bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center shadow-none dark:shadow-inner hover:bg-white/80 dark:hover:bg-black/60 transition-colors backdrop-blur-sm"
                  >
                    <span>{sections.find(s => s.id === editLocationSectionId)?.name || 'Pilih Sektor...'}</span>
                    <ChevronDown className={\`w-4 h-4 transition-transform \${isEditSectionDropdownOpen ? 'rotate-180' : ''}\`} />
                  </div>
                  
                  {isEditSectionDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in max-h-48 overflow-y-auto">
                      <div 
                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5"
                        onClick={() => {
                          setEditLocationSectionId('');
                          setIsEditSectionDropdownOpen(false);
                        }}
                      >
                        -- Kosongkan Sektor --
                      </div>
                      {sections.map((sec) => (
                        <div 
                          key={sec.id}
                          className="px-4 py-3 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer transition-colors text-sm text-slate-700 dark:text-slate-200"
                          onClick={() => {
                            setEditLocationSectionId(sec.id);
                            setIsEditSectionDropdownOpen(false);
                          }}
                        >
                          {sec.name}
                        </div>
                      ))}
                    </div>
                  )}`;

content = content.replace(oldDropdown, newDropdown);

fs.writeFileSync('components/admin/EditNodeModal.tsx', content);
console.log('Updated EditNodeModal.tsx');
