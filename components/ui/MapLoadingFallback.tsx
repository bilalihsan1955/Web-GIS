'use client';

import { Globe } from 'lucide-react';

/**
 * Skeleton loading fallback shown while the Mapbox GL JS bundle
 * is being lazy-loaded via `next/dynamic`.
 */
export default function MapLoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030712]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-violet-950/30" />

      {/* Pulsing loader */}
      <div className="relative flex flex-col items-center gap-5">
        {/* Glowing ring */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-accent-cyan/20 animate-pulse-glow blur-xl" />
          <div className="glass-panel flex h-20 w-20 items-center justify-center">
            <Globe className="h-10 w-10 text-accent-cyan animate-pulse-glow" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-text-primary tracking-wide">
            Initialising Globe
          </p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse-glow" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse-glow" style={{ animationDelay: '300ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse-glow" style={{ animationDelay: '600ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
