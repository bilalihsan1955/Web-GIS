'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';
import { Loader2, Share2, Check, Settings } from 'lucide-react';
import MapLoadingFallback from '@/components/ui/MapLoadingFallback';
import MapSidebar from '@/components/ui/MapSidebar';
import { ADMIN_SLUG_MAP, useMapStore } from '@/store/useMapStore';
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();
  const mapInstance = useDashboardStore((s) => s.mapInstance);

  const slug = Object.keys(ADMIN_SLUG_MAP).find(
    (key) => ADMIN_SLUG_MAP[key] === user?.id
  ) || 'pt-mencari-cinta-sejati';

  const companyProfiles = useMapStore((s) => s.companyProfiles);
  const updateCompanyProfile = useMapStore((s) => s.updateCompanyProfile);
  const profile = companyProfiles[slug];

  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compIcon, setCompIcon] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    if (profile) {
      setCompName(profile.name);
      setCompDesc(profile.description);
      setCompIcon(profile.iconUrl);
    }
  }, [profile]);

  const handleCopyLink = () => {
    if (!user) return;
    const shareUrl = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize to max 128x128 to stay well within localStorage quota limit
          const canvas = document.createElement('canvas');
          const maxDim = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Convert to JPEG with compression quality 0.7
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setCompIcon(compressedBase64);
          }
        };
        img.src = event.target?.result as string;
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    updateCompanyProfile(slug, {
      name: compName,
      description: compDesc,
      iconUrl: compIcon
    });
    setIsMenuOpen(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading map preview...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500 dark:text-slate-400">
        You must be logged in to view this preview.
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner bg-slate-950 flex">
      {/* Dynamic Map Component restricted to container bounds */}
      <MapboxGlobe adminId={user.id} className="absolute inset-0 w-full h-full z-0" />
      
      {/* Left Navigation Overlay Sidebar (fits nicely inside container) */}
      <div className="absolute inset-y-0 left-0 z-10 pointer-events-none md:h-full">
        <MapSidebar />
      </div>

      {/* Floating Share Link Button in Top Right */}
      <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Collapsible Form Menu */}
        {isMenuOpen && (
          <div className="w-72 p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col gap-4 text-slate-800 dark:text-white transition-all duration-300">
            <h3 className="text-sm font-bold border-b border-slate-200 dark:border-white/10 pb-2">
              Edit Company Profile
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Company Name</label>
              <input 
                type="text" 
                value={compName} 
                onChange={(e) => setCompName(e.target.value)}
                placeholder="e.g. PT Mencari Cinta Sejati"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none shadow-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
              <input 
                type="text" 
                value={compDesc} 
                onChange={(e) => setCompDesc(e.target.value)}
                placeholder="e.g. Real-time Node Monitoring"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none shadow-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Custom Icon / Logo</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {compIcon ? (
                    <img src={compIcon} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <span className="text-[10px] text-slate-400">No Icon</span>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleIconChange}
                  className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-50 file:text-cyan-700 dark:file:bg-cyan-950 dark:file:text-cyan-400 hover:file:bg-cyan-100 w-full"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-xs text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Settings Toggle Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border border-cyan-400/20 shadow-lg transition-all active:scale-95"
            title="Edit Company Profile Settings"
          >
            <Settings className={`w-5 h-5 ${isMenuOpen ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </button>

          {/* Share Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-full transition-all shadow-lg hover:shadow-xl active:scale-[0.98] border border-cyan-400/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                Copied Link!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share Guest Map
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-2xl border border-emerald-400/30 pointer-events-auto shadow-emerald-500/20">
          <Check className="w-4 h-4" />
          Profile updated successfully!
        </div>
      )}

      {/* 360-Degree Panorama Viewer (opens on unclustered point click) */}
      <Viewer360 />
    </div>
  );
}
