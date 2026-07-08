'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import MapLoadingFallback from '@/components/ui/MapLoadingFallback';
import DashboardShell from '@/components/ui/DashboardShell';
import ViewerModal from '@/components/modal/ViewerModal';

// ── Strict Lazy Loading for 360 Viewer ──────────────────────────────
const Viewer360 = dynamic(() => import('@/components/Viewer360'), {
  ssr: false, // Prevents server-side rendering of heavy WebGL/PSV libraries
});

/**
 * Lazy-load the Mapbox globe with `ssr: false`.
 *
 * Mapbox GL JS requires browser APIs (WebGL, `window`, `document`).
 * Dynamic import ensures the ~800 KB library only loads on the client
 * and is excluded from the server-rendered initial HTML.
 */
const MapboxGlobe = dynamic(
  () => import('@/components/map/MapboxGlobe'),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

/**
 * Dashboard page — assembles the three layers:
 *   1. Full-screen Mapbox globe (fixed, z-0)
 *   2. Glassmorphism overlay panels (fixed, z-10)
 *   3. Viewer modal (fixed, z-50, conditional)
 */
export default function DashboardPage() {
  const { theme, setTheme } = useTheme();
  const originalTheme = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (originalTheme.current === undefined) {
      originalTheme.current = theme;
    }
    
    if (theme !== 'dark') {
      setTheme('dark');
    }

    return () => {
      if (originalTheme.current === 'light') {
        setTheme('light');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Layer 1: Map Canvas */}
      <MapboxGlobe />

      {/* Layer 2: Glass Overlay Shell */}
      <DashboardShell />

      {/* Layer 3: Old text modal (if still used) */}
      <ViewerModal />

      {/* Layer 4: 360-Degree Panorama Viewer (opens on unclustered point click) */}
      <Viewer360 />
    </>
  );
}
