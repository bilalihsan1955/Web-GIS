'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('webgis_user_role');
    }
    router.refresh();
    router.push('/dashboard/login');
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}
