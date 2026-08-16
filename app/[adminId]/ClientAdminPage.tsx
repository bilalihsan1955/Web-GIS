'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowRight, Globe2 } from 'lucide-react';
import DashboardShell from '@/components/ui/DashboardShell';
import ViewerModal from '@/components/modal/ViewerModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ── Strict Lazy Loading for 360 Viewer & MapboxGlobe ──────────────────
const Viewer360 = dynamic(() => import('@/components/Viewer360'), {
  ssr: false,
});

const MapboxGlobe = dynamic(
  () => import('@/components/map/MapboxGlobe'),
  {
    ssr: false,
  }
);

function MapContent({ adminId, shouldAnimate }: { adminId: string; shouldAnimate: boolean }) {
  return (
    <>
      {/* Layer 1: Map Canvas */}
      <MapboxGlobe adminId={adminId} shouldAnimate={shouldAnimate} />

      {/* Layer 2: Glass Overlay Shell */}
      <DashboardShell />

      {/* Layer 3: Text modal */}
      <ViewerModal />

      {/* Layer 4: 360-Degree Panorama Viewer */}
      <Viewer360 />
    </>
  );
}

export default function ClientAdminPage({ adminId }: { adminId: string }) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const originalTheme = useRef<string | undefined>(undefined);
  const [showMap, setShowMap] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<{ company_name?: string; company_description?: string; company_logo?: string } | null>(null);

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
  }, [setTheme, theme]);

  useEffect(() => {
    async function fetchProfile() {
      setLoadingProfile(true);
      try {
        const res = await fetch(`/api/public/company-profile?slug=${encodeURIComponent(adminId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
          }
        }
      } catch (err) {
        console.error('Error fetching public company profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchProfile();
  }, [adminId]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0A0A0A]">
      {/* Background Layer: Preloaded Map Content initialized silently behind Landing Page */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Suspense fallback={null}>
          <MapContent adminId={adminId} shouldAnimate={showMap} />
        </Suspense>
      </div>

      {/* Foreground Layer: Landing Page Overlay replacing initial loading/initialization screen */}
      <div 
        className={`fixed inset-0 z-50 min-h-[100dvh] bg-[#0A0A0A] font-sans text-zinc-50 selection:bg-cyan-900 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 transition-all duration-700 ease-in-out ${
          showMap 
            ? 'opacity-0 pointer-events-none scale-105' 
            : 'opacity-100 pointer-events-auto scale-100'
        }`}
      >
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] sm:h-[500px] bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none -z-10" />

        <main className="w-full max-w-4xl mx-auto flex flex-col items-center text-center z-10 my-auto">
          
          {loadingProfile ? (
            <>
              {/* Skeleton Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-2xl bg-zinc-800/80 border border-white/10 animate-pulse" />

              {/* Skeleton Title */}
              <div className="h-9 sm:h-12 w-64 sm:w-96 mb-4 sm:mb-6 rounded-2xl bg-zinc-800/80 animate-pulse" />

              {/* Skeleton Subtitle */}
              <div className="flex flex-col items-center gap-2.5 w-full max-w-2xl mb-8 sm:mb-12 px-2">
                <div className="h-4 w-5/6 rounded-lg bg-zinc-800/80 animate-pulse" />
                <div className="h-4 w-3/4 rounded-lg bg-zinc-800/80 animate-pulse" />
              </div>

              {/* Skeleton Button */}
              <div className="w-48 h-[52px] rounded-full bg-zinc-800/80 border border-white/10 animate-pulse" />
            </>
          ) : (
            <>
              {/* Logo or Icon */}
              {profile?.company_logo ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-2xl overflow-hidden bg-white/10 p-2 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-center">
                  <Image 
                    src={profile.company_logo} 
                    alt={profile.company_name || 'Logo'} 
                    width={96} 
                    height={96} 
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-2xl overflow-hidden bg-white/10 p-2 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-center relative">
                  <Image src="/Logo dark.png" alt={profile?.company_name || 'Logo'} width={96} height={96} className="w-full h-full object-contain hidden dark:block" />
                  <Image src="/Logo light.png" alt={profile?.company_name || 'Logo'} width={96} height={96} className="w-full h-full object-contain block dark:hidden" />
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-4 sm:mb-6">
                {profile?.company_name || t('indexTitle') || 'Data'}
              </h1>

              {/* Subtitle / Description */}
              <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed mb-8 sm:mb-12 px-2">
                {profile?.company_description || t('indexSubtitle') || 'Platform cerdas untuk memetakan, mengelola, dan memvisualisasikan aset spasial perusahaan Anda dalam lingkungan 3D interaktif.'}
              </p>

              {/* CTA Button: Start Now / Mulai Sekarang */}
              <button
                onClick={() => setShowMap(true)}
                className="group min-h-[52px] flex items-center justify-center gap-3 px-8 sm:px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-full font-bold text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/20 cursor-pointer"
              >
                {t('startNow') || 'Mulai Sekarang'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
