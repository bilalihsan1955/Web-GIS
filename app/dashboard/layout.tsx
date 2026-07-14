'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, Users, LogOut, Image as ImageIcon, Loader2, Map } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<{company_name?: string, company_logo?: string} | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    if (pathname === '/dashboard/login') {
      setLoading(false);
      setIsLoadingRole(false);
      return;
    }

    async function checkAuth() {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error || !currentUser) {
        router.push('/dashboard/login');
        return;
      }
      setUser(currentUser);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single();
        
      if (roleData) {
        setRole(roleData.role);
      }
      
      try {
        const profileRes = await fetch('/api/dashboard/company-profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile) {
            setCompanyProfile(profileData.profile);
          }
        }
      } catch (err) {
        console.error("Failed to fetch company profile", err);
      } finally {
        setIsLoadingProfile(false);
      }

      setIsLoadingRole(false);
      setLoading(false);
    }
    
    checkAuth();
  }, [pathname, router, supabase]);

  if (pathname === '/dashboard/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white font-sans overflow-hidden relative">

      {/* ── LIQUID-GLASS SIDEBAR ── */}
      <aside className="w-64 m-4 mr-0 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-none dark:shadow-2xl flex flex-col shrink-0 relative z-10 overflow-hidden">
        <div className="h-20 flex items-center px-6 border-b border-slate-200 dark:border-white/10 shrink-0">
          {isLoadingProfile ? (
            <div className="w-10 h-10 rounded-xl mr-3 shrink-0 animate-pulse bg-slate-200 dark:bg-white/10"></div>
          ) : companyProfile?.company_logo ? (
            <div className="w-10 h-10 rounded-xl mr-3 shadow-md shrink-0 overflow-hidden flex items-center justify-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <img src={companyProfile.company_logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl mr-3 shadow-[0_0_15px_rgba(34,211,238,0.3)] shrink-0 overflow-hidden w-10 h-10 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
          )}
          
          {isLoadingProfile ? (
            <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse"></div>
          ) : (
            <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight line-clamp-2">
              {companyProfile?.company_name || 'WebGIS'}
            </span>
          )}
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className={`flex items-center px-4 py-3 rounded-xl group font-medium transition-colors duration-150 border ${pathname === '/dashboard' ? 'bg-cyan-50 dark:bg-white/10 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-white/10 shadow-inner' : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <LayoutDashboard className={`h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard' ? 'text-cyan-400' : ''}`} />
            Overview
          </Link>
          
          {isLoadingRole && (
            <div className="flex items-center px-4 py-3 rounded-xl animate-pulse bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-white/10 mr-3"></div>
              <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded"></div>
            </div>
          )}
          
          {!isLoadingRole && (
            <Link 
              href="/dashboard/preview" 
              className={`flex items-center px-4 py-3 rounded-xl group font-medium transition-colors duration-150 border ${pathname === '/dashboard/preview' ? 'bg-cyan-50 dark:bg-white/10 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-white/10 shadow-inner' : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Map className={`h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard/preview' ? 'text-cyan-400' : ''}`} />
              Map Preview
            </Link>
          )}

          {!isLoadingRole && (role === 'superadmin' || role === 'admin') && (
            <Link 
              href="/dashboard/users" 
              className={`flex items-center px-4 py-3 rounded-xl group font-medium transition-colors duration-150 border ${pathname === '/dashboard/users' ? 'bg-cyan-50 dark:bg-white/10 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-white/10 shadow-inner' : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Users className={`h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard/users' ? 'text-cyan-400' : ''}`} />
              User Management
            </Link>
          )}
        </nav>
        
        {/* THEME TOGGLE */}
        <div className="px-6 pb-6 mt-auto">
          <ThemeToggle />
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA (Navbar + Children) ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* TOP NAVBAR */}
        <header className="h-20 m-4 mb-0 px-8 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-none dark:shadow-lg flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-lg">
            {pathname === '/dashboard' 
              ? 'Dashboard Overview' 
              : pathname.includes('users') 
                ? 'User Management' 
                : pathname.includes('preview')
                  ? 'Map Preview'
                  : 'Admin Area'}
          </h2>
          
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              {loading ? (
                <>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 animate-pulse rounded mb-1"></div>
                  <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 animate-pulse rounded-full mt-1"></div>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-800 dark:text-white drop-shadow-sm dark:drop-shadow-md">{user?.email}</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    role === 'superadmin' 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                      : role === 'admin' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'
                  }`}>
                    {role}
                  </span>
                </>
              )}
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-white/10"></div>
            <LogoutButton />
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
