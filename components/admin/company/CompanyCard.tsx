'use client';

import React from 'react';
import Image from 'next/image';
import { Mail, Map, ChevronRight, Trash2 } from 'lucide-react';

// ============================================================================
// components/admin/company/CompanyCard.tsx: Tenant Company Profile Card (< 90 lines)
// Clean Architecture: Pure presentational card for Super Admin Company Grid
// ============================================================================

export interface CompanyGroup {
  user_id: string;
  company_name: string | null;
  email: string;
  company_logo: string | null;
  company_slug: string | null;
}

interface CompanyCardProps {
  group: CompanyGroup;
  onSelect: (id: string) => void;
  onDeleteClick: (group: CompanyGroup) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ group, onSelect, onDeleteClick }) => {
  return (
    <div
      onClick={() => onSelect(group.user_id)}
      className="group flex flex-col text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden cursor-pointer"
    >
      {/* Delete Trigger Button (Hover Action) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(group);
          }}
          title="Hapus Perusahaan"
          className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Company Logo & Details */}
      <div className="flex items-center gap-4 mb-4 relative z-10 pr-8">
        <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
          {group.company_logo ? (
            <Image
              src={group.company_logo}
              alt={group.company_name || 'Logo'}
              width={48}
              height={48}
              className="w-full h-full object-contain p-0.5"
            />
          ) : (
            <div className="w-full h-full p-1 flex items-center justify-center relative">
              <Image
                src="/Logo.webp"
                alt={group.company_name || 'Logo'}
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-zinc-900 dark:text-white truncate">
            {group.company_name || 'Tanpa nama'}
          </h3>
          <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
            <Mail className="w-3 h-3 mr-1.5 shrink-0" />
            <span className="truncate">{group.email}</span>
          </div>
        </div>
      </div>

      {/* Card Footer with CTA */}
      <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between relative z-10">
        <span className="inline-flex items-center text-xs font-semibold text-cyan-600 dark:text-cyan-400">
          <Map className="w-3.5 h-3.5 mr-1.5" /> Kelola peta
        </span>
        <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
