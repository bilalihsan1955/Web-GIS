'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import MapLoadingFallback from '@/components/ui/MapLoadingFallback';
import DashboardShell from '@/components/ui/DashboardShell';
import ViewerModal from '@/components/modal/ViewerModal';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';

// ── Strict Lazy Loading for 360 Viewer ──────────────────────────────
const Viewer360 = dynamic(() => import('@/components/Viewer360'), {
  ssr: false, // Prevents server-side rendering of heavy WebGL/PSV libraries
});

const MapboxGlobe = dynamic(
  () => import('@/components/map/MapboxGlobe'),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

function MapContent({ adminId }: { adminId: string }) {
  return (
    <>
      {/* Layer 1: Map Canvas */}
      <MapboxGlobe adminId={adminId} />

      {/* Layer 2: Glass Overlay Shell */}
      <DashboardShell />

      {/* Layer 3: Old text modal (if still used) */}
      <ViewerModal />

      {/* Layer 4: 360-Degree Panorama Viewer (opens on unclustered point click) */}
      <Viewer360 />
    </>
  );
}

export default function AdminPage() {
  const params = useParams();
  const adminId = params.adminId as string;
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
    <Suspense fallback={<MapLoadingFallback />}>
      <MapContent adminId={adminId} />
    </Suspense>
  );
}
