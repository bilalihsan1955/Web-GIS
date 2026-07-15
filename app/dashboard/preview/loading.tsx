export default function PreviewLoading() {
  return (
    <div className="animate-pulse w-full h-[calc(100vh-80px)] rounded-[32px] overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 relative flex items-center justify-center font-sans">
      
      {/* ── Background Map Skeleton ── */}
      <div className="absolute inset-0 w-full h-full">
        {/* Subtle grid pattern to look like a map loading */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:20px_20px]"></div>
      </div>

      {/* ── Sidebar Skeleton ── */}
      <div className="absolute top-4 left-4 z-10 w-80 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
        </div>

        <div className="space-y-4">
          <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
          <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
          
          <div className="pt-2">
            <div className="h-32 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
          </div>
          
          <div className="pt-2">
             <div className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* ── Top Bar Skeleton ── */}
      <div className="absolute top-4 right-4 z-10">
        <div className="h-[46px] w-[200px] bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl"></div>
      </div>

      {/* ── Floating Controls Skeleton ── */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <div className="h-[42px] w-[42px] bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-xl"></div>
        <div className="h-[42px] w-[42px] bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-xl"></div>
      </div>

    </div>
  );
}
