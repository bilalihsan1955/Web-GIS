'use client';

import { createPortal } from 'react-dom';
import { ChevronLeft, Building2 } from 'lucide-react';
import SmartUploader from '@/components/admin/SmartUploader';
import DashboardStats from '@/components/admin/DashboardStats';
import NodesTable from '@/components/admin/NodesTable';
import EditNodeModal from '@/components/admin/EditNodeModal';
import DeleteNodeModal from '@/components/admin/DeleteNodeModal';
import CompanyGrid from '@/components/admin/CompanyGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNodeMutations } from '@/hooks/useNodeMutations';

export default function DashboardPage() {
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
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-slate-500">
          <svg className="w-8 h-8 animate-spin text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Memuat Data Dashboard...</span>
        </div>
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
        <div className="flex flex-col gap-1 mb-2">
          <button 
            onClick={() => setSelectedCompanyId('all')}
            className="group flex items-center text-sm font-medium text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors w-fit"
          >
            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Direktori
          </button>
          
          <div className="flex items-center gap-3 mt-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0 overflow-hidden">
              {activeCompany?.company_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeCompany.company_logo} alt={activeCompany.company_name || 'Logo'} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {activeCompany?.company_name || 'Tanpa Nama'}
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Mode Pengelolaan Aktif
              </span>
            </div>
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 drop-shadow-sm dark:drop-shadow-md px-2">Upload Pipeline</h2>
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
          filteredNodes={filteredNodes}
          openEditModal={mutations.openEditModal}
          openDeleteModal={mutations.openDeleteModal}
        />

      {/* Render Modals securely outside the layout stack */}
      {isMounted && document.body && createPortal(
        <EditNodeModal 
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
