'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Languages } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LanguageToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center ${collapsed ? 'w-full py-2 px-2' : 'flex-1 gap-2 py-2 px-3'} rounded-xl`}>
        <div className="h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        {!collapsed && <div className="h-3.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />}
      </div>
    );
  }

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center justify-center ${collapsed ? 'w-full py-2.5 px-2' : 'flex-1 gap-2 py-2 px-3'} rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:text-cyan-600 dark:hover:text-cyan-400 transition-all border border-transparent`}
      title={t('switchLanguage')}
      aria-label={t('switchLanguage')}
    >
      <Languages className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{language === 'id' ? 'Indonesia' : 'English'}</span>}
    </button>
  );
}
