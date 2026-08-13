'use client';

import { useState, useMemo } from 'react';
import { Trash2, Loader2, AlertTriangle, CheckCircle2, Copy, Check, X, MapPin, Image as ImageIcon, Layers } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/ui/Modal';

interface DuplicateNodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  fetchData: () => void;
}

type DuplicateGroup = {
  key: string;
  title: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  nodes: any[];
};

export default function DuplicateNodesModal({
  isOpen,
  onClose,
  nodes,
  fetchData
}: DuplicateNodesModalProps) {
  const { t } = useLanguage();
  const supabase = createClient();

  const [detectMode, setDetectMode] = useState<'coordinates' | 'image'>('coordinates');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [deleteError, setDeleteError] = useState('');
  const [deleteComplete, setDeleteComplete] = useState(false);

  // Map image_url to all node IDs using it (to detect shared images across different coordinates)
  const imageUrlMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const node of nodes) {
      if (!node.image_url) continue;
      if (!map.has(node.image_url)) map.set(node.image_url, []);
      map.get(node.image_url)!.push(node);
    }
    return map;
  }, [nodes]);

  // Grouping by Coordinates (Primary) or by Image URL (Secondary)
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    if (detectMode === 'coordinates') {
      const coordMap = new Map<string, any[]>();
      for (const node of nodes) {
        if (node.latitude == null || node.longitude == null) continue;
        const key = `${parseFloat(node.latitude).toFixed(6)},${parseFloat(node.longitude).toFixed(6)}`;
        if (!coordMap.has(key)) coordMap.set(key, []);
        coordMap.get(key)!.push(node);
      }
      return [...coordMap.entries()]
        .filter(([, groupNodes]) => groupNodes.length > 1)
        .map(([key, groupNodes]) => ({
          key,
          title: `${groupNodes[0].latitude.toFixed(6)}, ${groupNodes[0].longitude.toFixed(6)}`,
          lat: groupNodes[0].latitude,
          lng: groupNodes[0].longitude,
          nodes: groupNodes.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }));
    } else {
      // Group by Image URL
      return [...imageUrlMap.entries()]
        .filter(([, groupNodes]) => groupNodes.length > 1)
        .map(([url, groupNodes]) => ({
          key: url,
          title: `Gambar Identik (${groupNodes.length} node)`,
          imageUrl: url,
          nodes: groupNodes.sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }));
    }
  }, [nodes, detectMode, imageUrlMap]);

  // Count total duplicate groups across both modes for badge indicators
  const coordDuplicatesCount = useMemo(() => {
    const coordMap = new Map<string, number>();
    for (const node of nodes) {
      if (node.latitude == null || node.longitude == null) continue;
      const key = `${parseFloat(node.latitude).toFixed(6)},${parseFloat(node.longitude).toFixed(6)}`;
      coordMap.set(key, (coordMap.get(key) || 0) + 1);
    }
    return [...coordMap.values()].filter(c => c > 1).length;
  }, [nodes]);

  const imageDuplicatesCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of nodes) {
      if (!node.image_url) continue;
      map.set(node.image_url, (map.get(node.image_url) || 0) + 1);
    }
    return [...map.values()].filter(c => c > 1).length;
  }, [nodes]);

  const totalDuplicateNodes = duplicateGroups.reduce((sum, g) => sum + g.nodes.length, 0);

  const toggleNode = (nodeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const selectAllExceptFirst = (group: DuplicateGroup) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      group.nodes.forEach((node, index) => {
        if (index === 0) next.delete(node.id); // Keep the first (oldest)
        else next.add(node.id);
      });
      return next;
    });
  };

  const deselectAllInGroup = (group: DuplicateGroup) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      group.nodes.forEach(node => next.delete(node.id));
      return next;
    });
  };

  const isGroupFullySelected = (group: DuplicateGroup) => {
    return group.nodes.slice(1).every(node => selectedIds.has(node.id));
  };

  const handleDeleteSelected = async () => {
    const nodesToDelete = nodes.filter(n => selectedIds.has(n.id));
    setDeleteLoading(true);
    setDeleteError('');
    setDeleteProgress({ current: 0, total: nodesToDelete.length });

    try {
      for (let i = 0; i < nodesToDelete.length; i++) {
        const node = nodesToDelete[i];
        setDeleteProgress({ current: i + 1, total: nodesToDelete.length });

        // 1. Delete image from storage if no other nodes are using this exact image URL
        const imageSharedCount = (imageUrlMap.get(node.image_url) || []).filter(n => !selectedIds.has(n.id)).length;
        if (node.image_url && imageSharedCount === 0) {
          try {
            await fetch('/api/upload/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: node.image_url })
            });
          } catch {
            // Continue even if image delete fails
          }
        }

        // 2. Delete node from DB
        const { error: nodeError } = await supabase
          .from('spatial_nodes')
          .delete()
          .eq('id', node.id);

        if (nodeError) {
          console.error(`Failed to delete node ${node.id}:`, nodeError);
          continue;
        }

        // 3. Delete orphan location
        if (node.location_id) {
          try {
            await supabase
              .from('locations')
              .delete()
              .eq('id', node.location_id);
          } catch {
            // Location might be shared or already deleted
          }
        }
      }

      setDeleteComplete(true);
      setSelectedIds(new Set());
      setTimeout(() => {
        setIsConfirmOpen(false);
        setDeleteComplete(false);
        onClose();
        fetchData();
      }, 1200);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete nodes.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setIsConfirmOpen(false);
    setDeleteError('');
    setDeleteComplete(false);
    onClose();
  };

  if (!isOpen) return null;

  // Confirm sub-modal
  if (isConfirmOpen) {
    return (
      <Modal
        isOpen={true}
        onClose={() => !deleteLoading && setIsConfirmOpen(false)}
        title={t('confirmBatchDelete') || 'Confirm Batch Deletion'}
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4 mt-2">
            <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto border ${
              deleteComplete
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                : 'bg-red-100 dark:bg-red-500/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
            }`}>
              {deleteComplete ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : deleteLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Trash2 className="w-8 h-8" />
              )}
            </div>
          </div>

          {deleteComplete ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center font-semibold">
              {selectedIds.size === 0 ? deleteProgress.total : selectedIds.size} node berhasil dihapus!
            </p>
          ) : deleteLoading ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center font-medium">
                {t('deletingProgress') || 'Deleting'} {deleteProgress.current} {t('of') || 'of'} {deleteProgress.total}...
              </p>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-red-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">
                {t('batchDeleteWarning') || 'You are about to permanently delete nodes along with their images and locations. This action cannot be undone.'}
              </p>
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-center">
                <span className="text-2xl font-black text-red-600 dark:text-red-400">{selectedIds.size}</span>
                <span className="text-sm text-red-600/80 dark:text-red-400/80 ml-2">node akan dihapus</span>
              </div>
            </>
          )}

          {deleteError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
              {deleteError}
            </div>
          )}

          {!deleteComplete && !deleteLoading && (
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleDeleteSelected}
                className="flex-1 px-5 py-2.5 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('delete') || 'Delete'} ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // Main duplicates modal
  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={
        duplicateGroups.length > 0
          ? `${t('duplicateNodesFound') || 'Duplicate Nodes Detected'} (${totalDuplicateNodes})`
          : (t('checkDuplicates') || 'Check Duplicates')
      }
      icon={<Copy className="w-5 h-5 text-amber-500" />}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
          <button
            onClick={() => setDetectMode('coordinates')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              detectMode === 'coordinates'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            {t('byCoordinates') || 'By Coordinates (Lat/Long)'}
            {coordDuplicatesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {coordDuplicatesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setDetectMode('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              detectMode === 'image'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            {t('byImage') || 'By Image (URL)'}
            {imageDuplicatesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {imageDuplicatesCount}
              </span>
            )}
          </button>
        </div>

        {duplicateGroups.length === 0 ? (
          /* No duplicates found in active mode */
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-[20px] flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {t('noDuplicatesFound') || 'No duplicates found.'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {detectMode === 'coordinates'
                ? (t('noDuplicatesDesc') || 'All nodes have unique coordinates.')
                : 'Tidak ada gambar panorama yang diunggah berulang di beberapa node.'}
            </p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
              <div className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="font-bold">{duplicateGroups.length}</span> {t('duplicateGroups') || 'duplicate groups'} · <span className="font-bold">{totalDuplicateNodes}</span> total node
              </div>
              {selectedIds.size > 0 && (
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {selectedIds.size} {t('selectedForDeletion') || 'selected for deletion'}
                </div>
              )}
            </div>

            {/* Duplicate groups list */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
              {duplicateGroups.map((group) => (
                <div
                  key={group.key}
                  className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-black/20"
                >
                  {/* Group header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-zinc-100/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${detectMode === 'coordinates' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                        {group.title}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        — {group.nodes.length} {t('identicalNodes') || 'identical nodes'}
                      </span>
                    </div>
                    <button
                      onClick={() => isGroupFullySelected(group) ? deselectAllInGroup(group) : selectAllExceptFirst(group)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors shrink-0 ${
                        isGroupFullySelected(group)
                          ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/30'
                      }`}
                    >
                      {isGroupFullySelected(group) ? (t('deselectAll') || 'Deselect all') : (t('selectAllExceptFirst') || 'Select all except first')}
                    </button>
                  </div>

                  {/* Node rows */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {group.nodes.map((node, index) => {
                      const isSelected = selectedIds.has(node.id);
                      const isFirst = index === 0;

                      // Check if this node's image is shared with OTHER nodes at DIFFERENT coordinates
                      const sameImageNodes = imageUrlMap.get(node.image_url) || [];
                      const isSharedImageAcrossCoords = sameImageNodes.some(otherNode => 
                        otherNode.id !== node.id && (
                          parseFloat(otherNode.latitude).toFixed(5) !== parseFloat(node.latitude).toFixed(5) ||
                          parseFloat(otherNode.longitude).toFixed(5) !== parseFloat(node.longitude).toFixed(5)
                        )
                      );

                      return (
                        <div
                          key={node.id}
                          onClick={() => toggleNode(node.id)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-red-50/80 dark:bg-red-500/10'
                              : 'hover:bg-zinc-100/50 dark:hover:bg-white/5'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-red-500 border-red-500 text-white'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          {/* Thumbnail */}
                          <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-black/40 overflow-hidden border border-zinc-200 dark:border-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={node.image_url}
                              alt=""
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium truncate ${
                                isSelected ? 'text-red-600 dark:text-red-400 line-through' : 'text-zinc-900 dark:text-white'
                              }`}>
                                {node.locations?.name || 'Unnamed'}
                              </span>

                              {isFirst && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shrink-0">
                                  ORIGINAL
                                </span>
                              )}

                              {/* Indicator badge for shared image across different Lat/Long */}
                              {isSharedImageAcrossCoords && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1 shrink-0">
                                  <ImageIcon className="w-3 h-3" />
                                  {t('sharedImageTag') || 'Gambar Sama di Lokasi Lain'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                                📍 {node.latitude?.toFixed(5)}, {node.longitude?.toFixed(5)}
                              </span>
                              {node.locations?.company_sections?.name && (
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-500">
                                  · {node.locations.company_sections.name}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                                · {node.created_at ? new Date(node.created_at).toLocaleDateString() : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            node.is_published
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600'
                          }`}>
                            {node.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer action bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {selectedIds.size > 0
                  ? <><span className="font-bold text-red-600 dark:text-red-400">{selectedIds.size}</span> {t('selectedForDeletion') || 'selected for deletion'}</>
                  : 'Pilih node duplikat untuk dihapus'
                }
              </span>
              <button
                onClick={() => setIsConfirmOpen(true)}
                disabled={selectedIds.size === 0}
                className={`px-5 py-2.5 font-bold rounded-xl transition-colors flex items-center text-sm ${
                  selectedIds.size === 0
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    : 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/30'
                }`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deleteSelected') || 'Delete Selected'} {selectedIds.size > 0 && `(${selectedIds.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
