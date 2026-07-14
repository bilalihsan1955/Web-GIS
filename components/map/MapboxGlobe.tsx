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
export default function MapboxGlobe({ adminId, className = "absolute inset-0 h-screen w-full" }: { adminId?: string; className?: string }) {
  const { mapContainerRef } = useMapbox();
  const fetchNodes = useMapStore((s) => s.fetchNodes);

  // Fetch the live nodes from Supabase when the map canvas mounts
  useEffect(() => {
    fetchNodes(adminId);
  }, [fetchNodes, adminId]);

  return (
    <div
      ref={mapContainerRef}
      className={className}
      aria-label="Interactive globe map"
    />
  );
}
