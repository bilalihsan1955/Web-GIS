'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, Users, LogOut, Image as ImageIcon, Loader2, Map, Globe2, Compass, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/auth/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<{company_name?: string, company_logo?: string} | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('webgis_user_role');
      if (cached) setRole(cached);
      const savedCollapsed = localStorage.getItem('webgis_sidebar_collapsed');
      if (savedCollapsed === 'true') {
        setIsDesktopCollapsed(true);
      }
    }
    if (pathname === '/dashboard/login') {
      setLoading(false);
      setIsLoadingRole(false);
      setIsLoadingProfile(false);
      return;
    }

    async function fetchUserData() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        setIsLoadingRole(false);
        setIsLoadingProfile(false);
        return;
      }
      setUser(currentUser);

      // Parallelize role query & company profile fetch (async-parallel / vercel-react-best-practices)
      const [roleRes, profileRes] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .single(),
        fetch('/api/dashboard/company-profile').catch(err => {
          console.error("Failed to fetch company profile", err);
          return null;
        })
      ]);

      if (roleRes?.data) {
        setRole(roleRes.data.role);
        if (typeof window !== 'undefined') {
          localStorage.setItem('webgis_user_role', roleRes.data.role);
        }
      }

      if (profileRes && profileRes.ok) {
        try {
          const profileData = await profileRes.json();
          if (profileData.profile) {
            setCompanyProfile(profileData.profile);
          }
        } catch (err) {
          console.error("Failed to parse company profile json", err);
        }
      }

      // Batch state updates after parallel fetch completes
      setIsLoadingProfile(false);
      setIsLoadingRole(false);
      setLoading(false);
    }
    
    fetchUserData();
  }, [pathname, supabase]);

  const toggleDesktopSidebar = () => {
    const nextState = !isDesktopCollapsed;
    setIsDesktopCollapsed(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('webgis_sidebar_collapsed', String(nextState));
    }
  };

  if (pathname === '/dashboard/login') {
    return <>{children}</>;
  }

  const renderSidebarNavigation = (isCollapsed = false) => (
    <>
      {/* LOGO AREA */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'} border-b border-zinc-200 dark:border-zinc-800 shrink-0 transition-all duration-300`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : 'pr-2'}`}>
          {isLoadingProfile || isLoadingRole ? (
            <div className={`w-8 h-8 ${isCollapsed ? '' : 'mr-3'} shrink-0 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg`}></div>
          ) : role === 'superadmin' ? (
            <div className={`bg-zinc-950 dark:bg-white ${isCollapsed ? '' : 'mr-3'} shrink-0 w-8 h-8 flex items-center justify-center rounded-lg`} title="Geo Admin">
              <Compass className="w-5 h-5 text-white dark:text-zinc-950" />
            </div>
          ) : companyProfile?.company_logo ? (
            <div className={`w-8 h-8 ${isCollapsed ? '' : 'mr-3'} shrink-0 overflow-hidden flex items-center justify-center bg-white dark:bg-transparent rounded-lg`} title={companyProfile.company_name || 'WebGIS Platform'}>
              <Image src={companyProfile.company_logo} alt="Logo" width={32} height={32} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`bg-zinc-950 dark:bg-white ${isCollapsed ? '' : 'mr-3'} shrink-0 w-8 h-8 flex items-center justify-center rounded-lg`} title={companyProfile?.company_name || 'WebGIS Platform'}>
              <Compass className="w-5 h-5 text-white dark:text-zinc-950" />
            </div>
          )}
          
          {!isCollapsed && (
            isLoadingProfile || isLoadingRole ? (
              <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-md"></div>
            ) : (
              <span className="font-bold text-zinc-950 dark:text-white text-base tracking-tight truncate">
                {role === 'superadmin' ? 'Geo Admin' : (companyProfile?.company_name || 'WebGIS Platform')}
              </span>
            )
          )}
        </div>
        {!isCollapsed && (
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* NAVIGATION */}
      <nav className={`flex-1 py-6 ${isCollapsed ? 'px-3' : 'px-4'} space-y-2 overflow-y-auto custom-scrollbar transition-all duration-300`}>
        <Link 
          href="/dashboard" 
          title={isCollapsed ? t('overview') || 'Overview' : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} group font-medium transition-colors duration-150 rounded-xl min-h-[46px] ${pathname === '/dashboard' ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
        >
          <LayoutDashboard className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'} transition-transform duration-300 group-hover:scale-110 shrink-0 ${pathname === '/dashboard' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
          {!isCollapsed && <span className="truncate">{t('overview')}</span>}
        </Link>
        
        {isLoadingRole && (
          <>
            <div className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} rounded-xl animate-pulse min-h-[46px]`}>
              <div className={`h-4 w-4 bg-zinc-200 dark:bg-zinc-800 ${isCollapsed ? '' : 'mr-3'} shrink-0`}></div>
              {!isCollapsed && <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800"></div>}
            </div>
            {(role === 'superadmin' || role === 'admin') && (
              <div className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} rounded-xl animate-pulse min-h-[46px]`}>
                <div className={`h-4 w-4 bg-zinc-200 dark:bg-zinc-800 ${isCollapsed ? '' : 'mr-3'} shrink-0`}></div>
                {!isCollapsed && <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800"></div>}
              </div>
            )}
          </>
        )}
        
        {!isLoadingRole && (
          <Link 
            href="/dashboard/preview" 
            title={isCollapsed ? t('mapPreview') || 'Map Preview' : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} group font-medium transition-colors duration-150 rounded-xl min-h-[46px] ${pathname === '/dashboard/preview' ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
          >
            <Map className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'} transition-transform duration-300 group-hover:scale-110 shrink-0 ${pathname === '/dashboard/preview' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
            {!isCollapsed && <span className="truncate">{t('mapPreview')}</span>}
          </Link>
        )}

        {!isLoadingRole && (role === 'superadmin' || role === 'admin') && (
          <Link 
            href="/dashboard/users" 
            title={isCollapsed ? t('userManagement') || 'User Management' : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} group font-medium transition-colors duration-150 rounded-xl min-h-[46px] ${pathname === '/dashboard/users' ? 'text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800/80' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}
          >
            <Users className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'} transition-transform duration-300 group-hover:scale-110 shrink-0 ${pathname === '/dashboard/users' ? 'text-cyan-600 dark:text-cyan-400' : ''}`} />
            {!isCollapsed && <span className="truncate">{t('userManagement')}</span>}
          </Link>
        )}
      </nav>
      
      {/* TOGGLES & MOBILE LOGOUT */}
      <div className={`${isCollapsed ? 'px-3' : 'px-6'} pb-6 mt-auto shrink-0 space-y-3 transition-all duration-300`}>
        <div className="md:hidden">
          <LogoutButton fullWidth />
        </div>
        <div className={`border border-zinc-200 dark:border-zinc-800 p-1 flex ${isCollapsed ? 'flex-col items-center gap-1.5 rounded-2xl' : 'items-center justify-between rounded-[20px]'} bg-zinc-50 dark:bg-zinc-900/50 transition-all duration-300`}>
          <ThemeToggle collapsed={isCollapsed} />
          {!isCollapsed && <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0"></div>}
          <LanguageToggle collapsed={isCollapsed} />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] bg-zinc-50 dark:bg-[#09090B] text-zinc-950 dark:text-zinc-50 font-sans overflow-hidden">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={`hidden md:flex ${isDesktopCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-[#09090B] border-r border-zinc-200 dark:border-zinc-800 flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out`}>
        {renderSidebarNavigation(isDesktopCollapsed)}
      </aside>

      {/* ── MOBILE BACKDROP & SLIDING DRAWER ── */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-xs z-40 md:hidden animate-fade-in" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      <aside className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#09090B] border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-50 md:hidden transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderSidebarNavigation(false)}
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 bg-white dark:bg-[#09090B]">
        
        {/* TOP NAVBAR */}
        <header className="h-16 px-4 sm:px-6 md:px-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#09090B]">
          <div className="flex items-center min-w-0 mr-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mr-2 shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleDesktopSidebar}
              className="hidden md:flex p-2 -ml-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all mr-3 shrink-0 items-center justify-center border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              title={isDesktopCollapsed ? t('expandSidebar') || 'Perluas Sidebar' : t('collapseSidebar') || 'Tutup Sidebar'}
              aria-label="Toggle Desktop Sidebar"
            >
              {isDesktopCollapsed ? <PanelLeftOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white tracking-tight truncate">
              {pathname === '/dashboard' 
                ? `Dashboard ${t('overview')}` 
                : pathname.includes('users') 
                  ? t('userManagement') 
                  : pathname.includes('preview')
                    ? t('mapPreview')
                    : t('adminArea')}
            </h2>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-6 shrink-0">
            <div className="flex flex-col items-end">
              {loading ? (
                <>
                  <div className="h-3 w-24 sm:w-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse mb-1.5 rounded-sm"></div>
                  <div className="h-2.5 w-12 sm:w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-sm mt-0.5"></div>
                </>
              ) : (
                <>
                  <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-200 max-w-[140px] sm:max-w-none truncate">{user?.email}</span>
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 tracking-wider mt-0.5 capitalize">
                    {role}
                  </span>
                </>
              )}
            </div>
            <div className="hidden md:block h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 custom-scrollbar bg-zinc-50/50 dark:bg-[#09090B]">
          {children}
        </div>
      </main>
    </div>
  );
}
