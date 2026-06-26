'use client';

import { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Tag, FileText } from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';

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
    // ── Backdrop ────────────────────────────────────────────────────
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewer: ${properties.name}`}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* ── Modal Card ──────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        <div className="glass-card overflow-hidden shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/15">
                <MapPin className="h-5 w-5 text-accent-cyan" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  {properties.name}
                </h2>
                <p className="text-[11px] text-text-muted font-mono">
                  {coordinates[1].toFixed(4)}°, {coordinates[0].toFixed(4)}°
                </p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="glass-button flex h-8 w-8 items-center justify-center rounded-lg"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 text-text-secondary" />
            </button>
          </div>

          {/* Leaflet 2D Micro-Map */}
          <div className="h-52 w-full border-b border-white/8">
            <LeafletMiniMap
              center={[coordinates[1], coordinates[0]]}
              zoom={13}
            />
          </div>

          {/* Metadata */}
          <div className="space-y-3 px-6 py-5">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <p className="text-xs font-medium text-text-secondary mb-0.5">
                  Description
                </p>
                <p className="text-sm text-text-primary leading-relaxed">
                  {properties.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <p className="text-xs font-medium text-text-secondary mb-0.5">
                  Category
                </p>
                <span className="inline-flex items-center rounded-md bg-accent-cyan/10 px-2.5 py-0.5 text-xs font-medium text-accent-cyan ring-1 ring-inset ring-accent-cyan/20">
                  {properties.category}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/8 px-6 py-3">
            <p className="text-[10px] text-text-muted text-center">
              Press <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-text-secondary font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
