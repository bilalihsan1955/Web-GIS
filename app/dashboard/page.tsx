'use client';

import { createPortal } from 'react-dom';
import { ChevronLeft, Building2, Settings, Layers } from 'lucide-react';
import SmartUploader from '@/components/admin/SmartUploader';
import DashboardStats from '@/components/admin/DashboardStats';
import NodesTable from '@/components/admin/NodesTable';
import EditNodeModal from '@/components/admin/EditNodeModal';
import DeleteNodeModal from '@/components/admin/DeleteNodeModal';
import CompanyGrid from '@/components/admin/CompanyGrid';
import ManageSectionsModal from '@/components/admin/ManageSectionsModal';
import { useState } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNodeMutations } from '@/hooks/useNodeMutations';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardPage() {
  const [isManageSectionsModalOpen, setIsManageSectionsModalOpen] = useState(false);
  const { t } = useLanguage();
  const {
    loading,
    isRoleLoaded,
    isMounted,
    currentUser,
    userRole,
    currentUserGroupId,
    totalNodes,
    totalLocations,
    totalUsers,
    searchQuery,
    setSearchQuery,
    sectionFilter,
    setSectionFilter,
    fetchData,
    filteredNodes,
    setNodes,
    setLocations,
    setTotalNodes,
    dynamicSections,
    adminGroups,
    selectedCompanyId,
    setSelectedCompanyId
  } = useDashboardData();

  const mutations = useNodeMutations({
    fetchData,
    setNodes,
    setLocations,
    setTotalNodes
  });

  if (!isRoleLoaded) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        {/* Placeholder for header/stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-white/10"></div>
          ))}
        </div>
        {/* Placeholder for table */}
        <div className="h-96 bg-slate-200 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-white/10"></div>
      </div>
    );
  }

  // If Superadmin is in Global Mode, ONLY show the Company Grid Directory
  if (userRole === 'superadmin' && selectedCompanyId === 'all') {
    return (
      <div className="animate-fade-in pb-12">
        <CompanyGrid 
          adminGroups={adminGroups} 
          onSelect={setSelectedCompanyId} 
          loading={loading}
        />
      </div>
    );
  }

  // Active Impersonation or Normal Admin/User Dashboard
  const activeCompany = adminGroups.find(g => g.user_id === selectedCompanyId);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ── SUPERADMIN IMPERSONATION HEADER ── */}
      {userRole === 'superadmin' && selectedCompanyId !== 'all' && (
        <div className="flex flex-col gap-3 mb-2">
          <button 
            onClick={() => setSelectedCompanyId('all')}
            className="group flex items-center text-sm font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors w-fit bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            {t('back')}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0 overflow-hidden">
              {activeCompany?.company_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeCompany.company_logo} alt={activeCompany.company_name || 'Logo'} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {activeCompany?.company_name || 'Tanpa Nama'}
            </h2>
          </div>
        </div>
      )}

      {/* ── ANALYTICS STAT CARDS ── */}
      <DashboardStats 
        userRole={userRole}
        loading={loading}
        totalNodes={totalNodes}
        totalLocations={totalLocations}
        totalUsers={totalUsers}
      />

      {/* ── SMART BATCH UPLOADER ── */}
      {(userRole === 'user' || userRole === 'admin' || userRole === 'superadmin') && (
        <section>
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">{t('uploadPipeline')}</h2>
            <button 
              onClick={() => setIsManageSectionsModalOpen(true)}
              className="flex items-center text-sm font-medium text-cyan-600 hover:text-cyan-700 bg-cyan-50 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 dark:text-cyan-400 dark:border dark:border-cyan-800 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              {t('manageSections')}
            </button>
          </div>
          <SmartUploader 
            onUploadComplete={fetchData} 
            assignToGroupId={userRole === 'superadmin' ? selectedCompanyId : currentUserGroupId} 
          />
        </section>
      )}

      {/* ── LIVE DATA GRID / TABLE ── */}
        <NodesTable 
          userRole={userRole}
          currentUser={currentUser}
          currentUserGroupId={currentUserGroupId}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sectionFilter={sectionFilter}
          setSectionFilter={setSectionFilter}
          dynamicSections={dynamicSections}
          filteredNodes={filteredNodes}
          openEditModal={mutations.openEditModal}
          openDeleteModal={mutations.openDeleteModal}
        />

      {/* Render Modals securely outside the layout stack */}
      {isMounted && document.body && createPortal(
        <ManageSectionsModal
          isOpen={isManageSectionsModalOpen}
          onClose={() => setIsManageSectionsModalOpen(false)}
          adminId={userRole === 'superadmin' ? selectedCompanyId : currentUserGroupId}
        />,
        document.body
      )}
      {isMounted && document.body && createPortal(
        <EditNodeModal 
          adminId={userRole === 'superadmin' ? selectedCompanyId : currentUserGroupId}
          isOpen={mutations.isEditModalOpen}
          onClose={() => mutations.setIsEditModalOpen(false)}
          onSubmit={mutations.handleEditSubmit}
          modalError={mutations.modalError}
          modalLoading={mutations.modalLoading}
          editImagePreview={mutations.editImagePreview}
          handleEditImageSelect={mutations.handleEditImageSelect}
          editLocationName={mutations.editLocationName}
          setEditLocationName={mutations.setEditLocationName}
          editLocationDescription={mutations.editLocationDescription}
          setEditLocationDescription={mutations.setEditLocationDescription}
          editLocationSectionId={mutations.editLocationSectionId}
          setEditLocationSectionId={mutations.setEditLocationSectionId}
          editCaptureDate={mutations.editCaptureDate}
          setEditCaptureDate={mutations.setEditCaptureDate}
          editIsPublished={mutations.editIsPublished}
          setEditIsPublished={mutations.setEditIsPublished}
        />,
        document.body
      )}
      
      {isMounted && document.body && createPortal(
        <DeleteNodeModal 
          isOpen={mutations.isDeleteModalOpen}
          onClose={() => mutations.setIsDeleteModalOpen(false)}
          onConfirm={mutations.confirmDeleteNode}
          deleteError={mutations.deleteError}
          deleteLoading={mutations.deleteLoading}
        />,
        document.body
      )}

    </div>
  );
}
