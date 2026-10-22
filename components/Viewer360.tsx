'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useMapStore } from '@/store/useMapStore';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/GlobalComponents';

// ============================================================================
// components/Viewer360.tsx: 360° Equirectangular Panorama Viewer
// Adheres strictly to < 250 lines rule & Sentence Case UI
// Employs standard system Modal and suppresses PSV native overlay
// ============================================================================

export default function Viewer360() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const currentPath = useRef<string | null>(null);

  const isViewerOpen = useMapStore((s) => s.isViewerOpen);
  const activeNode = useMapStore((s) => s.activeNode);
  const nodes = useMapStore((s) => s.nodes);
  const closeViewer = useMapStore((s) => s.closeViewer);
  const goToNextNode = useMapStore((s) => s.goToNextNode);
  const goToPrevNode = useMapStore((s) => s.goToPrevNode);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Image Preflight Probe & Error Detection
  useEffect(() => {
    if (!isViewerOpen || !activeNode?.image_url) return;
    setErrorMessage(null);
    setIsLoading(true);

    const probe = new window.Image();
    probe.onload = () => {
      // Image accessible
    };
    probe.onerror = () => {
      if (viewerRef.current) viewerRef.current.hideError();
      setIsLoading(false);
      setErrorMessage('Berkas foto panorama tidak ditemukan pada server (404) atau format tidak didukung.');
    };
    probe.src = activeNode.image_url;
  }, [isViewerOpen, activeNode?.image_url]);

  // 2. Photo Sphere Viewer Lifecycle & Event Listeners
  useEffect(() => {
    if (!isViewerOpen || !containerRef.current || !activeNode?.image_url) return;
    if (viewerRef.current) return;

    currentPath.current = activeNode.image_url;

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: activeNode.image_url,
      navbar: false,
      loadingImg: '',
      loadingTxt: '',
      defaultYaw: '130deg',
      defaultPitch: 0,
    });

    viewer.addEventListener('ready', () => {
      setIsLoading(false);
      setErrorMessage(null);
    });
    viewer.addEventListener('panorama-loaded', () => {
      setIsLoading(false);
      setErrorMessage(null);
    });
    viewer.addEventListener('panorama-error', () => {
      viewer.hideError();
      setIsLoading(false);
      setErrorMessage('Berkas foto panorama tidak ditemukan pada server (404) atau format tidak didukung.');
    });

    viewerRef.current = viewer;

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      currentPath.current = null;
    };
  }, [isViewerOpen, activeNode?.image_url]);

  // 3. Update Panorama when Active Node Changes
  useEffect(() => {
    if (viewerRef.current && activeNode?.image_url) {
      if (currentPath.current === activeNode.image_url) return;

      currentPath.current = activeNode.image_url;
      setIsLoading(true);
      setErrorMessage(null);

      viewerRef.current
        .setPanorama(activeNode.image_url)
        .then(() => {
          setIsLoading(false);
          setErrorMessage(null);
        })
        .catch(() => {
          if (viewerRef.current) viewerRef.current.hideError();
          setIsLoading(false);
          setErrorMessage('Berkas foto panorama tidak ditemukan pada server (404) atau format tidak didukung.');
        });
    }
  }, [activeNode]);

  // 4. Background Preloading for Adjacent Nodes
  useEffect(() => {
    if (!activeNode || nodes.length <= 1) return;
    const currentIndex = nodes.findIndex((n) => n.id === activeNode.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % nodes.length;
    const prevIndex = (currentIndex - 1 + nodes.length) % nodes.length;

    const imgNext = new window.Image();
    imgNext.src = nodes[nextIndex].image_url;
    const imgPrev = new window.Image();
    imgPrev.src = nodes[prevIndex].image_url;
  }, [activeNode, nodes]);

  if (!isViewerOpen || !activeNode) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-black select-none">
      {/* WebGL Canvas Container with Native Overlay Suppressed */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 [&_.psv-overlay]:!hidden [&_.psv-notification]:!hidden"
        style={{ height: '100vh', width: '100vw', display: 'block' }}
      />

      {/* Standard System Modal for Missing or Corrupted Panorama */}
      <Modal
        isOpen={Boolean(errorMessage && !isLoading)}
        onClose={closeViewer}
        maxWidth="max-w-md"
        title="Foto panorama tidak tersedia"
        icon={
          <div className="p-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Berkas foto untuk lokasi <strong className="text-zinc-900 dark:text-white font-semibold">"{activeNode.locationName || 'Lokasi'}"</strong> tidak ditemukan pada penyimpanan server (404) atau tautan tidak valid.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="secondary" size="sm" onClick={closeViewer}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali ke peta
            </Button>
            {nodes.length > 1 && (
              <Button variant="primary" size="sm" onClick={goToNextNode}>
                Titik berikutnya
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && !errorMessage && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-8 py-6 text-white backdrop-blur-md">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium tracking-wider">Memuat panorama...</span>
          </div>
        </div>
      )}

      {/* Glassmorphism Controls Overlay */}
      <div className="pointer-events-none absolute inset-0 z-[100]">
        {/* Back Button */}
        <button
          onClick={closeViewer}
          className="pointer-events-auto absolute top-6 left-6 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          aria-label="Kembali ke peta"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Kembali ke peta</span>
        </button>

        {/* Date Display */}
        {activeNode.captureDate && (
          <div className="absolute top-6 right-6 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-md">
            <span className="text-sm font-medium tracking-wide">{activeNode.captureDate}</span>
          </div>
        )}

        {/* Previous Node */}
        {nodes.length > 1 && (
          <button
            onClick={goToPrevNode}
            className="pointer-events-auto absolute top-1/2 left-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
            aria-label="Titik sebelumnya"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next Node */}
        {nodes.length > 1 && (
          <button
            onClick={goToNextNode}
            className="pointer-events-auto absolute top-1/2 right-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
            aria-label="Titik berikutnya"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Location Name */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-xl border border-white/10 bg-black/40 px-6 py-3 text-white shadow-lg backdrop-blur-md">
          <h2 className="text-sm font-semibold text-white/90">{activeNode.locationName}</h2>
        </div>
      </div>
    </div>
  );
}
