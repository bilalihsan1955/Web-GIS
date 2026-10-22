'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { usePanoramaUploader } from '@/hooks/usePanoramaUploader';
import { UploaderDropzone } from './uploader/UploaderDropzone';
import { UploaderDetailsForm } from './uploader/UploaderDetailsForm';
import { ConfirmDialog } from '@/components/ui/GlobalComponents';

// ============================================================================
// components/admin/SmartUploader.tsx: Thin Orchestrator (< 120 lines)
// Clean Architecture: Visual rendering separated from EXIF & Concurrency Hook
// ============================================================================

interface SmartUploaderProps {
  onUploadComplete?: () => void;
  assignToGroupId?: string;
}

export default function SmartUploader({ onUploadComplete, assignToGroupId }: SmartUploaderProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    filesProgress,
    isDragging,
    setIsDragging,
    sections,
    isSectionDropdownOpen,
    setIsSectionDropdownOpen,
    activeDetailsFileId,
    setActiveDetailsFileId,
    locationName,
    setLocationName,
    locationSectionId,
    setLocationSectionId,
    editCaptureDate,
    setEditCaptureDate,
    isCancelConfirmOpen,
    setIsCancelConfirmOpen,
    toastMessage,
    toastType,
    onDrop,
    handleFileInput,
    saveNodeToDatabase,
    handleCancel,
    handleRemoveFromQueue,
  } = usePanoramaUploader({ onUploadComplete, assignToGroupId });

  const activeFile = activeDetailsFileId ? filesProgress.find((f) => f.id === activeDetailsFileId) || null : null;

  return (
    <div className="space-y-6 w-full mx-auto relative">
      {/* 1. Drag & Drop Zone and Progress Queue */}
      <UploaderDropzone
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        onDrop={onDrop}
        handleFileInput={handleFileInput}
        filesProgress={filesProgress}
        onRemove={handleRemoveFromQueue}
        onEditDetails={(id) => {
          const target = filesProgress.find((f) => f.id === id);
          if (target) {
            setActiveDetailsFileId(id);
            setEditCaptureDate(target.extractedData?.captureDate || '');
            setLocationName('');
          }
        }}
      />

      {/* 2. Modal Form for Finalizing Node Details */}
      <UploaderDetailsForm
        isOpen={Boolean(activeDetailsFileId && activeFile)}
        onClose={() => setIsCancelConfirmOpen(true)}
        activeFile={activeFile}
        locationName={locationName}
        setLocationName={setLocationName}
        locationSectionId={locationSectionId}
        setLocationSectionId={setLocationSectionId}
        editCaptureDate={editCaptureDate}
        setEditCaptureDate={setEditCaptureDate}
        sections={sections}
        isSectionDropdownOpen={isSectionDropdownOpen}
        setIsSectionDropdownOpen={setIsSectionDropdownOpen}
        onSave={saveNodeToDatabase}
        onCancelClick={() => setIsCancelConfirmOpen(true)}
      />

      {/* 3. Global Confirm Dialog on Cancel */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={() => {
          setIsCancelConfirmOpen(false);
          handleCancel();
        }}
        title="Batalkan pengunggahan foto?"
        message="Berkas yang telah diunggah ke penyimpanan sementara akan dihapus dan tidak disimpan ke basis data."
        confirmLabel="Ya, batalkan"
        cancelLabel="Kembali"
        variant="danger"
      />

      {/* 4. Global Toast Notification via Portal */}
      {toastMessage && isMounted && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed bottom-6 right-6 z-[100000] animate-slide-up flex items-center gap-2 px-4 py-3 rounded-xl text-white font-medium text-xs shadow-sm border ${
            toastType === 'success' ? 'bg-emerald-600 border-emerald-500/30' : 'bg-red-600 border-red-500/30'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toastMessage}
        </div>,
        document.body
      )}
    </div>
  );
}
