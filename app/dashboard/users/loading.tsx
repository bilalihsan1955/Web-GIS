export default function UsersLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12 font-sans">
      
      {/* Page Context Actions Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
        <div className="relative w-full flex-1">
          <div className="h-[46px] w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
        </div>

        <div className="relative z-[70]">
          <div className="h-[46px] w-[170px] bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
        </div>

        <div className="h-[46px] w-[150px] bg-cyan-100 dark:bg-cyan-500/10 rounded-xl shrink-0"></div>
      </div>

      {/* ── DATA TABLE SKELETON ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-black/20">
                <th className="px-6 py-5"><div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-24"></div></th>
                <th className="px-6 py-5"><div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-20"></div></th>
                <th className="px-6 py-5"><div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-24"></div></th>
                <th className="px-6 py-5"><div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-24"></div></th>
                <th className="px-6 py-5 flex justify-end"><div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-16"></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="bg-white/5 border-b border-zinc-100 dark:border-white/5 last:border-0">
                  <td className="px-6 py-5 flex items-center"><div className="h-4 w-4 bg-zinc-200 dark:bg-white/10 rounded-full mr-3 shrink-0"></div><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-48"></div></td>
                  <td className="px-6 py-5"><div className="h-6 bg-zinc-200 dark:bg-white/10 rounded-full w-24"></div></td>
                  <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div></td>
                  <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div></td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <div className="h-9 w-24 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                      <div className="h-9 w-20 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                      <div className="h-9 w-24 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
