'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      // Refresh router to clear client cache and redirect
      router.refresh();
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen font-sans items-center justify-center bg-zinc-50 dark:bg-[#0a0a0a] overflow-hidden relative p-4">
      
      {/* ── 6 Multi-Layered Moving Spotlight Beams (Softened to 55% opacity in Light Mode) ── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-55 dark:opacity-100 transition-opacity">
        {/* Beam 1: Electric Cyan & Bright Teal */}
        <div className="absolute -top-[10%] left-0 w-[280px] sm:w-[440px] h-[110%] bg-gradient-to-b from-cyan-400/32 via-teal-400/20 via-cyan-600/08 to-transparent blur-[75px] sm:blur-[105px] animate-beam-1" />
        
        {/* Beam 2: Deep Sapphire & Indigo */}
        <div className="absolute -top-[10%] left-0 w-[300px] sm:w-[460px] h-[150%] bg-gradient-to-b from-blue-500/28 via-indigo-500/18 via-blue-800/08 to-transparent blur-[85px] sm:blur-[115px] animate-beam-2" />

        {/* Beam 4: Royal Blue & Sky Glow */}
        <div className="absolute -top-[10%] left-0 w-[360px] sm:w-[540px] h-[90%] bg-gradient-to-b from-sky-400/30 via-blue-500/18 via-slate-600/08 to-transparent blur-[95px] sm:blur-[135px] animate-beam-4" />

        {/* Beam 5: Deep Violet & Soft Indigo */}
        <div className="absolute -top-[10%] left-0 w-[320px] sm:w-[480px] h-[130%] bg-gradient-to-b from-violet-500/27 via-indigo-500/17 via-slate-700/08 to-transparent blur-[85px] sm:blur-[125px] animate-beam-5" />

        {/* Beam 6: Northern Emerald & Mint Aquamarine */}
        <div className="absolute -top-[10%] left-0 w-[340px] sm:w-[500px] h-[140%] bg-gradient-to-b from-emerald-400/29 via-teal-300/18 via-cyan-600/08 to-transparent blur-[80px] sm:blur-[110px] animate-beam-6" />

        {/* Soft Ambient Base Curtain */}
        <div className="absolute top-0 left-0 w-full h-[120%] bg-[linear-gradient(to_bottom,rgba(34,211,238,0.14)_0%,rgba(20,184,166,0.06)_45%,transparent_75%)] pointer-events-none" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-8 md:p-10 shadow-sm">
          <div className="mb-8 text-center">
            {/* Logo and Brand Name (Masked Black EXCLUSIVELY in Light Mode, Original Logo in Dark Mode) */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <Image 
                src="/Logo.webp" 
                alt="bws360kaltim Logo" 
                width={48} 
                height={48} 
                className="w-10 h-10 object-contain brightness-0 dark:brightness-100 dark:invert-0 transition-all" 
              />
              <span className={`${bricolage.className} text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white`}>
                bws360kaltim
              </span>
            </div>

            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
              Admin Access
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Please enter your credentials to access the system.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                spellCheck={false}
                autoComplete="email"
                className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3.5 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-medium shadow-none"
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300" htmlFor="password">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3.5 pr-12 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-medium shadow-none"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500 dark:text-red-400 border border-red-500/20 flex items-start gap-3">
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-cyan-700 active:scale-[0.98] disabled:opacity-50 shadow-none border border-transparent mt-8"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
