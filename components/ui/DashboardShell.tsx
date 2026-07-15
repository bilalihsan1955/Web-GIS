'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Compass,
  Activity,
  Map,
  Moon,
  Sun,
  Navigation
} from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { MAPBOX_STYLE } from '@/lib/constants';
import MapSidebar from './MapSidebar';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardShell() {
  const { t } = useLanguage();
  const mapInstance = useDashboardStore((s) => s.mapInstance);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(MAPBOX_STYLE);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResetCompass = () => {
    if (!mapInstance) return;
    mapInstance.easeTo({ bearing: 0, pitch: 0, duration: 1000 });
  };

  const changeStyle = (styleUrl: string) => {
    if (!mapInstance) return;
    mapInstance.setStyle(styleUrl);
    setCurrentStyle(styleUrl);
    setIsMenuOpen(false);
  };

  const mapStyles = [
    { name: 'Satelit', url: 'mapbox://styles/mapbox/satellite-v9', icon: <Map className="w-4 h-4" /> },
    { name: 'Gelap', url: 'mapbox://styles/mapbox/dark-v11', icon: <Moon className="w-4 h-4" /> },
    { name: 'Terang', url: 'mapbox://styles/mapbox/light-v11', icon: <Sun className="w-4 h-4" /> },
    { name: 'Jalan', url: 'mapbox://styles/mapbox/streets-v12', icon: <Navigation className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* ── Left Sidebar ───────────────────────────────────────────── */}
      <MapSidebar />

      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-6 pl-[360px]">
        {/* ── Top Row ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-end gap-4">
          {/* Quick action buttons */}

          <div
            className="glass-panel pointer-events-auto animate-slide-up flex items-center gap-1 p-1.5 relative"
            style={{ animationDelay: '80ms' }}
            ref={menuRef}
          >
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`glass-button flex h-9 w-9 items-center justify-center ${isMenuOpen ? 'bg-white/10 border-white/40' : ''}`}
              aria-label="Toggle layers"
              title="Pilih mode peta"
            >
              <Layers className="h-4 w-4 text-cyan-400" />
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-12 right-0 w-40 glass-panel rounded-xl overflow-hidden py-1 shadow-2xl flex flex-col z-50 border border-white/20 animate-fade-in">
                {mapStyles.map((style) => (
                  <button
                    key={style.url}
                    onClick={() => changeStyle(style.url)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors ${currentStyle === style.url ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}`}
                  >
                    {style.icon}
                    {style.name}
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={handleResetCompass}
              className="glass-button flex h-9 w-9 items-center justify-center"
              aria-label="Reset compass"
              title="Reset compass & pitch"
            >
              <Compass className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </div>

      {/* ── Bottom Row ───────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        {/* Status bar */}
        <div
          className="glass-panel pointer-events-auto animate-slide-up flex items-center gap-3 px-4 py-2.5"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-text-secondary">{t('systemOnline')}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs tabular-nums text-text-muted">
              25 {t('nodesActive')}
            </span>
          </div>
        </div>


        </div>
      </div>
    </>
  );
}
