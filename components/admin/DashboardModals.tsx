'use client';

import React from 'react';
import UploadBoundaryModal from '@/components/admin/UploadBoundaryModal';
import ManageBoundariesModal from '@/components/admin/ManageBoundariesModal';
import ManageSectionsModal from '@/components/admin/ManageSectionsModal';
import EditNodeModal from '@/components/admin/EditNodeModal';
import DeleteNodeModal from '@/components/admin/DeleteNodeModal';

// ============================================================================
// components/admin/DashboardModals.tsx: Grouped Overview Dashboard Modals (< 100 lines)
// Clean Architecture: Keeps main overview page.tsx thin and declarative
// ============================================================================

interface DashboardModalsProps {
  isUploadBoundaryOpen: boolean;
  setIsUploadBoundaryOpen: (val: boolean) => void;
  isManageBoundariesOpen: boolean;
  setIsManageBoundariesOpen: (val: boolean) => void;
  isManageSectionsOpen: boolean;
  setIsManageSectionsOpen: (val: boolean) => void;
  targetGroupId?: string;
  fetchData: () => void;
  mutations: any;
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
  isUploadBoundaryOpen,
  setIsUploadBoundaryOpen,
  isManageBoundariesOpen,
  setIsManageBoundariesOpen,
  isManageSectionsOpen,
  setIsManageSectionsOpen,
  targetGroupId,
  fetchData,
  mutations,
}) => {
  return (
    <>
      <UploadBoundaryModal
        isOpen={isUploadBoundaryOpen}
        onClose={() => setIsUploadBoundaryOpen(false)}
        onSuccess={fetchData}
        assignToGroupId={targetGroupId}
      />

      <ManageBoundariesModal
        isOpen={isManageBoundariesOpen}
        onClose={() => setIsManageBoundariesOpen(false)}
        onRefresh={fetchData}
      />

      <ManageSectionsModal
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
      />

      <EditNodeModal
        adminId={targetGroupId}
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
    </>
  );
};
