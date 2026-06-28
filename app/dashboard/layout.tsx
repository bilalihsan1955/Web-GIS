'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, Users, LogOut, Image as ImageIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Prevent fetching auth/role layout shell on the login page itself
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
      setIsLoadingRole(false);
      setLoading(false);
    }
    
    checkAuth();
  }, [pathname, router, supabase]);

  if (pathname === '/dashboard/login') {
    return <>{children}</>;
  }



  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden relative">
      {/* ── Dynamic Deep Background ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none z-0" />

      {/* ── LIQUID-GLASS SIDEBAR ── */}
      <aside className="w-64 m-4 mr-0 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col shrink-0 relative z-10 overflow-hidden">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl mr-3 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">GeoAdmin</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className={`flex items-center px-4 py-3 rounded-xl group font-medium transition-all duration-300 ${pathname === '/dashboard' ? 'bg-white/10 text-cyan-300 border border-white/10 shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutDashboard className={`h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard' ? 'text-cyan-400' : ''}`} />
            Overview
          </Link>
          
          {isLoadingRole && (
            <div className="flex items-center px-4 py-3 rounded-xl animate-pulse bg-white/5 border border-white/5">
              <div className="h-5 w-5 rounded-full bg-white/10 mr-3"></div>
              <div className="h-4 w-28 bg-white/10 rounded"></div>
            </div>
          )}
          {!isLoadingRole && (role === 'admin' || role === 'super_admin') && (
            <Link 
              href="/dashboard/users" 
              className={`flex items-center px-4 py-3 rounded-xl group font-medium transition-all duration-300 ${pathname === '/dashboard/users' ? 'bg-white/10 text-cyan-300 border border-white/10 shadow-inner' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Users className={`h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110 ${pathname === '/dashboard/users' ? 'text-cyan-400' : ''}`} />
              User Management
            </Link>
          )}
        </nav>
      </aside>

      {/* ── MAIN CONTENT AREA (Navbar + Children) ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* TOP NAVBAR */}
        <header className="h-20 m-4 mb-0 px-8 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white drop-shadow-lg">
            {pathname === '/dashboard' ? 'Dashboard Overview' : pathname.includes('users') ? 'User Management' : 'Admin Area'}
          </h2>
          
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              {loading ? (
                <>
                  <div className="h-4 w-32 bg-white/10 animate-pulse rounded mb-1"></div>
                  <div className="h-4 w-16 bg-white/10 animate-pulse rounded-full mt-1"></div>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-white drop-shadow-md">{user?.email}</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                    {role}
                  </span>
                </>
              )}
            </div>
            <div className="h-8 w-px bg-white/10"></div>
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
