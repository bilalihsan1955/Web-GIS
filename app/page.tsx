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
    <div className="min-h-[100dvh] bg-white dark:bg-[#0A0A0A] font-sans text-zinc-900 dark:text-zinc-50 selection:bg-cyan-200 dark:selection:bg-cyan-900 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center relative py-12 px-4 sm:px-6">
      
      {/* ── 1. Clear & Defined Tile Grid Pattern (Long Gradual Fade-Out Gradient) ── */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.075)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.075)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,#000_15%,rgba(0,0,0,0.8)_35%,rgba(0,0,0,0.5)_55%,rgba(0,0,0,0.2)_78%,transparent_95%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_15%,rgba(0,0,0,0.8)_35%,rgba(0,0,0,0.5)_55%,rgba(0,0,0,0.2)_78%,transparent_95%)]" 
      />

      {/* ── 2. 6 Multi-Layered Moving Spotlight Beams (Softened to 55% opacity in Light Mode) ── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-55 dark:opacity-100 transition-opacity">
        {/* Beam 1: Electric Cyan & Bright Teal */}
        <div className="absolute -top-[10%] left-0 w-[300px] sm:w-[460px] h-[110%] bg-gradient-to-b from-cyan-400/32 via-teal-400/20 via-cyan-600/08 to-transparent blur-[75px] sm:blur-[105px] animate-beam-1" />
        
        {/* Beam 2: Deep Sapphire & Indigo */}
        <div className="absolute -top-[10%] left-0 w-[300px] sm:w-[450px] h-[150%] bg-gradient-to-b from-blue-500/28 via-indigo-500/18 via-blue-800/08 to-transparent blur-[85px] sm:blur-[115px] animate-beam-2" />

        {/* Beam 3: Emerald Cyan & Dark Teal */}
        <div className="absolute -top-[10%] left-0 w-[240px] sm:w-[380px] h-[120%] bg-gradient-to-b from-teal-400/25 via-cyan-400/16 via-emerald-600/08 to-transparent blur-[70px] sm:blur-[100px] animate-beam-3" />

        {/* Beam 4: Royal Blue & Sky Glow */}
        <div className="absolute -top-[10%] left-0 w-[360px] sm:w-[540px] h-[90%] bg-gradient-to-b from-sky-400/30 via-blue-500/18 via-slate-600/08 to-transparent blur-[95px] sm:blur-[135px] animate-beam-4" />

        {/* Beam 5: Deep Violet & Soft Indigo */}
        <div className="absolute -top-[10%] left-0 w-[320px] sm:w-[480px] h-[130%] bg-gradient-to-b from-violet-500/27 via-indigo-500/17 via-slate-700/08 to-transparent blur-[85px] sm:blur-[125px] animate-beam-5" />

        {/* Beam 6: Northern Emerald & Mint Aquamarine */}
        <div className="absolute -top-[10%] left-0 w-[340px] sm:w-[500px] h-[140%] bg-gradient-to-b from-emerald-400/29 via-teal-300/18 via-cyan-600/08 to-transparent blur-[80px] sm:blur-[110px] animate-beam-6" />

        {/* Soft Ambient Base Curtain */}
        <div className="absolute top-0 left-0 w-full h-[120%] bg-[linear-gradient(to_bottom,rgba(34,211,238,0.14)_0%,rgba(20,184,166,0.06)_45%,transparent_75%)] pointer-events-none" />
      </div>

      {/* Main Hero Container */}
      <main className="w-full max-w-5xl mx-auto flex flex-col items-center text-center z-10 relative my-auto py-8">
        
        {/* Single Logo & Brand Name directly above headline (Masked Black EXCLUSIVELY in Light Mode, Original Logo in Dark Mode) */}
        <div className="mb-6 flex items-center justify-center gap-3.5">
          <Image 
            src="/Logo.webp" 
            alt="bws360kaltim Logo" 
            width={48} 
            height={48} 
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain brightness-0 dark:brightness-100 dark:invert-0 transition-all" 
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

    </div>
  );
}
