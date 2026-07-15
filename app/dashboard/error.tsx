'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-transparent text-center px-6 font-sans">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-[20px] flex items-center justify-center mb-6 border border-red-200 dark:border-red-500/20">
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
        Gagal Memuat Data
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-8 leading-relaxed">
        Terjadi kesalahan saat mencoba memuat konten dashboard. Silakan coba lagi.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4" />
          Coba Lagi
        </button>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ke Overview
        </Link>
      </div>
    </div>
  );
}
