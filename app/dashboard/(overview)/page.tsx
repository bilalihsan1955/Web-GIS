'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, Layers, Settings } from 'lucide-react';
import SmartUploader from '@/components/admin/SmartUploader';
import DashboardStats from '@/components/admin/DashboardStats';
import NodesTable from '@/components/admin/NodesTable';
import CompanyGrid from '@/components/admin/CompanyGrid';
import { DashboardModals } from '@/components/admin/DashboardModals';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNodeMutations } from '@/hooks/useNodeMutations';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ============================================================================
// app/dashboard/(overview)/page.tsx: Clean Dashboard Overview (< 180 lines)
// Clean Architecture: Visual Modals grouped into DashboardModals component
// ============================================================================

export default function DashboardPage() {
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [isUploadBoundaryOpen, setIsUploadBoundaryOpen] = useState(false);
  const [isManageBoundariesOpen, setIsManageBoundariesOpen] = useState(false);
  const { t } = useLanguage();

  const {
    nodes,
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
    isSuperadminGlobal,
  } = useDashboardData();

  const mutations = useNodeMutations({
    fetchData,
    setNodes,
    setLocations,
    setTotalNodes,
  });

  useEffect(() => {
    const handleOpenBoundaries = () => setIsManageBoundariesOpen(true);
    window.addEventListener('open-manage-boundaries', handleOpenBoundaries);
    return () => window.removeEventListener('open-manage-boundaries', handleOpenBoundaries);
  }, []);

  if (!isMounted) {
    return <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center" />;
  }

  // Superadmin Global Mode: Directory view
  if (isSuperadminGlobal) {
    return (
      <div className="animate-fade-in pb-12">
        <CompanyGrid
          adminGroups={adminGroups}
          onSelect={setSelectedCompanyId}
          loading={loading || !isRoleLoaded}
          onRefresh={fetchData}
        />
      </div>
    );
  }

  const activeCompany = adminGroups.find((g) => g.user_id === selectedCompanyId);
  const targetGroupId = userRole === 'superadmin' ? selectedCompanyId : currentUserGroupId;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Superadmin Impersonation Header */}
      {userRole === 'superadmin' && selectedCompanyId !== 'all' && (
        <div className="flex flex-col gap-3 mb-4">
          <button
            onClick={() => setSelectedCompanyId('all')}
            className="group flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors w-fit border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-1.5 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
            {t('backToCompanies') || 'Kembali'}
          </button>

          <div className="flex items-center gap-4 mt-1">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative border border-zinc-200 dark:border-zinc-700">
              <Image
                src={activeCompany?.company_logo || '/Logo.webp'}
                alt={activeCompany?.company_name || 'Logo'}
                width={44}
                height={44}
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {activeCompany?.company_name || 'Tanpa nama'}
            </h2>
          </div>
        </div>
      )}

      {/* Analytics Stat Cards */}
      <DashboardStats
        userRole={userRole}
        loading={loading}
        totalNodes={totalNodes}
        totalLocations={totalLocations}
        totalUsers={totalUsers}
      />

      {/* Upload Pipeline */}
      {(userRole === 'user' || userRole === 'admin' || userRole === 'superadmin') && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t('uploadPipeline') || 'Pipeline Unggah'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsUploadBoundaryOpen(true)}
                className="flex items-center text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 px-3.5 py-2 rounded-xl transition-all shadow-none"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> + Upload batas wilayah
              </button>
              <button
                onClick={() => setIsManageBoundariesOpen(true)}
                className="flex items-center text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/20 px-3.5 py-2 rounded-xl transition-all"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Kelola batas
              </button>
              <button
                onClick={() => setIsManageSectionsOpen(true)}
                className="flex items-center text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 px-3.5 py-2 rounded-xl transition-colors"
              >
                <Settings className="w-3.5 h-3.5 mr-1.5" /> {t('manageSections') || 'Kelola sektor'}
              </button>
            </div>
          </div>

          <SmartUploader onUploadComplete={fetchData} assignToGroupId={targetGroupId} />
        </section>
      )}

      {/* Data Grid / Table */}
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
        allNodes={nodes}
        fetchData={fetchData}
        openEditModal={mutations.openEditModal}
        openDeleteModal={mutations.openDeleteModal}
      />

      {/* Grouped Subcomponent Modals */}
      <DashboardModals
        isUploadBoundaryOpen={isUploadBoundaryOpen}
        setIsUploadBoundaryOpen={setIsUploadBoundaryOpen}
        isManageBoundariesOpen={isManageBoundariesOpen}
        setIsManageBoundariesOpen={setIsManageBoundariesOpen}
        isManageSectionsOpen={isManageSectionsOpen}
        setIsManageSectionsOpen={setIsManageSectionsOpen}
        targetGroupId={targetGroupId}
        fetchData={fetchData}
        mutations={mutations}
      />
    </div>
  );
}
