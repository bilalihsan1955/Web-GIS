'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';
import { Loader2, Share2, Check, Info, Building2, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import MapLoadingFallback from '@/components/ui/MapLoadingFallback';
import MapSidebar from '@/components/ui/MapSidebar';
import CompanyGrid from '@/components/admin/CompanyGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStore } from '@/store/useDashboardStore';

// ── Strict Lazy Loading for Map and Viewer components to prevent SSR errors ──
const MapboxGlobe = dynamic(
  () => import('@/components/map/MapboxGlobe'),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  }
);

const Viewer360 = dynamic(
  () => import('@/components/Viewer360'),
  { ssr: false }
);

export default function PreviewPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const mapInstance = useDashboardStore((s) => s.mapInstance);

  const [slug, setSlug] = useState('');
  const [hasValidCompany, setHasValidCompany] = useState(false);
  const { userRole, adminGroups, selectedCompanyId, setSelectedCompanyId, loading: dashboardLoading, isRoleLoaded, isSuperadminGlobal, isMounted } = useDashboardData();

  const activeCompany = adminGroups.find(g => g.user_id === selectedCompanyId);
  const activeAdminId = (userRole === 'superadmin' && selectedCompanyId !== 'all') 
    ? (activeCompany?.company_slug || selectedCompanyId) 
    : (slug || undefined);

  useEffect(() => {
    async function getUserAndProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Default fallback in case the API call fails
      if (user) {
        setSlug(user.id);
      }

      try {
        const profileRes = await fetch('/api/dashboard/company-profile', { cache: 'no-store' });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile) {
            setHasValidCompany(!!profileData.profile.company_name);
            if (profileData.profile.company_slug) {
              setSlug(profileData.profile.company_slug);
            } else if (profileData.admin_id) {
              setSlug(profileData.admin_id); // Fallback to admin_id if no slug is present
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
      
      setLoading(false);
    }
    getUserAndProfile();
  }, [supabase]);

  const handleCopyLink = () => {
    if (!user || !activeAdminId) return;
    const shareUrl = `${window.location.origin}/${activeAdminId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prevent hydration mismatch by returning a neutral placeholder during SSR and initial hydration
  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center"></div>
    );
  }

  // If Superadmin is in Global Mode, show the Company Grid Directory or its skeleton right away
  if (isSuperadminGlobal) {
    return (
      <div className="animate-fade-in pb-12">
        <CompanyGrid 
          adminGroups={adminGroups} 
          onSelect={setSelectedCompanyId} 
          loading={!isRoleLoaded || loading || dashboardLoading}
        />
      </div>
    );
  }

  if (!isRoleLoaded || loading) {
    return (
      <div className="relative h-[calc(100vh-140px)] w-full rounded-[24px] overflow-hidden border border-zinc-200 dark:border-white/10 shadow-inner bg-zinc-950 flex animate-pulse font-sans">
        {/* Skeleton Map Background */}
        <div className="absolute inset-0 w-full h-full z-0 bg-zinc-900/80">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>
        
        {/* Skeleton Sidebar (Mobile Bottom Drawer & Desktop Left Sidebar matching MapSidebar precisely) */}
        <div className="absolute z-10 flex flex-col bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 md:left-0 md:top-0 md:bottom-0 md:w-[250px] lg:w-[260px] xl:w-[270px] md:border-r md:rounded-none md:h-full left-0 bottom-0 w-full border-t rounded-t-2xl h-[70px] md:h-auto p-4 justify-between">
          <div className="hidden md:flex flex-col gap-4 w-full">
            <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10"></div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-white/10 shrink-0"></div>
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-white/10"></div>
                <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-white/10"></div>
              </div>
            </div>
            <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10 mt-2"></div>
            <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10"></div>
            <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10"></div>
          </div>

          <div className="md:hidden flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-white/10 shrink-0"></div>
              <div className="space-y-1">
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-white/10"></div>
                <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-white/10"></div>
              </div>
            </div>
            <div className="h-5 w-5 rounded bg-zinc-200 dark:bg-white/10"></div>
          </div>

          <div className="hidden md:flex flex-col gap-2 pt-4 border-t border-zinc-200 dark:border-white/10">
            <div className="h-8 w-full rounded-lg bg-zinc-200 dark:bg-white/10"></div>
            <div className="h-8 w-full rounded-lg bg-zinc-200 dark:bg-white/10"></div>
          </div>
        </div>
        
        {/* Zoom / Map Controls Skeleton on Right */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/80 dark:bg-black/60 border border-zinc-200 dark:border-white/10"></div>
          <div className="h-9 w-9 rounded-xl bg-white/80 dark:bg-black/60 border border-zinc-200 dark:border-zinc-800"></div>
        </div>
      </div>
    );
  }



  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-zinc-500 dark:text-zinc-400">
        You must be logged in to view this preview.
      </div>
    );
  }

  const isValidToShare = (userRole === 'superadmin' && selectedCompanyId !== 'all')
    ? !!activeCompany?.company_name
    : hasValidCompany;

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-[24px] overflow-hidden border border-zinc-200 dark:border-white/10 shadow-inner bg-zinc-950 flex">
      {/* Dynamic Map Component restricted to container bounds */}
      <MapboxGlobe adminId={activeAdminId} className="absolute inset-0 w-full h-full z-0" />
      
      {/* Left Navigation Overlay Sidebar (handles both desktop left docking and mobile bottom drawer) */}
      <MapSidebar 
        adminIdOverride={activeAdminId} 
        forceDashboard={true} 
        onBack={userRole === 'superadmin' && selectedCompanyId !== 'all' ? () => setSelectedCompanyId('all') : undefined}
        showShareButton={true}
        shareUrl={typeof window !== 'undefined' && activeAdminId ? `${window.location.origin}/${activeAdminId}` : ''}
        isShareLocked={!isValidToShare}
        shareLockedMessage={t('lockedMsg')}
        onProfileUpdated={(newSlug) => setSlug(newSlug)}
      />

      {/* 360-Degree Panorama Viewer (opens on unclustered point click) */}
      <Viewer360 />
    </div>
  );
}
