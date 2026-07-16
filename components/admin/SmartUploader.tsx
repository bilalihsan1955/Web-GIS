'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { UploadCloud, CheckCircle2, XCircle, Loader2, MapPin, X, Calendar, Edit, AlertTriangle, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Modal from '@/components/ui/Modal';

interface FileProgress {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'compressing' | 'uploading' | 'needs_details' | 'saving' | 'success' | 'error';
  errorMsg?: string;
  extractedData?: {
    latitude: number;
    longitude: number;
    captureDate: string | null;
    publicUrl: string;
  };
}

export default function SmartUploader({ onUploadComplete, assignToGroupId }: { onUploadComplete?: () => void, assignToGroupId?: string }) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [filesProgress, setFilesProgress] = useState<FileProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);

  const fetchSections = useCallback(async () => {
    let query = supabase.from('company_sections').select('id, name').order('created_at', { ascending: true });
    if (assignToGroupId && assignToGroupId !== 'all') {
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
  }, [isSectionDropdownOpen, fetchSections]);

  // Modal State for Finalizing Details
  const [activeDetailsFileId, setActiveDetailsFileId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationSectionId, setLocationSectionId] = useState('');
  const [editCaptureDate, setEditCaptureDate] = useState('');

  // Automatically pop the Details modal if a file is waiting and no modal is currently open
  useEffect(() => {
    if (!activeDetailsFileId) {
      const nextFile = filesProgress.find(f => f.status === 'needs_details');
      if (nextFile) {
        setActiveDetailsFileId(nextFile.id);
        setEditCaptureDate(nextFile.extractedData?.captureDate || '');
        setLocationName('');
        setLocationSectionId('');
        setIsSectionDropdownOpen(false);
      }
    }
  }, [filesProgress, activeDetailsFileId]);

  const processFile = async (fileProgress: FileProgress) => {
    const updateProgress = (updates: Partial<FileProgress>) => {
      setFilesProgress((prev) => 
        prev.map(f => f.id === fileProgress.id ? { ...f, ...updates } : f)
      );
    };

    try {
      updateProgress({ status: 'compressing', progress: 5 });
      
      // 1. Check 360 format (aspect ratio ~2:1)
      const is360 = await new Promise<boolean>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          // Equirectangular is exactly 2.0, allowing slight margin
          resolve(ratio >= 1.9 && ratio <= 2.1);
        };
        img.onerror = () => resolve(false);
        img.src = URL.createObjectURL(fileProgress.file);
      });

      if (!is360) {
        throw new Error('Upload ditolak: Gambar harus berformat panorama 360° (Rasio 2:1).');
      }

      updateProgress({ progress: 10 });
      const exifData = await exifr.parse(fileProgress.file, { gps: true, exif: true });
      
      if (!exifData || !exifData.latitude || !exifData.longitude) {
        throw new Error('Upload rejected: No GPS metadata found in image.');
      }

      let captureDate = null;
      if (exifData.DateTimeOriginal) {
        const dateObj = new Date(exifData.DateTimeOriginal);
        if (!isNaN(dateObj.getTime())) {
          captureDate = dateObj.toISOString().split('T')[0];
        }
      }

      updateProgress({ progress: 30 });
      const options = { maxSizeMB: 5, maxWidthOrHeight: 4096, useWebWorker: true };
      const compressedFile = await imageCompression(fileProgress.file, options);
      
      updateProgress({ status: 'uploading', progress: 50 });
      const formData = new FormData();
      formData.append('file', compressedFile, fileProgress.file.name);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload to local storage.');
      }
      
      const publicUrl = data.url;

      // Stop here and wait for user to finalize details
      updateProgress({ 
        status: 'needs_details', 
        progress: 100,
        extractedData: {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          captureDate,
          publicUrl
        }
      });
      
    } catch (error: any) {
      updateProgress({ status: 'error', errorMsg: error.message || 'Unknown error occurred.' });
    }
  };

  const saveNodeToDatabase = async () => {
    if (!activeDetailsFileId || !locationName.trim()) return;

    const file = filesProgress.find(f => f.id === activeDetailsFileId);
    if (!file || !file.extractedData) return;

    const updateProgress = (updates: Partial<FileProgress>) => {
      setFilesProgress((prev) => 
        prev.map(f => f.id === file.id ? { ...f, ...updates } : f)
      );
    };

    updateProgress({ status: 'saving' });
    setActiveDetailsFileId(null); // Close modal

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        alert("You are not logged in");
        throw new Error('Authentication required. Your session has expired.');
      }

      // Handle Location mapping atomically
      let locId = '';
      const slug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const { data: existingLoc, error: queryErr } = await supabase
        .from('locations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (queryErr) throw queryErr;

      if (existingLoc) {
        locId = existingLoc.id;
        // Optionally update section if the location already exists
        if (locationSectionId) {
          await supabase
            .from('locations')
            .update({ section_id: locationSectionId })
            .eq('id', locId);
        }
      } else {
        const { data: newLoc, error: locErr } = await supabase
          .from('locations')
          .insert({ 
            name: locationName, 
            slug, 
            section_id: locationSectionId || null, 
            created_by: assignToGroupId || sessionData.session.user.id 
          })
          .select('id')
          .single();
        if (locErr) throw locErr;
        locId = newLoc.id;
      }

      const { error: dbError } = await supabase
        .from('spatial_nodes')
        .insert({
          location_id: locId,
          longitude: file.extractedData.longitude,
          latitude: file.extractedData.latitude,
          image_url: file.extractedData.publicUrl,
          is_published: true,
          capture_date: editCaptureDate || null,
          created_by: assignToGroupId || sessionData.session.user.id
        });

      if (dbError) throw new Error(dbError.message);

      updateProgress({ status: 'success' });
      if (onUploadComplete) onUploadComplete();
      
    } catch (error: any) {
      // Cleanup orphan file if DB insert fails
      try {
        if (file.extractedData?.publicUrl) {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.extractedData.publicUrl })
          });
        }
      } catch (err) {
        console.error("Cleanup failed", err);
      }
      updateProgress({ status: 'error', errorMsg: error.message || 'Failed to save node to database. Upload cleaned up.' });
    }
  };

  const handleCancel = async () => {
    if (!activeDetailsFileId) return;
    const file = filesProgress.find(f => f.id === activeDetailsFileId);
    
    // Physically clean up file
    if (file && file.extractedData?.publicUrl) {
      try {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.extractedData.publicUrl })
        });
      } catch (err) {
        console.error("Cleanup on cancel failed", err);
      }
    }
    
    // Set file state to error/cancelled
    setFilesProgress(prev => 
      prev.map(f => f.id === activeDetailsFileId ? { ...f, status: 'error', errorMsg: 'Upload cancelled by user.' } : f)
    );
    setActiveDetailsFileId(null);
  };

  const handleRemoveFromQueue = async (id: string) => {
    // Just remove from queue UI visually. No backend deletion.
    setFilesProgress(prev => prev.filter(f => f.id !== id));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const newFilesProgress: FileProgress[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file, progress: 0, status: 'pending'
    }));

    // Appending properly guarantees queue UI resets/shows all new drops correctly
    setFilesProgress(prevFiles => [...prevFiles, ...newFilesProgress]);
    newFilesProgress.forEach(fp => processFile(fp));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) {
        e.target.value = ''; // Reset input even if no valid files
        return;
      }

      const newFilesProgress: FileProgress[] = files.map(file => ({
        id: Math.random().toString(36).substring(7),
        file, progress: 0, status: 'pending'
      }));

      // Appending to array functionally
      setFilesProgress(prevFiles => [...prevFiles, ...newFilesProgress]);
      newFilesProgress.forEach(fp => processFile(fp));
      
      // FIX FILE INPUT RESET: Allow selecting the same file consecutively
      e.target.value = '';
    }
  };

  const activeFileDetails = activeDetailsFileId ? filesProgress.find(f => f.id === activeDetailsFileId) : null;

  const modalContent = activeDetailsFileId && activeFileDetails && isMounted ? (
    <Modal
      isOpen={!!activeDetailsFileId}
      onClose={handleCancel}
      title="Finalize Image Details"
      icon={<Edit className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-white/50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 relative shadow-inner backdrop-blur-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeFileDetails.extractedData?.publicUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">File Name</p>
            <p className="text-sm text-zinc-800 dark:text-zinc-300 truncate w-48 font-medium">{activeFileDetails.file.name}</p>
            
            <div className="pt-2 flex items-center gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-zinc-200 dark:border-white/5 backdrop-blur-sm">
              <span>Lat: {activeFileDetails.extractedData?.latitude?.toFixed(4)}</span>
              <span>Lng: {activeFileDetails.extractedData?.longitude?.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" /> {t('locationName')}
            </label>
            <input 
              type="text"
              placeholder={t('locationName') + '…'}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all "
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" /> {t('locationDesc')}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                className={`w-full bg-zinc-50 dark:bg-zinc-800 border flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all  outline-none
                  ${isSectionDropdownOpen ? 'border-cyan-500/50 ring-2 ring-cyan-500/20 text-zinc-900 dark:text-white' : 'border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:border-zinc-300 dark:hover:border-zinc-600'}`}
              >
                <span className={locationSectionId ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 dark:text-white/30'}>
                  {locationSectionId ? sections.find(s => s.id === locationSectionId)?.name : 'Pilih Sektor...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ${isSectionDropdownOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''}`} />
              </button>
              
              {isSectionDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setIsSectionDropdownOpen(false)}
                  />
                  <div className="absolute z-[101] w-full mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-lg animate-fade-in origin-top max-h-48 overflow-y-auto">
                    {sections.length === 0 ? (
                      <div className="p-4 text-sm text-center text-zinc-500">
                        {t('noSections')}
                      </div>
                    ) : (
                      sections.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => {
                            setLocationSectionId(section.id);
                            setIsSectionDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50 dark:hover:bg-white/10
                            ${locationSectionId === section.id ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}`}
                        >
                          {section.name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-300 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" /> Capture Date
            </label>
            <input 
              type="date"
              value={editCaptureDate}
              onChange={(e) => setEditCaptureDate(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all "
            />
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3 mt-2">
          <button 
            onClick={handleCancel} 
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={saveNodeToDatabase}
            disabled={!locationName.trim()}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[44px] justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all flex items-center disabled:opacity-50 shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </Modal>
  ) : null;

  return (
    <div className="space-y-6 w-full mx-auto relative">
      
      {/* ── Drag & Drop Upload Zone ── */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center p-6 sm:p-12 border-2 border-dashed rounded-[24px] transition-all duration-300  ${
          isDragging 
            ? 'border-cyan-400 bg-zinc-100 dark:bg-zinc-800' 
            : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className={`p-4 rounded-full mb-5 pointer-events-none transition-colors border ${isDragging ? 'bg-white dark:bg-zinc-700 border-cyan-300 dark:border-cyan-600' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'}`}>
          <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400'}`} />
        </div>
        <h4 className="text-xl font-bold text-zinc-900 dark:text-white pointer-events-none tracking-tight">
          Drag & drop 360° panoramas here
        </h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 text-center max-w-md pointer-events-none leading-relaxed ">
          JPEG/PNG. Files will be uploaded and GPS metadata extracted. You will be prompted to verify details before saving.
        </p>
      </div>

      {/* ── File Progress Queue ── */}
      {filesProgress.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-[24px]  border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-wide ">
              Upload Queue 
            </h3>
            <span className="bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs px-2.5 py-1 rounded-full font-bold border border-cyan-200 dark:border-cyan-500/20 ">
              {filesProgress.filter(f => f.status === 'success').length} / {filesProgress.length}
            </span>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {filesProgress.map((fp) => (
              <li key={fp.id} className="p-5 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                <div className="flex-1 min-w-0 mr-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate pr-4 ">{fp.file.name}</p>
                    <span className={`text-[11px] font-bold capitalize ${
                      fp.status === 'error' ? 'text-red-400' : 
                      fp.status === 'success' ? 'text-emerald-400' : 
                      fp.status === 'needs_details' ? 'text-amber-400' :
                      'text-cyan-400'
                    }`}>
                      {fp.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  {(fp.status === 'compressing' || fp.status === 'uploading' || fp.status === 'pending') && (
                    <div className="w-full bg-zinc-200/50 dark:bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden border border-zinc-200 dark:border-white/5 backdrop-blur-sm">
                      <div 
                        className="bg-cyan-500 dark:bg-cyan-400 h-1.5 rounded-full transition-all duration-300 ease-out " 
                        style={{ width: `${fp.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {fp.status === 'error' && (
                    <p className="text-xs font-medium text-red-400 mt-1.5 bg-red-500/10 p-2 rounded-lg border border-red-500/20 shadow-none">{fp.errorMsg}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-center space-x-3 shrink-0">
                  {fp.status === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-400 shadow-md" />}
                  {fp.status === 'error' && <AlertTriangle className="w-6 h-6 text-red-400 shadow-md" />}
                  {fp.status === 'needs_details' && (
                    <button 
                      onClick={() => {
                        setActiveDetailsFileId(fp.id);
                        setEditCaptureDate(fp.extractedData?.captureDate || '');
                        setLocationName('');
                      }}
                      className="bg-amber-500/20 text-amber-300 border border-amber-500/30 p-1.5 rounded-md hover:bg-amber-500/30 transition-colors shadow-none"
                      title="Complete Details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {(fp.status === 'compressing' || fp.status === 'uploading' || fp.status === 'saving' || fp.status === 'pending') && (
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  )}
                  
                  {/* Remove/Cancel Item Button */}
                  <button 
                    onClick={() => handleRemoveFromQueue(fp.id)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 p-1.5 rounded-lg transition-colors shadow-none"
                    title="Remove from queue"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Render Modal into Portal */}
      {isMounted && document.body && createPortal(modalContent, document.body)}
    </div>
  );
}
