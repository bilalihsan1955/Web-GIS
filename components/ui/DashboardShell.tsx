'use client';

import {
  Layers,
  Compass,
  Radio,
  Activity,
} from 'lucide-react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { MAPBOX_STYLE } from '@/lib/constants';

/**
 * Absolute-positioned glassmorphism overlay panels sitting on top of the map.
 *
 *  ┌─────────────────────────────────────────┐
 *  │  [Logo + Title]            [Actions]    │
 *  │                                         │
 *  │                MAP CANVAS               │
 *  │                                         │
 *  │  [Status bar]                           │
 *  └─────────────────────────────────────────┘
 */
export default function DashboardShell() {
  const mapInstance = useDashboardStore((s) => s.mapInstance);
  const isSatellite = useDashboardStore((s) => s.isSatellite);
  const setIsSatellite = useDashboardStore((s) => s.setIsSatellite);

  const handleResetCompass = () => {
    if (!mapInstance) return;
    mapInstance.easeTo({ bearing: 0, pitch: 0, duration: 1000 });
  };

  const handleToggleLayers = () => {
    if (!mapInstance) return;
    const newStyle = isSatellite
      ? 'mapbox://styles/mapbox/dark-v11'
      : MAPBOX_STYLE;
    mapInstance.setStyle(newStyle);
    setIsSatellite(!isSatellite);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 md:p-6">
      {/* ── Top Row ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        {/* Logo / Title */}
        <div className="glass-panel pointer-events-auto animate-slide-up flex items-center gap-3 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/15">
            <Radio className="h-5 w-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-text-primary">
              GeoSpatial Dashboard
            </h1>
            <p className="text-[11px] text-text-muted">
              Real-time Node Monitoring
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div
          className="glass-panel pointer-events-auto animate-slide-up flex items-center gap-1 p-1.5"
          style={{ animationDelay: '80ms' }}
        >
          <button
            onClick={handleToggleLayers}
            className="glass-button flex h-9 w-9 items-center justify-center"
            aria-label="Toggle layers"
            title={isSatellite ? 'Switch to Dark Vector' : 'Switch to Satellite'}
          >
            <Layers className={`h-4 w-4 ${isSatellite ? 'text-text-secondary' : 'text-accent-cyan'}`} />
          </button>
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
            <span className="text-xs text-text-secondary">System Online</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs tabular-nums text-text-muted">
              25 nodes active
            </span>
          </div>
        </div>

        {/* Attribution placeholder (bottom-right is Mapbox controls) */}
        <div
          className="glass-panel pointer-events-auto animate-slide-up px-3 py-1.5"
          style={{ animationDelay: '240ms' }}
        >
          <span className="text-[10px] text-text-muted">
            Globe Projection · {isSatellite ? 'Satellite' : 'Dark Vector'}
          </span>
        </div>
      </div>
    </div>
  );
}
