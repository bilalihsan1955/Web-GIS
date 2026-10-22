'use client';

import React from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2, Edit, X } from 'lucide-react';
import { FileProgress } from '@/hooks/usePanoramaUploader';
import { Badge } from '@/components/ui/GlobalComponents';

interface UploaderDropzoneProps {
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filesProgress: FileProgress[];
  onRemove: (id: string) => void;
  onEditDetails: (id: string) => void;
}

export const UploaderDropzone: React.FC<UploaderDropzoneProps> = ({
  isDragging,
  setIsDragging,
  onDrop,
  handleFileInput,
  filesProgress,
  onRemove,
  onEditDetails,
}) => {
  const successCount = filesProgress.filter((f) => f.status === 'success').length;

  return (
    <div className="space-y-6 w-full mx-auto">
      {/* ── Drag & Drop Zone ── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-3xl transition-all duration-300 ${
          isDragging
            ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20'
            : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-600'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className={`p-4 rounded-full mb-4 pointer-events-none transition-colors border ${
            isDragging
              ? 'bg-white dark:bg-zinc-800 border-cyan-400 text-cyan-600 dark:text-cyan-400'
              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
          }`}
        >
          <UploadCloud className="w-9 h-9" />
        </div>
        <h4 className="text-lg font-bold text-zinc-900 dark:text-white pointer-events-none">
          Tarik & lepas foto panorama 360° di sini
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 text-center max-w-sm pointer-events-none">
          Format JPEG atau PNG (Rasio 2:1). Metadata GPS diekstrak otomatis.
        </p>
      </div>

      {/* ── File Progress Queue ── */}
      {filesProgress.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-none">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Antrean Unggah Foto
            </h3>
            <Badge variant="info">
              {successCount} / {filesProgress.length} Selesai
            </Badge>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[380px] overflow-y-auto">
            {filesProgress.map((fp) => (
              <li key={fp.id} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate pr-3">{fp.file.name}</p>
                    <span className="text-[10px] font-semibold text-zinc-500 capitalize">
                      {fp.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {(fp.status === 'compressing' || fp.status === 'uploading' || fp.status === 'pending') && (
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${fp.progress}%` }}
                      />
                    </div>
                  )}

                  {fp.status === 'error' && (
                    <p className="text-[11px] font-medium text-red-500 mt-1 bg-red-50 dark:bg-red-950/20 p-1.5 rounded-lg border border-red-200 dark:border-red-900/30">
                      {fp.errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {fp.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {fp.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  {fp.status === 'needs_details' && (
                    <button
                      onClick={() => onEditDetails(fp.id)}
                      className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                      title="Lengkapi detail"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {(fp.status === 'compressing' || fp.status === 'uploading' || fp.status === 'saving' || fp.status === 'pending') && (
                    <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                  )}
                  <button
                    onClick={() => onRemove(fp.id)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Hapus dari antrean"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
