'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/dashboard/login');
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center text-sm font-medium text-slate-300 hover:text-red-400 transition-colors"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </button>

      {/* ── LOGOUT MODAL ── */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] w-screen h-screen flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div 
            className="relative bg-slate-900/90 border border-white/20 p-8 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30 mb-2">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white drop-shadow-md">Confirm Sign Out</h3>
              <p className="text-sm text-slate-400 drop-shadow-sm leading-relaxed">
                Are you sure you want to sign out of your account? You will need to log in again to access the dashboard.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="flex-1 px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSignOut}
                  className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center shadow-lg shadow-red-500/10"
                >
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>, 
        document.body
      )}
    </>
  );
}
