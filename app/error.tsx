'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-50 dark:bg-[#0A0A0A] text-center px-6 font-sans">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-200 dark:border-red-500/20">
        <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
        Terjadi Kesalahan
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
        Sesuatu yang tidak terduga terjadi. Silakan coba lagi atau muat ulang halaman ini.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
      >
        <RotateCcw className="w-4 h-4" />
        Coba Lagi
      </button>
    </div>
  );
}
