'use client';

import { useState, useMemo, useCallback } from 'react';

// ============================================================================
// hooks/useDuplicateScanner.ts: Duplicate Nodes Spatial & Image Detection Hook
// Connects to Standalone API /api/dashboard/nodes for bulk deletion
// Strictly < 250 lines
// ============================================================================

export interface DuplicateGroup {
  key: string;
  title: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  nodes: any[];
}

export function useDuplicateScanner(nodes: any[], onComplete?: () => void) {
  const [detectMode, setDetectMode] = useState<'coordinates' | 'image'>('coordinates');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [deleteError, setDeleteError] = useState('');
  const [deleteComplete, setDeleteComplete] = useState(false);

  // Group by exact or 6-decimal rounded coordinates (~0.1m precision)
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
          nodes: groupNodes.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        }));
    } else {
      const urlMap = new Map<string, any[]>();
      for (const node of nodes) {
        if (!node.image_url) continue;
        if (!urlMap.has(node.image_url)) urlMap.set(node.image_url, []);
        urlMap.get(node.image_url)!.push(node);
      }
      return [...urlMap.entries()]
        .filter(([, groupNodes]) => groupNodes.length > 1)
        .map(([url, groupNodes]) => ({
          key: url,
          title: `Gambar Identik (${groupNodes.length} node)`,
          imageUrl: url,
          nodes: groupNodes.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        }));
    }
  }, [nodes, detectMode]);

  const toggleNode = useCallback((nodeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const selectAllExceptFirst = useCallback((group: DuplicateGroup) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.nodes.forEach((node, index) => {
        if (index === 0) next.delete(node.id);
        else next.add(node.id);
      });
      return next;
    });
  }, []);

  const deselectAllInGroup = useCallback((group: DuplicateGroup) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.nodes.forEach((node) => next.delete(node.id));
      return next;
    });
  }, []);

  const executeBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleteLoading(true);
    setDeleteError('');
    setDeleteProgress({ current: 0, total: selectedIds.size });

    try {
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 10;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const res = await fetch('/api/dashboard/nodes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal menghapus beberapa node duplikat');
        }

        setDeleteProgress({ current: Math.min(i + batchSize, idsToDelete.length), total: idsToDelete.length });
      }

      setDeleteComplete(true);
      setSelectedIds(new Set());
      setIsConfirmOpen(false);
      if (onComplete) onComplete();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus beberapa node duplikat');
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
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
  };
}
