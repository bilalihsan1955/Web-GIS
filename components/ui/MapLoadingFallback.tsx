'use client';

import { Globe } from 'lucide-react';

/**
 * Skeleton loading fallback shown while the Mapbox GL JS bundle
 * is being lazy-loaded via `next/dynamic`.
 */
export default function MapLoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 z-50 rounded-inherit">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 dark:from-cyan-500/10 dark:to-blue-500/10" />

      {/* Pulsing loader */}
      <div className="relative flex flex-col items-center gap-4">
        {/* Glowing ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <Globe className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">
            Memuat Peta...
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
