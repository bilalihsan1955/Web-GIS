'use client';

import { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Tag, FileText } from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';
import Modal from '@/components/ui/Modal';

/**
 * Lazy-load the Leaflet map sub-component with `ssr: false`
 * because Leaflet accesses `window` on import.
 */
const LeafletMiniMap = dynamic(() => import('./LeafletMiniMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl bg-black/30">
      <div className="flex flex-col items-center gap-2">
        <MapPin className="h-5 w-5 text-text-muted animate-pulse" />
        <span className="text-xs text-text-muted">Loading map…</span>
      </div>
    </div>
  ),
});

/**
 * Glassmorphism modal for viewing spatial node details.
 * Contains feature metadata and an embedded Leaflet 2D micro-map.
 */
export default function ViewerModal() {
  const isModalOpen = useDashboardStore((s) => s.isModalOpen);
  const selectedFeature = useDashboardStore((s) => s.selectedFeature);
  const closeModal = useDashboardStore((s) => s.closeModal);

  // ── Escape key handler ──────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    },
    [closeModal],
  );

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isModalOpen, handleKeyDown]);

  if (!isModalOpen || !selectedFeature) return null;

  const { coordinates, properties } = selectedFeature;

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={
        <div className="flex flex-col text-left">
          <span className="text-base font-semibold text-zinc-900 dark:text-white">
            {properties.locationName}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono mt-0.5">
            {coordinates[1].toFixed(4)}°, {coordinates[0].toFixed(4)}°
          </span>
        </div>
      }
      icon={<MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidth="max-w-lg"
      noPadding={true}
    >
      <div className="flex flex-col bg-white dark:bg-zinc-900 h-full">
        {/* Leaflet 2D Micro-Map */}
        <div className="h-52 w-full border-b border-zinc-200 dark:border-white/10 shrink-0">
          <LeafletMiniMap
            center={[coordinates[1], coordinates[0]]}
            zoom={13}
          />
        </div>

        {/* Metadata */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">
                Description
              </p>
              <p className="text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed">
                {properties.section || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tag className="h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">
                Category
              </p>
              <span className="inline-flex items-center rounded-md bg-cyan-50 dark:bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-200 dark:ring-cyan-500/20">
                {properties.locationGroup}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-white/10 px-6 py-4 mt-auto">
          <p className="text-[10px] text-zinc-500 text-center">
            Press <kbd className="rounded bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-white/5">Esc</kbd> to close
          </p>
        </div>
      </div>
    </Modal>
  );
}
