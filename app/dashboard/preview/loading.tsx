export default function PreviewLoading() {
  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-[24px] overflow-hidden border border-zinc-200 dark:border-white/10 shadow-inner bg-zinc-950 flex animate-pulse font-sans">
      {/* ── Background Map Skeleton ── */}
      <div className="absolute inset-0 w-full h-full z-0 bg-zinc-900/80">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>
      
      {/* ── Sidebar Skeleton matching MapSidebar precisely (Desktop Left Dock / Mobile Bottom Drawer) ── */}
      <div className="absolute z-10 flex flex-col bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 md:left-0 md:top-0 md:bottom-0 md:w-[250px] lg:w-[260px] xl:w-[270px] md:border-r md:rounded-none md:h-full left-0 bottom-0 w-full border-t rounded-t-2xl h-[70px] md:h-auto p-4 justify-between">
        <div className="hidden md:flex flex-col gap-4 w-full">
          <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10"></div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-white/10 shrink-0"></div>
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-white/10"></div>
              <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-white/10"></div>
            </div>
          </div>
          <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10 mt-2"></div>
          <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10"></div>
          <div className="h-9 w-full rounded-xl bg-zinc-200 dark:bg-white/10"></div>
        </div>

        {/* Mobile Handle Skeleton */}
        <div className="md:hidden flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-white/10 shrink-0"></div>
            <div className="space-y-1">
              <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-white/10"></div>
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-white/10"></div>
            </div>
          </div>
          <div className="h-5 w-5 rounded bg-zinc-200 dark:bg-white/10"></div>
        </div>

        {/* Bottom Toggles Skeleton */}
        <div className="hidden md:flex flex-col gap-2 pt-4 border-t border-zinc-200 dark:border-white/10">
          <div className="h-8 w-full rounded-lg bg-zinc-200 dark:bg-white/10"></div>
          <div className="h-8 w-full rounded-lg bg-zinc-200 dark:bg-white/10"></div>
        </div>
      </div>
      
      {/* ── Zoom / Controls Skeleton on Right ── */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <div className="h-9 w-9 rounded-xl bg-white/80 dark:bg-black/60 border border-zinc-200 dark:border-white/10"></div>
        <div className="h-9 w-9 rounded-xl bg-white/80 dark:bg-black/60 border border-zinc-200 dark:border-zinc-800"></div>
      </div>
    </div>
  );
}
