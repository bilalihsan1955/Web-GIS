'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, Users, LogOut, Image as ImageIcon, Loader2, Map, Globe2, Compass } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
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
    <div className="flex h-[100dvh] bg-zinc-50 dark:bg-[#09090B] text-zinc-950 dark:text-zinc-50 font-sans overflow-hidden">

      {/* ── ARCHITECTURAL SIDEBAR ── */}
      <aside className="w-64 bg-white dark:bg-[#09090B] border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 overflow-hidden">
        
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          {isLoadingProfile ? (
            <div className="w-8 h-8 mr-3 shrink-0 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          ) : companyProfile?.company_logo ? (
            <div className="w-8 h-8 mr-3 shrink-0 overflow-hidden flex items-center justify-center bg-white dark:bg-transparent rounded-lg">
              <img src={companyProfile.company_logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="bg-zinc-950 dark:bg-white mr-3 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg">
              <Compass className="w-5 h-5 text-white dark:text-zinc-950" />
            </div>
          )}
          
          {isLoadingProfile ? (
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-md"></div>
          ) : (
            <span className="font-bold text-zinc-950 dark:text-white text-base tracking-tight line-clamp-1">
              {companyProfile?.company_name || 'WebGIS Platform'}
            </span>
          )}
        </div>
        
        {/* NAVIGATION */}
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className={`flex items-center px-4 py-3 group font-medium transition-colors duration-150 rounded-xl ${pathname === '/dashboard' ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
          >
            <LayoutDashboard className={`h-4 w-4 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
            {t('overview')}
          </Link>
          
          {isLoadingRole && (
            <div className="flex items-center px-4 py-3 rounded-xl animate-pulse">
              <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 mr-3"></div>
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800"></div>
            </div>
          )}
          
          {!isLoadingRole && (
            <Link 
              href="/dashboard/preview" 
              className={`flex items-center px-4 py-3 group font-medium transition-colors duration-150 rounded-xl ${pathname === '/dashboard/preview' ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
            >
              <Map className={`h-4 w-4 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard/preview' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
              {t('mapPreview')}
            </Link>
          )}

          {!isLoadingRole && (role === 'superadmin' || role === 'admin') && (
            <Link 
              href="/dashboard/users" 
              className={`flex items-center px-4 py-3 group font-medium transition-colors duration-150 rounded-xl ${pathname === '/dashboard/users' ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
            >
              <Users className={`h-4 w-4 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard/users' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
              {t('userManagement')}
            </Link>
          )}
        </nav>
        
        {/* TOGGLES */}
        <div className="px-6 pb-6 mt-auto">
          <div className="border border-zinc-200 dark:border-zinc-800 p-1 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-[20px]">
            <ThemeToggle />
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0"></div>
            <LanguageToggle />
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 bg-white dark:bg-[#09090B]">
        
        {/* TOP NAVBAR */}
        <header className="h-16 px-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#09090B]">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">
            {pathname === '/dashboard' 
              ? `Dashboard ${t('overview')}` 
              : pathname.includes('users') 
                ? t('userManagement') 
                : pathname.includes('preview')
                  ? t('mapPreview')
                  : t('adminArea')}
          </h2>
          
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              {loading ? (
                <>
                  <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse mb-1.5 rounded-sm"></div>
                  <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-sm mt-0.5"></div>
                </>
              ) : (
                <>
                  <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-200">{user?.email}</span>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 tracking-wider mt-0.5 capitalize">
                    {role}
                  </span>
                </>
              )}
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
            <LogoutButton />
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-zinc-50/50 dark:bg-[#09090B]">
          {children}
        </div>
      </main>
    </div>
  );
}
