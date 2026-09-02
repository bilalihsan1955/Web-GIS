'use client';

import React, { useState, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { UploadCloud, Layers, Loader2, CheckCircle2, XCircle, Trash2, MapPin, AlertCircle } from 'lucide-react';
import { parseBoundaryFile, ParsedBoundaryLayer } from '@/lib/boundaryParser';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface UploadBoundaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignToGroupId?: string;
}

export default function UploadBoundaryModal({
  isOpen,
  onClose,
  onSuccess,
  assignToGroupId,
}: UploadBoundaryModalProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [parsedLayers, setParsedLayers] = useState<ParsedBoundaryLayer[]>([]);

  const handleFile = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const layers = await parseBoundaryFile(file);
      if (layers.length === 0) {
        throw new Error('Tidak ada data poligon yang ditemukan di dalam berkas.');
      }
      setParsedLayers(layers);
    } catch (err: any) {
      console.error('Error parsing boundary file:', err);
      setError(err.message || 'Gagal memproses berkas spasial.');
      setParsedLayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleColorChange = (index: number, newColor: string) => {
    setParsedLayers(prev => {
      const next = [...prev];
      next[index].color = newColor;
      return next;
    });
  };

  const handleNameChange = (index: number, newName: string) => {
    setParsedLayers(prev => {
      const next = [...prev];
      next[index].name = newName;
      return next;
    });
  };

  const handleRemoveLayer = (index: number) => {
    setParsedLayers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (parsedLayers.length === 0) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/boundaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boundaries: parsedLayers,
          assignToGroupId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan batas wilayah.');
      }

      setParsedLayers([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save boundaries error:', err);
      setError(err.message || 'Gagal menyimpan batas wilayah.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading && !saving) {
          setParsedLayers([]);
          setError('');
          onClose();
        }
      }}
      title="Upload Batas Wilayah (Shapefile / KML / GeoJSON)"
      icon={<Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs sm:text-sm border border-red-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag & Drop Area */}
        {parsedLayers.length === 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer relative overflow-hidden backdrop-blur-sm ${
              isDragging
                ? 'border-cyan-500 bg-cyan-500/10 scale-[0.99]'
                : 'border-zinc-300 dark:border-white/10 bg-zinc-50/50 dark:bg-black/30 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:bg-white/80 dark:hover:bg-black/50'
            }`}
          >
            <input
              type="file"
              accept=".zip,.kml,.kmz,.geojson,.json"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading}
            />

            {loading ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Memproses & mengonversi berkas spasial...</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Mengekstrak poligon & menghitung luas area</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-white">
                  Tarik & Lepas Berkas Batas Wilayah Di Sini
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md">
                  Dukungan format: <strong className="text-cyan-600 dark:text-cyan-400">.ZIP (Shapefile)</strong>, <strong className="text-cyan-600 dark:text-cyan-400">.KML / .KMZ</strong> (Google Earth), atau <strong className="text-cyan-600 dark:text-cyan-400">.GEOJSON / .JSON</strong>
                </p>
                <span className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-all shadow-md">
                  Pilih Berkas Komputer
                </span>
              </div>
            )}
          </div>
        )}

        {/* Parsed Layers Review List */}
        {parsedLayers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {parsedLayers.length} Layer Batas Terdeteksi
              </h4>
              <button
                onClick={() => setParsedLayers([])}
                className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
              >
                Reset / Reset Berkas
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {parsedLayers.map((layer, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Color picker circle */}
                    <input
                      type="color"
                      value={layer.color || '#06b6d4'}
                      onChange={e => handleColorChange(idx, e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                      title="Ubah Warna Layer"
                    />
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={layer.name}
                        onChange={e => handleNameChange(idx, e.target.value)}
                        className="bg-transparent font-bold text-sm text-zinc-900 dark:text-white border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-cyan-500 outline-none w-full truncate"
                      />
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span>{layer.featureCount} Poligon</span>
                        <span>•</span>
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                          {layer.totalAreaHa.toLocaleString('id-ID')} ha ({ (layer.totalAreaHa * 0.01).toFixed(2) } km²)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveLayer(idx)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors self-end sm:self-center"
                    title="Hapus Layer Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Simpan {parsedLayers.length} Layer ke Peta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
