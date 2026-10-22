'use client';

import React from 'react';
import { Trash2, AlertTriangle, CheckCircle2, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button, Badge, ConfirmDialog } from '@/components/ui/GlobalComponents';
import { useDuplicateScanner, DuplicateGroup } from '@/hooks/useDuplicateScanner';

// ============================================================================
// components/admin/DuplicateNodesModal.tsx: Pure UI Duplicate Scanner (< 190 lines)
// Clean Architecture: Uses useDuplicateScanner hook for spatial & image calculations
// ============================================================================

interface DuplicateNodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  fetchData: () => void;
}

export default function DuplicateNodesModal({
  isOpen,
  onClose,
  nodes,
  fetchData,
}: DuplicateNodesModalProps) {
  const {
    detectMode,
    setDetectMode,
    duplicateGroups,
    selectedIds,
    toggleNode,
    selectAllExceptFirst,
    deselectAllInGroup,
    isConfirmOpen,
    setIsConfirmOpen,
    deleteLoading,
    deleteProgress,
    deleteError,
    deleteComplete,
    setDeleteComplete,
    executeBulkDelete,
  } = useDuplicateScanner(nodes, fetchData);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pemindai Titik Node Duplikat"
        icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDetectMode('coordinates')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  detectMode === 'coordinates'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Koordinat identik
              </button>
              <button
                type="button"
                onClick={() => setDetectMode('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  detectMode === 'image'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Gambar identik
              </button>
            </div>
            <span className="text-xs text-zinc-500 font-medium">
              {duplicateGroups.length} grup terdeteksi
            </span>
          </div>

          {deleteError && (
            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {deleteError}
            </p>
          )}

          {/* Duplicate Groups List */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {duplicateGroups.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Tidak ditemukan titik duplikat
                </p>
                <p className="text-xs text-zinc-500">
                  Seluruh titik panorama memiliki {detectMode === 'coordinates' ? 'koordinat unik' : 'gambar unik'}.
                </p>
              </div>
            ) : (
              duplicateGroups.map((group) => (
                <div
                  key={group.key}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {group.title} ({group.nodes.length} node)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => selectAllExceptFirst(group)}
                        className="text-[11px] text-cyan-600 hover:underline font-medium"
                      >
                        Pilih semua kecuali tertua
                      </button>
                      <button
                        type="button"
                        onClick={() => deselectAllInGroup(group)}
                        className="text-[11px] text-zinc-500 hover:underline"
                      >
                        Batal pilih
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {group.nodes.map((node, idx) => (
                      <div
                        key={node.id}
                        onClick={() => toggleNode(node.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          selectedIds.has(node.id)
                            ? 'bg-red-50/60 dark:bg-red-950/20 border-red-300 dark:border-red-900/40'
                            : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(node.id)}
                            onChange={() => toggleNode(node.id)}
                            className="w-3.5 h-3.5 rounded text-red-600 cursor-pointer"
                          />
                          <span className="truncate text-zinc-800 dark:text-zinc-200 font-medium text-[11px]">
                            {node.locations?.name || 'Tanpa nama lokasi'}
                          </span>
                          {idx === 0 && <Badge variant="success">Pertama dibuat</Badge>}
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {node.created_at ? new Date(node.created_at).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500">
              {selectedIds.size} titik dipilih untuk dihapus
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Tutup
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus ({selectedIds.size})
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeBulkDelete}
        isLoading={deleteLoading}
        title="Hapus titik node terpilih?"
        message={`Anda akan menghapus ${selectedIds.size} titik node duplikat. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={`Hapus ${selectedIds.size} titik`}
        variant="danger"
      />
    </>
  );
}
