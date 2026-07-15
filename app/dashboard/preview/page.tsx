'use client';

import { useEffect, useState } from 'react';
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
  const { userRole, adminGroups, selectedCompanyId, setSelectedCompanyId, loading: dashboardLoading, isRoleLoaded } = useDashboardData();

  useEffect(() => {
    async function getUserAndProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Default fallback in case the API call fails
      if (user) {
        setSlug(user.id);
      }

      try {
        const profileRes = await fetch('/api/dashboard/company-profile');
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
    if (!user) return;
    const finalSlug = (userRole === 'superadmin' && selectedCompanyId !== 'all') ? selectedCompanyId : slug;
    const shareUrl = `${window.location.origin}/${finalSlug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isRoleLoaded || loading) {
    return (
      <div className="relative h-[calc(100vh-140px)] w-full rounded-[24px] overflow-hidden border border-zinc-200 dark:border-white/10 shadow-inner bg-zinc-950 flex animate-pulse">
        {/* Skeleton Map Background */}
        <div className="absolute inset-0 w-full h-full z-0 bg-zinc-200 dark:bg-zinc-800/80"></div>
        
        {/* Skeleton Sidebar (Mobile & Desktop) */}
        <div className="absolute left-0 bottom-0 md:top-0 md:bottom-0 w-full md:w-[340px] h-[70px] md:h-full z-10 bg-white/60 dark:bg-black/40 border-t md:border-t-0 md:border-r border-zinc-200 dark:border-white/10 rounded-t-2xl md:rounded-none"></div>
        
        {/* Skeleton Buttons */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
           <div className="h-11 w-11 rounded-xl bg-zinc-300 dark:bg-white/10"></div>
           <div className="h-11 w-44 rounded-xl bg-zinc-300 dark:bg-white/10"></div>
        </div>
      </div>
    );
  }

  // If Superadmin is in Global Mode, show the Company Grid Directory
  if (userRole === 'superadmin' && selectedCompanyId === 'all') {
    return (
      <div className="animate-fade-in pb-12">
        <CompanyGrid 
          adminGroups={adminGroups} 
          onSelect={setSelectedCompanyId} 
          loading={dashboardLoading}
        />
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

  const activeCompany = adminGroups.find(g => g.user_id === selectedCompanyId);
  const activeAdminId = (userRole === 'superadmin' && selectedCompanyId !== 'all') 
    ? (activeCompany?.company_slug || selectedCompanyId) 
    : (slug || undefined);

  const isValidToShare = (userRole === 'superadmin' && selectedCompanyId !== 'all')
    ? !!activeCompany?.company_name
    : hasValidCompany;

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-[24px] overflow-hidden border border-zinc-200 dark:border-white/10 shadow-inner bg-zinc-950 flex">
      {/* Dynamic Map Component restricted to container bounds */}
      <MapboxGlobe adminId={activeAdminId} className="absolute inset-0 w-full h-full z-0" />
      
      {/* Left Navigation Overlay Sidebar (fits nicely inside container) */}
      <div className="absolute inset-y-0 left-0 z-10 pointer-events-none md:h-full">
        <MapSidebar adminIdOverride={activeAdminId} forceDashboard={true} />
      </div>

      {/* Superadmin Impersonation Floating Header */}
      {userRole === 'superadmin' && selectedCompanyId !== 'all' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center pointer-events-auto">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 rounded-full pl-2 pr-5 py-2 shadow-xl flex items-center gap-3">
             <button 
              onClick={() => setSelectedCompanyId('all')}
              className="group flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-full transition-colors"
             >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              {t('backToCompanies') || 'Kembali ke Daftar Perusahaan'}
             </button>
             <div className="w-px h-6 bg-zinc-700/50"></div>
             <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                {activeCompany?.company_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeCompany.company_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-4 h-4 text-zinc-400" />
                )}
             </div>
             <strong className="text-sm text-white font-bold whitespace-nowrap">{activeCompany?.company_name || 'Tanpa Nama'}</strong>
          </div>
        </div>
      )}

      {/* Floating Share Link Button in Top Right */}
      <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Share Button */}
          {!isValidToShare ? (
            <div className="flex flex-col items-end gap-3">
              <button
                disabled
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-400 bg-zinc-800/80 backdrop-blur-md rounded-xl transition-all shadow-inner border border-zinc-700/50 cursor-not-allowed"
              >
                <Share2 className="w-4 h-4 opacity-50" />
                {t('shareGuestMap')}
                <span className="ml-2 text-[11px] font-bold bg-zinc-700/80 px-2 py-0.5 rounded text-zinc-400">{t('locked')}</span>
              </button>
              
              {/* Notification Box explaining why it is locked */}
              <div className="bg-zinc-900/95 backdrop-blur border border-amber-500/30 rounded-xl p-3 shadow-xl max-w-[280px] animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex gap-2">
                   <div className="text-amber-400 mt-0.5 shrink-0"><Info className="w-4 h-4"/></div>
                   <p className="text-xs text-zinc-300 leading-relaxed">
                     {t('lockedMsg')}
                   </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] border border-cyan-400/20"
            >
            {copied ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                {t('copiedLink')}
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                {t('shareGuestMap')}
              </>
            )}
            </button>
          )}
        </div>
      </div>

      {/* 360-Degree Panorama Viewer (opens on unclustered point click) */}
      <Viewer360 />
    </div>
  );
}
