import { useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { isAuthenticated, logout } from '~/lib/api';
import { BottomNav } from '~/components/BottomNav';

export const meta: MetaFunction = () => [{ title: 'Settings — Spenditure' }];

export default function SettingsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) navigate('/auth/pin');
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/pin');
  };

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 flex flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 bg-parchment-100/90 dark:bg-forest-800/90 backdrop-blur-sm border-b border-parchment-200 dark:border-forest-700">
        <h1 className="text-base font-bold text-forest-600 dark:text-amber-400">Settings</h1>
      </header>
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4 space-y-3">
        <p className="text-xs font-semibold text-forest-400 dark:text-parchment-400 uppercase tracking-wider">
          Account
        </p>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-forest-700 border border-parchment-200 dark:border-forest-600 text-sm text-red-500 font-medium"
        >
          Sign out
        </button>
        <p className="text-xs font-semibold text-forest-400 dark:text-parchment-400 uppercase tracking-wider pt-2">
          App
        </p>
        <div className="px-4 py-3 rounded-xl bg-white dark:bg-forest-700 border border-parchment-200 dark:border-forest-600 text-sm text-forest-400 dark:text-parchment-400">
          More settings — coming in Phase 3.
        </div>
      </div>
      <BottomNav current="/settings" />
    </div>
  );
}
