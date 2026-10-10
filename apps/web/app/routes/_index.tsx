import type { MetaFunction } from '@remix-run/react';

export const meta: MetaFunction = () => [
  { title: 'Spenditure — Personal Finance' },
  { name: 'description', content: 'Track your spending, own your money.' },
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-sm w-full">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-forest-600 dark:text-amber-400">
            Spenditure
          </h1>
          <p className="text-forest-500 dark:text-parchment-200 text-sm">
            Track your spending, own your money.
          </p>
        </div>

        <div className="bg-white dark:bg-forest-700 rounded-2xl p-8 shadow-sm border border-parchment-200 dark:border-forest-600 space-y-4">
          <p className="text-forest-600 dark:text-parchment-100 text-sm font-medium">
            Welcome back
          </p>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Enter PIN"
            className="w-full text-center text-2xl tracking-widest rounded-xl border border-parchment-300 dark:border-forest-500 bg-parchment-50 dark:bg-forest-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button className="w-full bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 font-semibold py-3 rounded-xl hover:bg-forest-700 dark:hover:bg-amber-400 transition-colors">
            Unlock
          </button>
        </div>

        <p className="text-xs text-forest-400 dark:text-parchment-400">
          v0.0.1 — build in progress
        </p>
      </div>
    </div>
  );
}
