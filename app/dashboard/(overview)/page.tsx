'use client';

import Image from 'next/image';
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
    setSelectedCompanyId,
    isSuperadminGlobal
  } = useDashboardData();

  const mutations = useNodeMutations({
    fetchData,
    setNodes,
    setLocations,
    setTotalNodes
  });

  // Prevent hydration mismatch by returning a neutral placeholder during SSR and initial hydration
  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center"></div>
    );
  }

  if (!isRoleLoaded) {
    if (isSuperadminGlobal) {
      return (
        <div className="animate-fade-in pb-12">
          <CompanyGrid 
            adminGroups={[]} 
            onSelect={setSelectedCompanyId} 
            loading={true}
          />
        </div>
      );
    }

    const skeletonCards = (userRole === 'admin' || userRole === 'superadmin') ? [1, 2, 3] : [1, 2];

    return (
      <div className="flex flex-col gap-8 animate-pulse pb-12 mt-2">
        {/* Placeholder for unified metrics bar */}
        <div className="bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-[24px] flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden shadow-sm">
          {skeletonCards.map(i => (
            <div key={i} className="flex-1 p-6 flex items-center">
              <div className="h-[58px] w-[58px] rounded-[24px] bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
              <div className="ml-5 space-y-1 w-full">
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mt-1"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Placeholder for Uploader Header */}
        <div className="flex justify-between items-center -mb-2">
           <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
           <div className="h-9 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-[12px]"></div>
        </div>

        {/* Placeholder for Uploader Box */}
        <div className="h-48 rounded-[24px] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800"></div>

        {/* Placeholder for table */}
        <div className="h-96 rounded-[24px] bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800"></div>
      </div>
    );
  }

  // If Superadmin is in Global Mode, ONLY show the Company Grid Directory
  if (isSuperadminGlobal) {
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
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* ── SUPERADMIN IMPERSONATION HEADER ── */}
      {userRole === 'superadmin' && selectedCompanyId !== 'all' && (
        <div className="flex flex-col gap-3 mb-4">
          <button 
            onClick={() => setSelectedCompanyId('all')}
            className="group flex items-center text-xs font-bold tracking-wider text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors w-fit border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] px-4 py-2"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            {t('backToCompanies') || 'Back'}
          </button>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="w-12 h-12 bg-zinc-950 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 shrink-0 overflow-hidden">
              {activeCompany?.company_logo ? (
                <Image src={activeCompany.company_logo} alt={activeCompany.company_name || 'Logo'} width={48} height={48} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <h2 className="text-3xl font-black text-zinc-950 dark:text-white tracking-tighter">
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">{t('uploadPipeline')}</h2>
            <button 
              onClick={() => setIsManageSectionsModalOpen(true)}
              className="flex items-center text-xs font-bold tracking-wider text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors px-4 py-2.5 rounded-[12px]"
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

      {/* Modals (each modal internally manages its own Portal and mounting checks via Modal component) */}
      <ManageSectionsModal
        isOpen={isManageSectionsModalOpen}
        onClose={() => setIsManageSectionsModalOpen(false)}
      />
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
      />
      <DeleteNodeModal 
        isOpen={mutations.isDeleteModalOpen}
        onClose={() => mutations.setIsDeleteModalOpen(false)}
        onConfirm={mutations.confirmDeleteNode}
        deleteError={mutations.deleteError}
        deleteLoading={mutations.deleteLoading}
      />

    </div>
  );
}
