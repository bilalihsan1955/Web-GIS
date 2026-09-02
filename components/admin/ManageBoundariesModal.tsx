'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Layers, Trash2, Edit3, Loader2, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useMapStore, BoundaryItem } from '@/store/useMapStore';
import { useDashboardStore } from '@/store/useDashboardStore';

interface ManageBoundariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ManageBoundariesModal({
  isOpen,
  onClose,
  onRefresh,
}: ManageBoundariesModalProps) {
  const userRole = useDashboardStore((s) => s.userRole);
  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const currentUserGroupId = useDashboardStore((s) => s.currentUserGroupId);
  const adminId = userRole === 'superadmin' ? selectedCompanyId : currentUserGroupId;

  const boundaries = useMapStore((s) => s.boundaries);
  const fetchBoundaries = useMapStore((s) => s.fetchBoundaries);
  const toggleBoundaryVisibility = useMapStore((s) => s.toggleBoundaryVisibility);
  const deleteBoundary = useMapStore((s) => s.deleteBoundary);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#06b6d4');
  const [editOpacity, setEditOpacity] = useState(0.35);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchBoundaries(adminId || undefined).finally(() => setLoading(false));
    }
  }, [isOpen, adminId, fetchBoundaries]);

  const handleStartEdit = (b: BoundaryItem) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditColor(b.color || '#06b6d4');
    setEditOpacity(b.opacity ?? 0.35);
  };

  const handleSaveEdit = async (id: string) => {
    setSavingId(id);
    setError('');
    try {
      const res = await fetch('/api/dashboard/boundaries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editName,
          color: editColor,
          opacity: editOpacity,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal memperbarui layer');
      }

      await fetchBoundaries(adminId || undefined);
      setEditingId(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Update boundary error:', err);
      setError(err.message || 'Gagal memperbarui layer batas.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus layer batas wilayah ini?')) return;
    setDeletingId(id);
    setError('');
    try {
      await deleteBoundary(id);
      await fetchBoundaries(adminId || undefined);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Delete boundary error:', err);
      setError(err.message || 'Gagal menghapus layer batas.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Layer Batas Wilayah"
      icon={<Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs sm:text-sm border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3.5 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl animate-pulse flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded-lg w-2/3" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/3" />
                  </div>
                </div>
                <div className="h-8 w-20 bg-zinc-300 dark:bg-zinc-700 rounded-xl" />
              </div>
            ))}
          </div>
        ) : boundaries.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Layers className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Belum Ada Layer Batas Wilayah</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Gunakan tombol <strong>+ Upload Batas Wilayah</strong> di halaman Overview untuk mengunggah berkas .zip (Shapefile), .kml, atau .geojson.
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {boundaries.map((b) => {
              const isEditing = editingId === b.id;
              const isSaving = savingId === b.id;
              const isDeleting = deletingId === b.id;

              return (
                <div
                  key={b.id}
                  className="p-3.5 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl flex flex-col gap-3 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Color indicator / picker */}
                      {isEditing ? (
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                          title="Pilih Warna Layer"
                        />
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-white/20"
                          style={{ backgroundColor: b.color || '#06b6d4' }}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-cyan-500 w-full"
                          />
                        ) : (
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {b.name}
                          </h4>
                        )}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {b.total_area_ha?.toLocaleString('id-ID')} ha ({b.feature_count} poligon)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle Visibility */}
                      <button
                        onClick={() => toggleBoundaryVisibility(b.id, !b.is_visible)}
                        className={`p-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          b.is_visible
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                            : 'bg-zinc-100 dark:bg-white/10 text-zinc-500 border-transparent'
                        }`}
                        title={b.is_visible ? 'Sembunyikan Layer' : 'Tampilkan Layer'}
                      >
                        {b.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{b.is_visible ? 'Tampil' : 'Sembunyi'}</span>
                      </button>

                      {/* Edit / Save Button */}
                      {isEditing ? (
                        <button
                          onClick={() => handleSaveEdit(b.id)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Simpan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(b)}
                          className="p-2 rounded-xl text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                          title="Edit Warna / Nama Layer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={isDeleting}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Hapus Layer"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Opacity slider during edit */}
                  {isEditing && (
                    <div className="flex items-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                        Transparansi ({Math.round(editOpacity * 100)}%):
                      </span>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={editOpacity}
                        onChange={(e) => setEditOpacity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}
