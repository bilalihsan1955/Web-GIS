'use client';

import React from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { BoundaryItem } from '@/store/useMapStore';

interface SidebarBoundariesAccordionProps {
  boundaries: BoundaryItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
}

export const SidebarBoundariesAccordion: React.FC<SidebarBoundariesAccordionProps> = ({
  boundaries,
  isExpanded,
  onToggleExpand,
  onToggleVisibility,
}) => {
  if (boundaries.length === 0) return null;

  return (
    <div className="border-b border-zinc-200/60 dark:border-white/10 pb-4">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between py-1 text-left group transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            Batas wilayah
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
            {boundaries.length}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180 text-cyan-600' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="mt-2.5 space-y-1.5 animate-fade-in max-h-48 overflow-y-auto pr-1">
          {boundaries.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: b.color || '#06b6d4' }}
                />
                <span className="truncate text-zinc-700 dark:text-zinc-300 font-medium text-[11px]">
                  {b.name}
                </span>
                {typeof b.total_area_ha === 'number' && b.total_area_ha > 0 && (
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    ({b.total_area_ha.toLocaleString('id-ID')} ha)
                  </span>
                )}
              </div>

              <input
                type="checkbox"
                checked={b.is_visible !== false}
                onChange={(e) => onToggleVisibility(b.id, e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500/20 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                title={b.is_visible !== false ? 'Sembunyikan layer' : 'Tampilkan layer'}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
