import type { MetaFunction } from '@remix-run/react';

export const meta: MetaFunction = () => [{ title: 'Dashboard — Spenditure' }];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 p-4">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-forest-600 dark:text-amber-400">Spenditure</h1>
        <button className="w-9 h-9 rounded-full bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 flex items-center justify-center text-sm font-bold">
          G
        </button>
      </header>

      <section className="bg-forest-600 dark:bg-forest-700 rounded-2xl p-6 text-white mb-6">
        <p className="text-forest-200 text-xs uppercase tracking-wider mb-1">Total Balance</p>
        <p className="text-3xl font-bold">UGX 0</p>
        <p className="text-forest-300 text-sm mt-1">across 0 accounts</p>
      </section>

      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white dark:bg-forest-700 rounded-xl p-4 border border-parchment-200 dark:border-forest-600">
          <p className="text-xs text-forest-400 dark:text-parchment-400 mb-1">This Month In</p>
          <p className="text-lg font-semibold text-forest-600 dark:text-amber-400">UGX 0</p>
        </div>
        <div className="bg-white dark:bg-forest-700 rounded-xl p-4 border border-parchment-200 dark:border-forest-600">
          <p className="text-xs text-forest-400 dark:text-parchment-400 mb-1">This Month Out</p>
          <p className="text-lg font-semibold text-red-500">UGX 0</p>
        </div>
      </section>

      <section className="bg-white dark:bg-forest-700 rounded-2xl border border-parchment-200 dark:border-forest-600 p-4">
        <p className="text-sm font-medium text-forest-600 dark:text-parchment-100 mb-3">Recent Transactions</p>
        <p className="text-sm text-forest-400 dark:text-parchment-400 text-center py-8">
          No transactions yet. Add your first one!
        </p>
      </section>
    </div>
  );
}
