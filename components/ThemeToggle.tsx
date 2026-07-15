"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl">
        <div className="h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-3.5 w-12 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  // Resolve current theme if set to 'system'
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isLight = currentTheme === 'light';

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:text-cyan-600 dark:hover:text-cyan-400 transition-all border border-transparent"
      title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
    >
      {isLight ? (
        <>
          <Moon className="w-4 h-4" />
          <span>{t('dark')}</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span>{t('light')}</span>
        </>
      )}
    </button>
  );
}
