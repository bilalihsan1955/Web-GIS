"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="w-full flex flex-col mt-2">
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4" />
        <span className="text-sm text-gray-500 mb-2 font-medium">Theme</span>
        <div className="h-10 w-full rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  // Resolve current theme if set to 'system'
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isLight = currentTheme === 'light';

  return (
    <div className="w-full flex flex-col mt-2">
      <div className="border-t border-gray-200 dark:border-gray-800 pt-4" />
      
      <span className="text-sm text-gray-500 mb-2 font-medium">Theme</span>

      <button
        onClick={() => setTheme(isLight ? "dark" : "light")}
        className="w-full flex items-center justify-start gap-3 py-2 px-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent"
        title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
      >
        {isLight ? (
          <>
            <Moon className="w-4 h-4 text-slate-700" />
            <span>Dark</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Light</span>
          </>
        )}
      </button>
    </div>
  );
}
