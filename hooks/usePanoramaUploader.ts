'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { sanitizeHtmlString } from '@/lib/validations/security';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ============================================================================
// hooks/usePanoramaUploader.ts: Panorama 360° Upload & Concurrency Queue Hook
// Max Concurrency: 2 simultaneous uploads to prevent browser/server lockup
// ============================================================================

export interface FileProgress {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'needs_details' | 'saving' | 'success' | 'error';
  errorMsg?: string;
  previewUrl?: string;
  extractedData?: {
    latitude: number;
    longitude: number;
    captureDate: string | null;
    publicUrl: string;
  };
}

export interface SectionItem {
  id: string;
  name: string;
}

interface UsePanoramaUploaderProps {
  onUploadComplete?: () => void;
  assignToGroupId?: string;
}

const MAX_CONCURRENT_UPLOADS = 2;

export function usePanoramaUploader({ onUploadComplete, assignToGroupId }: UsePanoramaUploaderProps = {}) {
  const { t } = useLanguage();

  const [filesProgress, setFilesProgress] = useState<FileProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);

  // Modal State for Finalizing Node Details
  const [activeDetailsFileId, setActiveDetailsFileId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationSectionId, setLocationSectionId] = useState('');
  const [editCaptureDate, setEditCaptureDate] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  // Fetch company sections scoped by tenant group via Standalone API
  const fetchSections = useCallback(async () => {
    try {
      const url =
        assignToGroupId && assignToGroupId !== 'all'
          ? `/api/dashboard/sections?companyId=${encodeURIComponent(assignToGroupId)}`
          : '/api/dashboard/sections';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.sections) setSections(data.sections);
      }
    } catch (err) {
      console.error('[Uploader] Error fetching sections:', err);
    }
  }, [assignToGroupId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Open Details Modal automatically when a file needs details and no modal is active
  useEffect(() => {
    if (!activeDetailsFileId) {
      const nextFile = filesProgress.find((f) => f.status === 'needs_details');
      if (nextFile) {
        setActiveDetailsFileId(nextFile.id);
        setEditCaptureDate(nextFile.extractedData?.captureDate || '');
        setLocationName('');
        setLocationSectionId('');
        setIsSectionDropdownOpen(false);
      }
    }
  }, [filesProgress, activeDetailsFileId]);

  // --------------------------------------------------------------------------
  // CORE FILE PROCESSOR
  // --------------------------------------------------------------------------
  const processFile = useCallback(
    async (fileItem: FileProgress) => {
      const updateProgress = (updates: Partial<FileProgress>) => {
        setFilesProgress((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, ...updates } : f))
        );
      };

      let blobPreviewUrl = '';

      try {
        updateProgress({ status: 'compressing', progress: 5 });

        // 1. Validate 360 format (aspect ratio ~2:1)
        blobPreviewUrl = URL.createObjectURL(fileItem.file);
        const is360 = await new Promise<boolean>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            URL.revokeObjectURL(blobPreviewUrl); // Revoke immediately after load to prevent leak
            resolve(ratio >= 1.9 && ratio <= 2.1);
          };
          img.onerror = () => {
            URL.revokeObjectURL(blobPreviewUrl);
            resolve(false);
          };
          img.src = blobPreviewUrl;
        });

        if (!is360) {
          throw new Error('Upload ditolak: Gambar harus berformat panorama 360° (Rasio 2:1).');
        }

        updateProgress({ progress: 10 });

        // 2. Parse GPS metadata from EXIF
        const exifData = await exifr.parse(fileItem.file, { gps: true, exif: true });
        if (!exifData || typeof exifData.latitude !== 'number' || typeof exifData.longitude !== 'number') {
          throw new Error('Upload ditolak: Tidak ditemukan metadata koordinat GPS pada foto.');
        }

        // 3. Parse capture date from EXIF if available
        let captureDate = null;
        if (exifData.DateTimeOriginal) {
          const dateObj = new Date(exifData.DateTimeOriginal);
          if (!isNaN(dateObj.getTime())) {
            captureDate = dateObj.toISOString().split('T')[0];
          }
        }

        updateProgress({ progress: 30 });

        // 4. Compress image
        const options = { maxSizeMB: 5, maxWidthOrHeight: 4096, useWebWorker: true };
        const compressedFile = await imageCompression(fileItem.file, options);

        updateProgress({ status: 'uploading', progress: 50 });

        // 5. Upload to storage endpoint
        const formData = new FormData();
        formData.append('file', compressedFile, fileItem.file.name);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await res.json();
        if (!res.ok) {
          throw new Error(uploadData.error || 'Gagal mengunggah berkas ke penyimpanan.');
        }

        updateProgress({
          status: 'needs_details',
          progress: 100,
          extractedData: {
            latitude: exifData.latitude,
            longitude: exifData.longitude,
            captureDate,
            publicUrl: uploadData.url,
          },
        });
      } catch (error: any) {
        updateProgress({ status: 'error', errorMsg: error.message || 'Terjadi kesalahan tidak dikenal.' });
        showToast(error.message || 'Gagal memproses berkas.', 'error');
      }
    },
    [showToast]
  );

  // --------------------------------------------------------------------------
  // CONCURRENCY QUEUE DISPATCHER
  // Limits concurrent processing to MAX_CONCURRENT_UPLOADS (2 files)
  // --------------------------------------------------------------------------
  const isProcessingQueueRef = useRef(false);

  useEffect(() => {
    const activeCount = filesProgress.filter(
      (f) => f.status === 'compressing' || f.status === 'uploading'
    ).length;

    if (activeCount < MAX_CONCURRENT_UPLOADS && !isProcessingQueueRef.current) {
      const nextPending = filesProgress.find((f) => f.status === 'pending');
      if (nextPending) {
        isProcessingQueueRef.current = true;
        processFile(nextPending).finally(() => {
          isProcessingQueueRef.current = false;
        });
      }
    }
  }, [filesProgress, processFile]);

  // --------------------------------------------------------------------------
  // SAVE NODE RECORD TO DATABASE
  // --------------------------------------------------------------------------
  const saveNodeToDatabase = async () => {
    if (!activeDetailsFileId || !locationName.trim()) return;

    const file = filesProgress.find((f) => f.id === activeDetailsFileId);
    if (!file || !file.extractedData) return;

    const updateProgress = (updates: Partial<FileProgress>) => {
      setFilesProgress((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, ...updates } : f))
      );
    };

    updateProgress({ status: 'saving' });
    setActiveDetailsFileId(null);

    try {
      const res = await fetch('/api/dashboard/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: locationName.trim(),
          sectionId: locationSectionId || null,
          longitude: file.extractedData.longitude,
          latitude: file.extractedData.latitude,
          imageUrl: file.extractedData.publicUrl,
          captureDate: editCaptureDate || null,
          assignToGroupId: assignToGroupId && assignToGroupId !== 'all' ? assignToGroupId : undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal menyimpan titik panorama.');
      }

      updateProgress({ status: 'success' });
      showToast('Titik panorama 360° berhasil disimpan!', 'success');
      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      // Clean up orphaned storage file if database save fails
      try {
        if (file.extractedData?.publicUrl) {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.extractedData.publicUrl }),
          });
        }
      } catch (cleanupErr) {
        console.error('[Uploader] Cleanup failed:', cleanupErr);
      }

      updateProgress({
        status: 'error',
        errorMsg: error.message || 'Gagal menyimpan data ke database. Berkas dibersihkan.',
      });
      showToast(error.message || 'Gagal menyimpan titik panorama.', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // CANCEL & CLEANUP ACTIONS
  // --------------------------------------------------------------------------
  const handleCancel = async () => {
    if (!activeDetailsFileId) return;
    const file = filesProgress.find((f) => f.id === activeDetailsFileId);

    if (file?.extractedData?.publicUrl) {
      try {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.extractedData.publicUrl }),
        });
      } catch (err) {
        console.error('[Uploader] Cleanup on cancel failed:', err);
      }
    }

    setFilesProgress((prev) =>
      prev.map((f) =>
        f.id === activeDetailsFileId ? { ...f, status: 'error', errorMsg: 'Pengunggahan dibatalkan oleh pengguna.' } : f
      )
    );
    setActiveDetailsFileId(null);
  };

  const handleRemoveFromQueue = (id: string) => {
    setFilesProgress((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // --------------------------------------------------------------------------
  // DRAG & DROP / FILE INPUT DISPATCHERS
  // --------------------------------------------------------------------------
  const handleFilesAdded = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    if (imageFiles.length > 50) {
      showToast(t('maxUploadLimit'), 'error');
      return;
    }

    const newItems: FileProgress[] = imageFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending',
    }));

    setFilesProgress((prev) => [...prev, ...newItems]);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFilesAdded(Array.from(e.dataTransfer.files));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(Array.from(e.target.files));
      e.target.value = ''; // Reset file input so identical file can be selected again
    }
  };

  return {
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
    fetchSections,
  };
}
