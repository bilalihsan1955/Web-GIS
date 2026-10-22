'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Bricolage_Grotesque } from 'next/font/google';
import { Button } from '@/components/ui/GlobalComponents';

// ============================================================================
// app/dashboard/login/page.tsx: Clean & Consistent Login Interface
// Consistent label styling, UX-friendly placeholders, Standalone Auth integration
// Strictly < 250 lines (Presentational UI + Handlers)
// ============================================================================

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

    try {
      // Authenticate against Standalone Auth endpoint (PostgreSQL + JWT + Rate Limiter)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Email atau kata sandi tidak sesuai.');
        setIsLoading(false);
        return;
      }

      // Successful login: refresh router context and redirect to dashboard
      router.refresh();
      router.push('/dashboard');
    } catch {
      setError('Terjadi kendala saat menghubungkan ke server. Silakan coba kembali.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans items-center justify-center bg-zinc-50 dark:bg-[#0a0a0a] overflow-hidden relative p-4">
      {/* ── Multi-Layered Ambient Spotlight Beams ── */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-55 dark:opacity-100 transition-opacity">
        <div className="absolute -top-[10%] left-0 w-[280px] sm:w-[440px] h-[110%] bg-gradient-to-b from-cyan-400/30 via-teal-400/18 to-transparent blur-[80px] sm:blur-[110px] animate-beam-1" />
        <div className="absolute -top-[10%] left-0 w-[300px] sm:w-[460px] h-[150%] bg-gradient-to-b from-blue-500/25 via-indigo-500/16 to-transparent blur-[85px] sm:blur-[120px] animate-beam-2" />
        <div className="absolute -top-[10%] left-0 w-[360px] sm:w-[540px] h-[90%] bg-gradient-to-b from-sky-400/25 via-blue-500/15 to-transparent blur-[95px] sm:blur-[135px] animate-beam-4" />
        <div className="absolute -top-[10%] left-0 w-[320px] sm:w-[480px] h-[130%] bg-gradient-to-b from-violet-500/25 via-indigo-500/15 to-transparent blur-[85px] sm:blur-[125px] animate-beam-5" />
        <div className="absolute -top-[10%] left-0 w-[340px] sm:w-[500px] h-[140%] bg-gradient-to-b from-emerald-400/25 via-teal-300/15 to-transparent blur-[80px] sm:blur-[110px] animate-beam-6" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-7 sm:p-9 shadow-sm">
          {/* Header Brand & Subtitle */}
          <div className="mb-7 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Image
                src="/Logo.webp"
                alt="view360 Logo"
                width={44}
                height={44}
                className="w-10 h-10 object-contain brightness-0 dark:brightness-100 transition-all"
              />
              <span className={`${bricolage.className} text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white`}>
                view360
              </span>
            </div>

            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-1.5 tracking-tight">
              Akses akun
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">
              Masuk untuk mengelola foto panorama 360° dan peta spasial
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Field 1: Email */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Alamat email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  spellCheck={false}
                  autoComplete="email"
                  className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-none"
                  placeholder="nama@perusahaan.com"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Kata sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all shadow-none"
                  placeholder="Masukkan kata sandi"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div role="alert" aria-live="polite" className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-xs sm:text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-start gap-2">
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full py-2.5 text-sm font-semibold rounded-xl"
              >
                Masuk ke sistem
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
