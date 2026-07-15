import { useState } from 'react';
import Image from 'next/image';
import { Building2, ChevronRight, Mail, Map, Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface CompanyGridProps {
  adminGroups: { user_id: string; company_name: string | null; email: string, company_logo: string | null, company_slug: string | null }[];
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function CompanyGrid({ adminGroups, onSelect, loading }: CompanyGridProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = adminGroups.filter(group => {
    const search = searchQuery.toLowerCase();
    const nameMatch = (group.company_name || '').toLowerCase().includes(search);
    const emailMatch = (group.email || '').toLowerCase().includes(search);
    return search === '' || nameMatch || emailMatch;
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-5 ">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-500 shrink-0" />{t('companyDirectory') || 'Direktori Perusahaan (Klien)'}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('companyDirectoryDesc') || 'Pilih salah satu perusahaan di bawah ini untuk masuk ke mode kelola dan mengunggah peta untuk mereka.'}</p>
        </div>
        <div className="w-full lg:w-80 relative shrink-0">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            placeholder={t('searchCompany') || 'Cari perusahaan atau email...'} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner placeholder-zinc-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-[24px] p-6 border border-zinc-200 dark:border-zinc-800  animate-pulse flex flex-col h-[180px]">
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-white/10 shrink-0"></div>
                <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                  <div className="h-6 bg-zinc-200 dark:bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-200 dark:bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-white/5 flex justify-between">
                <div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div>
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-white/10"></div>
              </div>
            </div>
          ))
        ) : (
          filteredGroups.map((group) => (
          <button
            key={group.user_id}
            onClick={() => onSelect(group.user_id)}
            className="group flex flex-col text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-6  hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden"
          >
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0  group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                {group.company_logo ? (
                  <Image src={group.company_logo} alt={group.company_name || 'Logo'} width={48} height={48} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white truncate">
                  {group.company_name || t('unnamed') || 'Tanpa Nama'}
                </h3>
                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  <Mail className="w-3 h-3 mr-1.5 shrink-0" />
                  <span className="truncate">{group.email}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between relative z-10">
              <span className="inline-flex items-center text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <Map className="w-3.5 h-3.5 mr-1.5" />{t('manageMap') || 'Kelola Peta'}</span>
              <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
          ))
        )}
        {!loading && filteredGroups.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-[24px] border border-dashed border-zinc-300 dark:border-zinc-700">
            {searchQuery ? (t('companyNotFound') || 'Perusahaan tidak ditemukan.') : (t('noClients') || 'Belum ada Klien (Admin) yang terdaftar.')}
          </div>
        )}
      </div>
    </div>
  );
}
