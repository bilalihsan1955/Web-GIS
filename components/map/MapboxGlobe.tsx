'use client';

import React, { useEffect } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapbox } from '@/hooks/useMapbox';
import { useMapStore } from '@/store/useMapStore';

/**
 * Primary Mapbox GL JS globe map.
 *
 * This is loaded via `next/dynamic({ ssr: false })` — the import of
 * `mapbox-gl` only happens on the client, avoiding SSR crashes.
 *
 * The heavy lifting lives in `useMapbox` to keep this component thin.
 */
export default function MapboxGlobe({ 
  adminId, 
  shouldAnimate = true, 
  className = "absolute inset-0 h-screen w-full" 
}: { 
  adminId?: string; 
  shouldAnimate?: boolean; 
  className?: string 
}) {
  const { mapContainerRef } = useMapbox({ shouldAnimate });
  const fetchNodes = useMapStore((s) => s.fetchNodes);
  const fetchBoundaries = useMapStore((s) => s.fetchBoundaries);
  const isLoading = useMapStore((s) => s.isLoading);

  // Fetch the live nodes and boundary polygons from Supabase when the map canvas mounts
  useEffect(() => {
    fetchNodes(adminId);
    fetchBoundaries(adminId);
  }, [fetchNodes, fetchBoundaries, adminId]);

  return (
    <>
      <div
        ref={mapContainerRef}
        className={className}
        aria-label="Interactive globe map"
      />
      {isLoading && (
        <div className={`pointer-events-none z-10 bg-slate-200 dark:bg-slate-800 animate-pulse ${className}`} />
      )}
    </>
  );
}
