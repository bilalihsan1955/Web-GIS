import { MapPin, Users, Layers } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface DashboardStatsProps {
  userRole: string;
  loading: boolean;
  totalNodes: number;
  totalLocations: number;
  totalUsers: number;
}

export default function DashboardStats({
  userRole,
  loading,
  totalNodes,
  totalLocations,
  totalUsers
}: DashboardStatsProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-[24px] flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden shadow-sm mb-6 sm:mb-8">
      {/* Total Nodes Card */}
      <div className="flex-1 p-4 sm:p-6 flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors min-h-[88px]">
        {loading ? (
          <>
            <div className="h-[52px] sm:h-[58px] w-[52px] sm:w-[58px] rounded-[20px] sm:rounded-[24px] bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0" />
            <div className="ml-4 sm:ml-5 space-y-1 w-full min-w-0">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
            </div>
          </>
        ) : (
          <>
            <div className="h-[52px] sm:h-[58px] w-[52px] sm:w-[58px] rounded-[20px] sm:rounded-[24px] bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center shrink-0 border border-cyan-100 dark:border-cyan-900/50">
              <MapPin className="h-6 sm:h-7 w-6 sm:w-7 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="ml-4 sm:ml-5 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{t('totalNodes')}</p>
              <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white mt-0.5 tracking-tight">{totalNodes}</p>
            </div>
          </>
        )}
      </div>

      {/* Total Locations Card */}
      <div className="flex-1 p-4 sm:p-6 flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors min-h-[88px]">
        {loading ? (
          <>
            <div className="h-[52px] sm:h-[58px] w-[52px] sm:w-[58px] rounded-[20px] sm:rounded-[24px] bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0" />
            <div className="ml-4 sm:ml-5 space-y-1 w-full min-w-0">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
            </div>
          </>
        ) : (
          <>
            <div className="h-[52px] sm:h-[58px] w-[52px] sm:w-[58px] rounded-[20px] sm:rounded-[24px] bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
              <Layers className="h-6 sm:h-7 w-6 sm:w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4 sm:ml-5 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{t('activeLocations')}</p>
              <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white mt-0.5 tracking-tight">{totalLocations}</p>
            </div>
          </>
        )}
      </div>

      {/* Total Users Card (Only visible to admin and superadmin) */}
      {(userRole === 'admin' || userRole === 'superadmin') && (
        <div className="flex-1 p-4 sm:p-6 flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors min-h-[88px]">
          {loading ? (
            <>
              <div className="h-[52px] sm:h-[58px] w-[52px] sm:w-[58px] rounded-[20px] sm:rounded-[24px] bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0" />
              <div className="ml-4 sm:ml-5 space-y-1 w-full min-w-0">
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
                <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mt-1" />
              </div>
            </>
          ) : (
            <>
              <div className="h-[52px] sm:h-[58px] w-[52px] sm:w-[58px] rounded-[20px] sm:rounded-[24px] bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                <Users className="h-6 sm:h-7 w-6 sm:w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="ml-4 sm:ml-5 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{t('activeUsers')}</p>
                <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white mt-0.5 tracking-tight">{totalUsers}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
