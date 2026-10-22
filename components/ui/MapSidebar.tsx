'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Edit3, Layers, ChevronLeft, Check, Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMapStore } from '@/store/useMapStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { type PhotoNode } from '@/lib/data';
import ManageSectionsModal from '@/components/admin/ManageSectionsModal';
import Modal from '@/components/ui/Modal';
import { SidebarBoundariesAccordion } from './sidebar/SidebarBoundariesAccordion';
import { SidebarNodeList } from './sidebar/SidebarNodeList';
import { Button, Input } from '@/components/ui/GlobalComponents';

// ============================================================================
// components/ui/MapSidebar.tsx: Modular Map Sidebar Coordinator (< 240 lines)
// Clean Architecture: Decomposed Boundaries Accordion & Node List
// ============================================================================

export interface MapSidebarProps {
  adminIdOverride?: string;
  forceDashboard?: boolean;
  onBack?: () => void;
  showShareButton?: boolean;
  shareUrl?: string;
  isShareLocked?: boolean;
  shareLockedMessage?: string;
  onProfileUpdated?: (newSlug: string) => void;
}

export default function MapSidebar({
  adminIdOverride,
  forceDashboard,
  onBack,
  showShareButton,
  shareUrl,
  isShareLocked,
  onProfileUpdated,
}: MapSidebarProps = {}) {
  const params = useParams();
  const adminId = adminIdOverride || (params?.adminId as string);
  const [profile, setProfile] = useState<{ company_name?: string; company_description?: string; company_logo?: string } | null>(null);
  const userRoleFromStore = useDashboardStore((s) => s.userRole);
  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const userRole = userRoleFromStore || (typeof window !== 'undefined' ? localStorage.getItem('webgis_user_role') : null);

  const boundaries = useMapStore((s) => s.boundaries);
  const toggleBoundaryVisibility = useMapStore((s) => s.toggleBoundaryVisibility);
  const [isBoundariesExpanded, setIsBoundariesExpanded] = useState(true);

  // Filters & State from useMapStore
  const nodes = useMapStore((s) => s.nodes);
  const activeNode = useMapStore((s) => s.activeNode);
  const openViewer = useMapStore((s) => s.openViewer);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const activeSection = useMapStore((s) => s.activeSection);
  const setActiveSection = useMapStore((s) => s.setActiveSection);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compIcon, setCompIcon] = useState('');
  const [copied, setCopied] = useState(false);
  const isDashboard = forceDashboard !== undefined ? forceDashboard : !adminId;

  const handleCopyLink = () => {
    if (!shareUrl || isShareLocked) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    async function getProfile() {
      try {
        const url = adminId && !forceDashboard
          ? `/api/public/company-profile?slug=${adminId}`
          : forceDashboard && adminId
          ? `/api/public/company-profile?slug=${adminId}`
          : '/api/dashboard/company-profile';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) setProfile(data.profile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    }
    getProfile();
  }, [adminId, forceDashboard]);

  // Dynamic Sections
  const dynamicSections = useMemo(() => {
    const list = Array.from(new Set(nodes.map((n) => n.section).filter((s): s is string => Boolean(s))));
    return ['ALL', ...list];
  }, [nodes]);

  // Filtered Nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchSearch = (n.locationName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchSection = activeSection === 'ALL' || n.section === activeSection;
      return matchSearch && matchSection;
    });
  }, [nodes, searchQuery, activeSection]);

  const handleNodeClick = (node: PhotoNode) => {
    const map = useDashboardStore.getState().mapInstance;
    if (map) {
      (map as any)._isFlying = true;
      map.flyTo({
        center: node.coordinates,
        zoom: 16.5,
        pitch: 60,
        bearing: 0,
        essential: true,
        duration: 1800,
      });
      map.once('moveend', () => {
        (map as any)._isFlying = false;
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const payload: any = { company_name: compName, company_description: compDesc, company_logo: compIcon };
      if (userRole === 'superadmin' && selectedCompanyId && selectedCompanyId !== 'all') {
        payload.target_admin_id = selectedCompanyId;
      }
      const res = await fetch('/api/dashboard/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        setIsEditModalOpen(false);
        if (data.profile.company_slug && onProfileUpdated) onProfileUpdated(data.profile.company_slug);
      }
    } catch {
      alert('Gagal menyimpan profil.');
    }
  };

  return (
    <aside className="w-80 sm:w-96 h-full flex flex-col bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800 z-20 select-none">
      {/* Header Profile */}
      <div className="p-4 border-b border-zinc-200/60 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {profile?.company_logo ? (
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
                <Image src={profile.company_logo} alt="Logo" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                360
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {profile?.company_name || 'Web-GIS 360'}
              </h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                {profile?.company_description || 'Platform Spasial 360°'}
              </p>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Share Button (Public Guest View) */}
        {showShareButton && shareUrl && (
          <button
            onClick={handleCopyLink}
            disabled={isShareLocked}
            className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tautan disalin' : 'Bagikan peta'}</span>
          </button>
        )}

        {/* Action Buttons for Dashboard */}
        {isDashboard && (
          <div className="flex items-center gap-2">
            {(userRole === 'admin' || (userRole === 'superadmin' && adminId !== 'all')) && (
              <button
                onClick={() => {
                  setCompName(profile?.company_name || '');
                  setCompDesc(profile?.company_description || '');
                  setCompIcon(profile?.company_logo || '');
                  setIsEditModalOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-600" /> Profil
              </button>
            )}
            <button
              onClick={() => setIsManageSectionsOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> Sektor
            </button>
          </div>
        )}
      </div>

      {/* Body: Filters, Accordion, Nodes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Search Input */}
        <Input
          placeholder="Cari titik panorama..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Section Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {dynamicSections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                activeSection === sec
                  ? 'bg-cyan-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Boundary Polygons Accordion */}
        <SidebarBoundariesAccordion
          boundaries={boundaries}
          isExpanded={isBoundariesExpanded}
          onToggleExpand={() => setIsBoundariesExpanded(!isBoundariesExpanded)}
          onToggleVisibility={toggleBoundaryVisibility}
        />

        {/* 360 Nodes List */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-zinc-500">Daftar Titik ({filteredNodes.length})</p>
          <SidebarNodeList
            nodes={filteredNodes}
            activeNodeId={activeNode?.id || null}
            onNodeClick={handleNodeClick}
            onOpenViewer={openViewer}
          />
        </div>
      </div>

      {/* Modals */}
      {isManageSectionsOpen && (
        <ManageSectionsModal isOpen={isManageSectionsOpen} onClose={() => setIsManageSectionsOpen(false)} />
      )}

      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Ubah Profil Perusahaan"
          icon={<Edit3 className="w-5 h-5 text-cyan-600" />}
        >
          <div className="space-y-4">
            <Input label="Nama perusahaan" value={compName} onChange={(e) => setCompName(e.target.value)} />
            <Input label="Deskripsi" value={compDesc} onChange={(e) => setCompDesc(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
              <Button variant="primary" size="sm" onClick={handleSaveProfile}>Simpan</Button>
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
}
