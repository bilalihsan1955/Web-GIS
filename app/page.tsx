'use client';

import Link from 'next/link';
import { Map, ArrowRight, Layers, Globe2 } from 'lucide-react';

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 dark:bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:opacity-20 opacity-10 pointer-events-none" />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        
        {/* Floating Badges/Icons */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Globe2 className="w-7 h-7" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/20 flex items-center justify-center text-white -mt-4">
            <Map className="w-7 h-7" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          Spatial <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Data</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          Platform cerdas untuk memetakan, mengelola, dan memvisualisasikan aset spasial perusahaan Anda dalam lingkungan 3D interaktif.
        </p>

        {/* CTA Button */}
        <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <Link 
            href="/dashboard/login"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-slate-900/20 dark:shadow-white/20"
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <span className="relative flex items-center gap-2 group-hover:text-white transition-colors duration-300">
              Mulai Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </Link>
        </div>
      </main>

      {/* Global CSS for animations (if not already in globals.css) */}
      <style jsx global>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
