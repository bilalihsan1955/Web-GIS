'use client';

import React from 'react';
import { Edit, MapPin, Calendar, ChevronDown } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button, Input } from '@/components/ui/GlobalComponents';
import { FileProgress, SectionItem } from '@/hooks/usePanoramaUploader';

interface UploaderDetailsFormProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: FileProgress | null;
  locationName: string;
  setLocationName: (val: string) => void;
  locationSectionId: string;
  setLocationSectionId: (val: string) => void;
  editCaptureDate: string;
  setEditCaptureDate: (val: string) => void;
  sections: SectionItem[];
  isSectionDropdownOpen: boolean;
  setIsSectionDropdownOpen: (val: boolean) => void;
  onSave: () => void;
  onCancelClick: () => void;
}

export const UploaderDetailsForm: React.FC<UploaderDetailsFormProps> = ({
  isOpen,
  onClose,
  activeFile,
  locationName,
  setLocationName,
  locationSectionId,
  setLocationSectionId,
  editCaptureDate,
  setEditCaptureDate,
  sections,
  isSectionDropdownOpen,
  setIsSectionDropdownOpen,
  onSave,
  onCancelClick,
}) => {
  if (!isOpen || !activeFile) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lengkapi Detail Titik Panorama"
      icon={<Edit className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Thumbnail Preview & Coordinates */}
        <div className="flex gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeFile.extractedData?.publicUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold text-zinc-500">Nama berkas</p>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{activeFile.file.name}</p>
            <div className="pt-1 flex items-center gap-3 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              <span>Lat: {activeFile.extractedData?.latitude?.toFixed(4)}</span>
              <span>Lng: {activeFile.extractedData?.longitude?.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <Input
            label="Nama lokasi"
            placeholder="Masukkan nama lokasi titik pantau..."
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />

          {/* Sektor Selection Dropdown */}
          <div className="relative space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Sektor / seksi wilayah
            </label>
            <button
              type="button"
              onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm flex items-center justify-between text-left focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
            >
              <span className={locationSectionId ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}>
                {locationSectionId
                  ? sections.find((s) => s.id === locationSectionId)?.name || 'Pilih sektor...'
                  : 'Pilih sektor wilayah (opsional)...'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${isSectionDropdownOpen ? 'rotate-180 text-cyan-600' : ''}`}
              />
            </button>

            {isSectionDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSectionDropdownOpen(false)} />
                <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {sections.length === 0 ? (
                    <div className="p-3 text-xs text-center text-zinc-500">Belum ada sektor dibuat</div>
                  ) : (
                    sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setLocationSectionId(section.id);
                          setIsSectionDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                          locationSectionId === section.id
                            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 font-semibold'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {section.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Capture Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Tanggal pengambilan foto
            </label>
            <Input
              type="date"
              value={editCaptureDate}
              onChange={(e) => setEditCaptureDate(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="secondary" size="sm" onClick={onCancelClick}>
            Batal
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} disabled={!locationName.trim()}>
            Simpan titik
          </Button>
        </div>
      </div>
    </Modal>
  );
};
