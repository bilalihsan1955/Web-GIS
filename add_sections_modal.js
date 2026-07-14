const fs = require('fs');

let content = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

if (!content.includes('ManageSectionsModal')) {
  // Add imports
  content = content.replace(
    /import \{ ChevronLeft, Building2 \} from 'lucide-react';/,
    "import { ChevronLeft, Building2, Settings } from 'lucide-react';"
  );
  content = content.replace(
    /import CompanyGrid from '@\/components\/admin\/CompanyGrid';/,
    "import CompanyGrid from '@/components/admin/CompanyGrid';\nimport ManageSectionsModal from '@/components/admin/ManageSectionsModal';\nimport { useState } from 'react';"
  );

  // Add state
  content = content.replace(
    /export default function DashboardPage\(\) \{/,
    "export default function DashboardPage() {\n  const [isManageSectionsModalOpen, setIsManageSectionsModalOpen] = useState(false);"
  );

  // Add button
  content = content.replace(
    /<h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 drop-shadow-sm dark:drop-shadow-md px-2">\{t\('uploadPipeline'\)\}<\/h2>/,
    `<div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">{t('uploadPipeline')}</h2>
            <button 
              onClick={() => setIsManageSectionsModalOpen(true)}
              className="flex items-center text-sm font-medium text-cyan-600 hover:text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 dark:text-cyan-400 dark:border dark:border-cyan-800 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Kelola Sektor
            </button>
          </div>`
  );

  // Render Modal
  content = content.replace(
    /\{isMounted && document\.body && createPortal\(/,
    `{isMounted && document.body && createPortal(
        <ManageSectionsModal
          isOpen={isManageSectionsModalOpen}
          onClose={() => setIsManageSectionsModalOpen(false)}
          adminId={userRole === 'superadmin' ? selectedCompanyId : currentUserGroupId}
        />,
        document.body
      )}
      {isMounted && document.body && createPortal(`
  );

  fs.writeFileSync('app/dashboard/page.tsx', content);
  console.log('Successfully added ManageSectionsModal to DashboardPage');
} else {
  console.log('ManageSectionsModal already added');
}
