'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [isValidating, setIsValidating] = useState(true);
  const [errorState, setErrorState] = useState<{ type: '404' | '403', message: string } | null>(null);

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

  useEffect(() => {
    async function validateSlug() {
      try {
        const res = await fetch(`/api/public/company-profile?slug=${adminId}`);
        if (!res.ok) {
          if (res.status === 403) {
            setErrorState({
              type: '403',
              message: 'Halaman ini harus diakses menggunakan URL Tautan Khusus (Slug) perusahaan Anda, bukan menggunakan ID bawaan.'
            });
          } else {
            setErrorState({
              type: '404',
              message: 'Tautan mungkin salah atau perusahaan belum terdaftar.'
            });
          }
        }
      } catch (err) {
        setErrorState({
          type: '404',
          message: 'Terjadi kesalahan saat memvalidasi halaman.'
        });
      } finally {
        setIsValidating(false);
      }
    }
    validateSlug();
  }, [adminId]);

  if (isValidating) {
    return <MapLoadingFallback />;
  }

  if (errorState) {
    const is404 = errorState.type === '404';
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-center px-4">
        {is404 ? (
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
          {is404 ? 'Halaman Tidak Ditemukan' : 'Akses Ditolak'}
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">{errorState.message}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<MapLoadingFallback />}>
      <MapContent adminId={adminId} />
    </Suspense>
  );
}
