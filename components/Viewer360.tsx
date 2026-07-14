'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useMapStore } from '@/store/useMapStore';

export default function Viewer360() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 1. Use a single Ref for the Viewer Instance
  const viewerRef = useRef<Viewer | null>(null);
  const currentPath = useRef<string | null>(null);

  const isViewerOpen = useMapStore((s) => s.isViewerOpen);
  const activeNode = useMapStore((s) => s.activeNode);
  const closeViewer = useMapStore((s) => s.closeViewer);
  const goToNextNode = useMapStore((s) => s.goToNextNode);
  const goToPrevNode = useMapStore((s) => s.goToPrevNode);

  const [isLoading, setIsLoading] = useState(true);

  // 2. Decouple Viewer Instantiation from Data Loading
  useEffect(() => {
    if (!isViewerOpen || !containerRef.current || !activeNode?.image_url) return;
    
    // Safeguard: Prevent double instantiation
    if (viewerRef.current) return;

    // Track the initial load to prevent the second useEffect from double-fetching
    currentPath.current = activeNode.image_url;
    console.log('[DEBUG] Initialising Viewer with panorama:', activeNode.image_url);

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: activeNode.image_url,
      navbar: false, // Disable default UI toolbar for our custom glassmorphism UI
      loadingImg: '', // Disables native PSV loading spinner
      loadingTxt: '', // Disables native PSV loading text
      defaultYaw: '130deg',
      defaultPitch: 0,
    });

    viewer.addEventListener('ready', () => setIsLoading(false));
    viewer.addEventListener('panorama-loaded', () => setIsLoading(false));

    viewerRef.current = viewer;

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      currentPath.current = null;
    };
  }, [isViewerOpen]); // ONLY triggers when opening/closing the modal

  // SEPARATE useEffect ONLY for updating the panorama
  useEffect(() => {
    if (viewerRef.current && activeNode?.image_url) {
      // 4. Debug the Double Request & Prevent Race Condition
      if (currentPath.current === activeNode.image_url) {
        console.log('[DEBUG] Skipping duplicate load for:', activeNode.image_url);
        return; 
      }
      
      console.log('[DEBUG] Setting NEW panorama:', activeNode.image_url);
      currentPath.current = activeNode.image_url;
      
      setIsLoading(true);
      
      viewerRef.current.setPanorama(activeNode.image_url).catch((err) => {
        console.error('Failed to set panorama:', err);
        setIsLoading(false); // Hide spinner if it fails
      });
    }
  }, [activeNode]);

  // Background Preloading for Adjacent Nodes
  useEffect(() => {
    if (!activeNode) return;
    const nodes = useMapStore.getState().nodes;
    if (nodes.length <= 1) return;
    
    const currentIndex = nodes.findIndex((n) => n.id === activeNode.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % nodes.length;
    const prevIndex = (currentIndex - 1 + nodes.length) % nodes.length;
    
    const imgNext = new window.Image();
    imgNext.src = nodes[nextIndex].image_url;
    
    const imgPrev = new window.Image();
    imgPrev.src = nodes[prevIndex].image_url;
  }, [activeNode]);

  if (!isViewerOpen || !activeNode) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-black">
      {/* 3. Fix CSS Rendering (The "Blank UI" Fix): Explicitly set height/width directly on the container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-0"
        style={{ height: '100vh', width: '100vw', display: 'block' }} 
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-8 py-6 text-white backdrop-blur-md">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
            <span className="text-sm font-medium tracking-wider">Loading panorama...</span>
          </div>
        </div>
      )}

      {/* ── Custom Glassmorphism UI Overlay ──────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-[100]">
        {/* Top Left: Back/Exit Button */}
        <button
          onClick={closeViewer}
          className="pointer-events-auto absolute top-6 left-6 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          aria-label="Exit Viewer"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Back to Map</span>
        </button>

        {/* Top Right: Date Display */}
        <div className="absolute top-6 right-6 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-md">
          <span className="text-sm font-medium tracking-wide">
            {activeNode.captureDate}
          </span>
        </div>

        {/* Center Left: Previous Node */}
        <button
          onClick={goToPrevNode}
          className="pointer-events-auto absolute top-1/2 left-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          aria-label="Previous Node"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Center Right: Next Node */}
        <button
          onClick={goToNextNode}
          className="pointer-events-auto absolute top-1/2 right-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
          aria-label="Next Node"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Bottom Center: Location Name */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-xl border border-white/10 bg-black/40 px-6 py-3 text-white shadow-lg backdrop-blur-md">
          <h2 className="text-sm font-semibold text-white/90">
            {activeNode.locationName}
          </h2>
        </div>
      </div>
    </div>
  );
}
