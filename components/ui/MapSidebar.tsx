'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Radio, Edit3, X, Check, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { useMapStore, ADMIN_SLUG_MAP } from '@/store/useMapStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ManageSectionsModal from '@/components/admin/ManageSectionsModal';
import Modal from '@/components/ui/Modal';

export default function MapSidebar({ adminIdOverride, forceDashboard }: { adminIdOverride?: string, forceDashboard?: boolean } = {}) {
  const params = useParams();
  const adminId = adminIdOverride || (params.adminId as string);
  const companyProfiles = useMapStore((s) => s.companyProfiles);
  const [userId, setUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<{company_name?: string, company_description?: string, company_logo?: string} | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compIcon, setCompIcon] = useState('');
  const [showToast, setShowToast] = useState(false);
  const isDashboard = forceDashboard !== undefined ? forceDashboard : !adminId;
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    async function getSessionAndProfile() {
      if (adminId && !forceDashboard) {
        // We are on the public guest page, fetch using public API
        try {
          const res = await fetch(`/api/public/company-profile?slug=${adminId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.profile) setProfile(data.profile);
          }
        } catch (err) {
          console.error('Error fetching public profile:', err);
        }
      } else {
        // We are inside the dashboard, fetch using dashboard API
        // if forceDashboard is true but adminId is present, we still want to fetch dashboard API
        // WAIT: if forceDashboard is true but adminIdOverride is passed (Superadmin viewing specific company),
        // we should probably fetch the specific company profile?
        // Wait! `/api/dashboard/company-profile` fetches the profile of the current logged-in user.
        // If superadmin is viewing a specific company, `/api/dashboard/company-profile` might return the superadmin's profile, NOT the target company's profile.
        // Let's use the public API if we are forcing dashboard but have an adminId, OR we should pass adminId to dashboard API.
        try {
          let url = '/api/dashboard/company-profile';
          if (forceDashboard && adminId) {
            url = `/api/public/company-profile?slug=${adminId}`;
          }
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.profile) setProfile(data.profile);
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      }
      setIsLoadingProfile(false);
    }
    getSessionAndProfile();
  }, [adminId, forceDashboard]);

  const handleOpenEdit = () => {
    setCompName(profile?.company_name || '');
    setCompDesc(profile?.company_description || '');
    setCompIcon(profile?.company_logo || '');
    setIsEditModalOpen(true);
  };

  const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload-logo', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) setCompIcon(data.url);
        else alert('Gagal mengupload logo: ' + data.error);
      } catch (err) {
        alert('Gagal mengupload logo.');
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/dashboard/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: compName, company_description: compDesc, company_logo: compIcon })
      });
      if (res.ok) {
        setProfile({ company_name: compName, company_description: compDesc, company_logo: compIcon });
        setIsEditModalOpen(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        const data = await res.json();
        alert('Gagal menyimpan profil: ' + data.error);
      }
    } catch (err) {
      alert('Gagal menyimpan profil.');
    }
  };

  const displayName = (mounted && profile?.company_name) ? profile.company_name : 'GeoSpatial Dashboard';
  const displayDesc = (mounted && profile?.company_description) ? profile.company_description : 'Real-time Node Monitoring';
  const displayIcon = (mounted && profile?.company_logo) ? profile.company_logo : null;

  const nodes = useMapStore((s) => s.nodes);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const activeSection = useMapStore((s) => s.activeSection);
  const setActiveSection = useMapStore((s) => s.setActiveSection);
  const openViewer = useMapStore((s) => s.openViewer);
  const isLoading = useMapStore((s) => s.isLoading);
  const mapInstance = useDashboardStore((s) => s.mapInstance);

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Extract unique locations from nodes to display in the log.
  const uniqueLocations = useMemo(() => {
    const locMap = new Map();
    nodes.forEach(node => {
      if (!locMap.has(node.locationName)) {
        locMap.set(node.locationName, node);
      }
    });
    return Array.from(locMap.values());
  }, [nodes]);

  // Extract sections dynamically from nodes
  const dynamicSections = useMemo(() => {
    const sectionSet = new Set<string>();
    nodes.forEach(node => {
      if (node.section) sectionSet.add(node.section);
    });
    return ['ALL', ...Array.from(sectionSet)];
  }, [nodes]);

  const filteredLocations = useMemo(() => {
    return uniqueLocations.filter(loc => {
      const matchesSearch = loc.locationName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesSection = true;
      if (activeSection !== 'ALL') {
        matchesSection = loc.section === activeSection;
      }
      
      return matchesSearch && matchesSection;
    });
  }, [uniqueLocations, searchQuery, activeSection]);

  const handleLocationClick = (loc: any) => {
    if (!mapInstance) return;
    const mapAny = mapInstance as any;
    mapAny._isFlying = true;
    mapInstance.flyTo({
      center: [loc.coordinates[0], loc.coordinates[1]],
      zoom: 21, // Deep zoom (seperti yang diminta)
      pitch: 60,
      padding: { left: window.innerWidth < 768 ? 0 : 360, top: 0, bottom: 0, right: 0 },
      duration: 2000,
      essential: true
    });
    
    mapInstance.once('moveend', () => {
      mapAny._isFlying = false;
    });

    // Langsung buka 360 Viewer seketika (animasi flyTo berjalan di background)
    openViewer(loc.id);

    // On mobile, collapse after selecting to see the map
    if (window.innerWidth < 768) {
      setIsMobileExpanded(false);
    }
  };

  const getSectionLabel = (sec: string) => sec === 'ALL' ? t('allSectors') : sec;

  return (
    <div className={`pointer-events-auto absolute z-20 flex flex-col shadow-none dark:shadow-2xl transition-all duration-300 overflow-hidden bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-slate-200 dark:border-white/10
      md:left-0 md:top-0 md:bottom-0 md:w-[340px] md:border-r md:rounded-none md:h-auto
      left-0 bottom-0 w-full border-t rounded-t-2xl
      ${isMobileExpanded ? 'h-[75vh]' : 'h-[70px] md:h-full'}
    `}>
      
      {/* Mobile Drag Handle / Header */}
      <div 
        className="md:hidden flex items-center justify-between px-6 py-4 cursor-pointer border-b border-slate-200 dark:border-white/5 active:bg-slate-100 dark:active:bg-white/5"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
      >
        <div className="flex items-center gap-3">
          {isLoadingProfile ? (
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse shrink-0"></div>
          ) : displayIcon ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shrink-0">
              <img src={displayIcon} className="h-full w-full object-cover" alt={displayName} />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-400/15 overflow-hidden shrink-0">
              <Radio className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          )}
          <div>
            {isLoadingProfile ? (
              <>
                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse"></div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white line-clamp-1">{displayName}</h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{displayDesc}</p>
                </div>
                {isDashboard && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(); }} 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-all shrink-0"
                  >
                    <Edit3 className="w-3 h-3" />
                    {t('editProfile')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {isMobileExpanded ? <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />}
      </div>

      {/* Main Content (Hidden on mobile when collapsed) */}
      <div className={`flex flex-col flex-1 overflow-hidden ${!isMobileExpanded ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header Section (Desktop only for the title, Mobile already has it in the handle) */}
        <div className="p-6 pb-4">
          <div className="hidden md:flex flex-col gap-3 mb-8 w-full">
            <div className="flex items-center gap-3 w-full">
              {isLoadingProfile ? (
                <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse shrink-0"></div>
              ) : displayIcon ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shrink-0">
                  <img src={displayIcon} className="h-full w-full object-cover" alt={displayName} />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-400/15 overflow-hidden shrink-0">
                  <Radio className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              )}
              <div className="flex-1 pr-1">
                {isLoadingProfile ? (
                  <div className="flex flex-col gap-1">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white line-clamp-2">{displayName}</h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{displayDesc}</p>
                  </>
                )}
              </div>
            </div>
            
            {isDashboard && !isLoadingProfile && (
              <div className="flex flex-col items-start gap-1.5 w-full">
                <button 
                  onClick={handleOpenEdit} 
                  className="flex items-center justify-center w-full gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-200 dark:hover:border-cyan-500/30 transition-all shadow-sm" 
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {t('editProfile')}
                </button>
                <button 
                  onClick={() => setIsManageSectionsOpen(true)} 
                  className="flex items-center justify-center w-full gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all shadow-sm" 
                >
                  <Layers className="w-3.5 h-3.5" />
                  {t('manageSections')}
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-16 items-start mb-6">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('totalNodes')}</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-slate-200 dark:bg-white/10 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 drop-shadow-sm dark:drop-shadow-md">{nodes.length}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('projectScale')}</p>
              {isLoading ? (
                <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 drop-shadow-sm dark:drop-shadow-md">Large</p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <input 
              type="text" 
              placeholder={t('searchStation')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-sm border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-none dark:shadow-inner"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {dynamicSections.map(sec => {
              const isActive = activeSection === sec;
              return (
                <button
                  key={sec}
                  onClick={() => setActiveSection(sec)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider transition-all duration-300
                    ${isActive 
                      ? 'bg-cyan-500 text-white dark:bg-cyan-400 dark:text-slate-900 shadow-sm' 
                      : 'bg-white/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-cyan-400 hover:bg-slate-50/50 dark:hover:bg-white/5'}`}
                >
                  {getSectionLabel(sec)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Locations Log */}
        <div className="px-6 pt-2 pb-2">
          <h2 className="text-[12px] font-bold text-slate-600 dark:text-slate-400">Log Lokasi</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar">
          {isLoading ? (
            // Skeleton Loader
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 rounded-xl animate-pulse backdrop-blur-sm">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-3/4 mb-1.5"></div>
                <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-1/2 mb-1.5"></div>
                <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-1/3"></div>
              </div>
            ))
          ) : (
            filteredLocations.map((loc, idx) => (
              <div 
                key={`${loc.id}-${idx}`}
                onClick={() => handleLocationClick(loc)}
                className="bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-slate-200 dark:border-white/5 p-4 rounded-xl cursor-pointer hover:bg-white/90 dark:hover:bg-white/10 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-all group shadow-none dark:shadow-none"
              >
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {loc.locationName}
                </h3>
                <p className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 mb-1">
                  {loc.coordinates[1].toFixed(6)}, {loc.coordinates[0].toFixed(6)}
                </p>
                {loc.captureDate && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-500">
                    {new Date(loc.captureDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}

          {!isLoading && filteredLocations.length === 0 && (
            <div className="text-center text-slate-500 text-sm mt-8">
              {t('noNodes')}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal using Reusable Component */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('editProfile')}
        icon={<Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Nama Perusahaan</label>
            <input 
              type="text" 
              value={compName} 
              onChange={(e) => setCompName(e.target.value)}
              placeholder="e.g. PT Nusantara Teknologi Spasial"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/20 text-sm text-zinc-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Deskripsi / Tagline</label>
            <input 
              type="text" 
              value={compDesc} 
              onChange={(e) => setCompDesc(e.target.value)}
              placeholder="e.g. Real-time Node Monitoring"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/20 text-sm text-zinc-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Logo Perusahaan</label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {compIcon ? (
                  <img src={compIcon} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <span className="text-[10px] text-zinc-400 text-center leading-tight">Belum Ada Logo</span>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleIconChange}
                className="text-[11px] text-zinc-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-cyan-50 file:text-cyan-700 dark:file:bg-cyan-500/20 dark:file:text-cyan-400 hover:file:bg-cyan-100 cursor-pointer transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleSaveProfile}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              {t('save')}
            </button>
          </div>
        </div>
      </Modal>

      {isManageSectionsOpen && mounted && document.body && createPortal(
        <ManageSectionsModal 
          isOpen={isManageSectionsOpen}
          onClose={() => setIsManageSectionsOpen(false)}
        />
      , document.body)}

      {/* Floating Success Toast using Portal */}
      {showToast && mounted && document.body && createPortal(
        <div className="fixed bottom-6 right-6 z-[100000] animate-slide-up flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-2xl border border-emerald-400/30 pointer-events-auto">
          <Check className="w-4 h-4" />
          Profil berhasil diperbarui!
        </div>
      , document.body)}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
