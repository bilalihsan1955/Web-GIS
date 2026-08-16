import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLandingPage() {
  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#0A0A0A] font-sans text-zinc-900 dark:text-zinc-50 selection:bg-cyan-200 dark:selection:bg-cyan-900 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-between relative py-12 px-4 sm:px-6">
      
      {/* ── 1. Subtle Tile Grid Pattern ── */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_70%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_70%,transparent_100%)]" 
      />

      {/* ── 2. 4 Layered Linear Moving Spotlight Beams (Varied Tones, Speeds & Angles) ── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        {/* Beam 1: Electric Cyan & Bright Teal (-12deg angle, 18s) */}
        <div className="absolute -top-[20%] left-0 w-[300px] sm:w-[480px] h-[140%] bg-gradient-to-b from-cyan-400/40 via-teal-400/25 via-cyan-600/10 to-transparent blur-[65px] sm:blur-[95px] animate-beam-1" />
        
        {/* Beam 2: Deep Sapphire & Indigo - Darker Contrast Tone (8deg angle, 24s) */}
        <div className="absolute -top-[20%] left-0 w-[280px] sm:w-[420px] h-[140%] bg-gradient-to-b from-blue-600/35 via-indigo-500/20 via-blue-900/15 to-transparent blur-[75px] sm:blur-[105px] animate-beam-2" />

        {/* Beam 3: Emerald Cyan & Dark Teal (-5deg angle, 15s fast sweep) */}
        <div className="absolute -top-[20%] left-0 w-[220px] sm:w-[350px] h-[140%] bg-gradient-to-b from-teal-400/30 via-cyan-500/20 via-emerald-800/15 to-transparent blur-[55px] sm:blur-[85px] animate-beam-3" />

        {/* Beam 4: Royal Blue & Sky Glow - Wider Ambient (15deg angle, 28s slow sweep) */}
        <div className="absolute -top-[20%] left-0 w-[380px] sm:w-[580px] h-[140%] bg-gradient-to-b from-sky-400/25 via-blue-500/15 via-slate-700/10 to-transparent blur-[85px] sm:blur-[125px] animate-beam-4" />

        {/* Linear Soft Top-to-Bottom Light Base Curtain */}
        <div className="absolute top-0 left-0 w-full h-[100%] bg-[linear-gradient(to_bottom,rgba(34,211,238,0.15)_0%,rgba(20,184,166,0.05)_40%,transparent_80%)] pointer-events-none" />
      </div>

      {/* Main Hero Container */}
      <main className="w-full max-w-5xl mx-auto flex flex-col items-center text-center z-10 relative my-auto py-8">
        
        {/* Single Logo & Brand Name directly above headline */}
        <div className="mb-6 flex items-center justify-center gap-3.5">
          <Image 
            src="/Logo.webp" 
            alt="bws360kaltim Logo" 
            width={48} 
            height={48} 
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md" 
          />
          <span className={`${bricolage.className} text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white`}>
            bws360kaltim
          </span>
        </div>

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

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex items-center justify-center z-10 relative pt-6 text-xs text-zinc-400">
        <span className={`${bricolage.className} font-extrabold text-sm text-zinc-700 dark:text-zinc-300 tracking-tight`}>bws360kaltim</span> &nbsp;— All Rights Reserved
      </footer>

    </div>
  );
}
