export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse pb-12 mt-2">
      {/* Placeholder for unified metrics bar */}
      <div className="bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-[24px] flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden shadow-sm">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 p-6 flex items-center">
            <div className="h-[58px] w-[58px] rounded-[24px] bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>
            <div className="ml-5 space-y-1 w-full">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mt-1"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Placeholder for Uploader Header */}
      <div className="flex justify-between items-center -mb-2">
         <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
         <div className="h-9 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-[12px]"></div>
      </div>

      {/* Placeholder for Uploader Box */}
      <div className="h-48 rounded-[24px] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800"></div>

      {/* Placeholder for table */}
      <div className="h-96 rounded-[24px] bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800"></div>
    </div>
  );
}
