import { MapPin, Users } from 'lucide-react';

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
  return (
    <div className={`grid grid-cols-1 ${userRole === 'user' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
      {/* Total Nodes Card */}
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-none dark:shadow-xl flex items-center hover:bg-white/90 dark:hover:bg-white/5 transition-colors">
        {loading ? (
          <>
            <div className="h-[58px] w-[58px] rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse border border-slate-200 dark:border-white/5 shrink-0" />
            <div className="ml-5 space-y-2 w-full">
              <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 animate-pulse rounded" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-white/10 animate-pulse rounded" />
            </div>
          </>
        ) : (
          <>
            <div className="h-[58px] w-[58px] rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-none dark:shadow-inner">
              <MapPin className="h-7 w-7 text-cyan-700 dark:text-cyan-400" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Nodes</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalNodes}</p>
            </div>
          </>
        )}
      </div>
      
      {/* Total Locations Card */}
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-none dark:shadow-xl flex items-center hover:bg-white/90 dark:hover:bg-white/5 transition-colors">
        {loading ? (
          <>
            <div className="h-[58px] w-[58px] rounded-xl bg-slate-100 dark:bg-white/10 animate-pulse border border-slate-200 dark:border-white/5 shrink-0" />
            <div className="ml-5 space-y-2 w-full">
              <div className="h-4 w-24 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
              <div className="h-8 w-16 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
            </div>
          </>
        ) : (
          <>
            <div className="bg-purple-500/10 dark:bg-purple-500/20 p-4 rounded-xl border border-purple-500/20 shadow-none dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <MapPin className="h-6 w-6 text-purple-700 dark:text-purple-400" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Locations</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalLocations}</p>
            </div>
          </>
        )}
      </div>

      {/* Total Users Card */}
      {(userRole === 'admin' || userRole === 'superadmin') && (
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-none dark:shadow-xl flex items-center hover:bg-white/90 dark:hover:bg-white/5 transition-colors">
          {loading ? (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-slate-100 dark:bg-white/10 animate-pulse border border-slate-200 dark:border-white/5 shrink-0" />
              <div className="ml-5 space-y-2 w-full">
                <div className="h-4 w-24 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
                <div className="h-8 w-16 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-500/10 dark:bg-amber-500/20 p-4 rounded-xl border border-amber-500/20 shadow-none dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Users className="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Users</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalUsers}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
