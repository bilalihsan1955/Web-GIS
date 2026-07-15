import Link from 'next/link';
import { ArrowRight, MapPin, Layers, Globe2 } from 'lucide-react';

export default function RootLandingPage() {
    <div className="h-[100dvh] bg-white dark:bg-[#0A0A0A] font-sans text-zinc-900 dark:text-zinc-50 selection:bg-cyan-200 dark:selection:bg-cyan-900 overflow-hidden flex flex-col items-center justify-center relative">
      
      {/* Subtle Background Glow for Professional Polish */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <main className="w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center z-10">
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-[6.5rem] font-medium tracking-tight text-zinc-950 dark:text-white leading-[1.0] mb-8">
          Map your world with <br />
          <span className="text-cyan-600 dark:text-cyan-400 font-serif italic font-normal tracking-normal pr-3">
            Spatial
          </span>
          <span className="text-blue-600 dark:text-blue-500">
            Intelligence.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-2xl text-zinc-500 dark:text-zinc-400 max-w-3xl font-medium leading-relaxed mb-12">
          A vibrant, intelligent platform to map, manage, and visualize your company's spatial assets in a precise 3D environment.
        </p>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link 
            href="/dashboard/login"
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-zinc-900/10 dark:shadow-white/10"
          >
            Start Mapping
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>

      </main>

    </div>
  );
}
