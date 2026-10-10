import { useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { isAuthenticated } from '~/lib/api';
import { BottomNav } from '~/components/BottomNav';

export const meta: MetaFunction = () => [{ title: 'Accounts — Spenditure' }];

export default function AccountsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) navigate('/auth/pin');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 flex flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 bg-parchment-100/90 dark:bg-forest-800/90 backdrop-blur-sm border-b border-parchment-200 dark:border-forest-700">
        <h1 className="text-base font-bold text-forest-600 dark:text-amber-400">Accounts</h1>
      </header>
      <div className="flex-1 flex items-center justify-center pb-20">
        <p className="text-sm text-forest-400 dark:text-parchment-400">
          Accounts management — coming in Phase 3.
        </p>
      </div>
      <BottomNav current="/accounts" />
    </div>
  );
}
