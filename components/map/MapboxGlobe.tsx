'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapbox } from '@/hooks/useMapbox';

/**
 * Primary Mapbox GL JS globe map.
 *
 * This is loaded via `next/dynamic({ ssr: false })` — the import of
 * `mapbox-gl` only happens on the client, avoiding SSR crashes.
 *
 * The heavy lifting lives in `useMapbox` to keep this component thin.
 */
export default function MapboxGlobe() {
  const { mapContainerRef } = useMapbox();

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 h-screen w-full"
      aria-label="Interactive globe map"
    />
  );
}
