'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Radio, Loader2, Eye, EyeOff, MapPin, Layers, Box } from 'lucide-react';

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
      
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-8 md:p-10 shadow-sm">
          <div className="mb-10 text-center">
            <div className="flex justify-center items-center mb-6">
              <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-[16px] flex items-center justify-center border border-cyan-100 dark:border-cyan-500/20">
                <Radio className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
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
