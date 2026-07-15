import Link from 'next/link';
import { ArrowRight, MapPin, Layers, Globe2 } from 'lucide-react';

export default function RootLandingPage() {
  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#0A0A0A] font-sans text-zinc-900 dark:text-zinc-50 selection:bg-cyan-200 dark:selection:bg-cyan-900 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center relative py-12 sm:py-16 px-4 sm:px-6">
      
      {/* Subtle Background Glow for Professional Polish */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] sm:h-[500px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none -z-10" />

      <main className="w-full max-w-5xl mx-auto flex flex-col items-center text-center z-10 my-auto">
        
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[6.5rem] font-medium tracking-tight text-zinc-950 dark:text-white leading-[1.05] sm:leading-[1.0] mb-6 sm:mb-8">
          Map your world with <br className="hidden sm:block" />
          <span className="text-cyan-600 dark:text-cyan-400 font-serif italic font-normal tracking-normal sm:pr-3">
            Spatial
          </span>{' '}
          <span className="text-blue-600 dark:text-blue-500">
            Intelligence.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-2xl text-zinc-500 dark:text-zinc-400 max-w-3xl font-medium leading-relaxed mb-8 sm:mb-12 px-2">
          A vibrant, intelligent platform to map, manage, and visualize your company's spatial assets in a precise 3D environment.
        </p>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Link 
            href="/dashboard/login"
            className="w-full sm:w-auto min-h-[52px] flex items-center justify-center gap-3 px-8 sm:px-10 py-4 sm:py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/10"
          >
            Start Mapping
            <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6 shrink-0" />
          </Link>
        </div>

      </main>

    </div>
  );
}
