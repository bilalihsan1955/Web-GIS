'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/dashboard/login');
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
      >
        <LogOut className="h-4 w-4 mr-2" />
        {t('signOut') || 'Sign Out'}
      </button>

      {/* ── LOGOUT MODAL ── */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('confirmSignOut') || 'Confirm Sign Out'}
        icon={<LogOut className="w-5 h-5 text-red-500" />}
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-6 mt-2">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-[20px] flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30">
              <LogOut className="w-8 h-8" />
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 drop-shadow-sm leading-relaxed text-center">
            {t('signOutWarning') || 'Are you sure you want to sign out of your account? You will need to log in again to access the dashboard.'}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => setIsOpen(false)} 
              className="flex-1 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button 
              onClick={handleSignOut}
              className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center shadow-none dark:shadow-lg dark:shadow-red-500/10 active:scale-95"
            >
              {t('confirmSignOutButton') || 'Yes, Sign Out'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
