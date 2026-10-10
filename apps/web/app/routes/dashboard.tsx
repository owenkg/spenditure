import { useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { api, isAuthenticated, logout } from '~/lib/api';
import { formatCurrency } from '@spenditure/utils';
import { BottomNav } from '~/components/BottomNav';

export const meta: MetaFunction = () => [{ title: 'Dashboard — Spenditure' }];

interface Account {
  id: string; name: string; type: string; balance: number;
  currency: string; color: string; icon: string;
  _count?: { transactions: number };
}
interface Transaction {
  id: string; type: string; amount: number; description: string;
  date: string; accountId: string;
}
interface Summary { totalIncome: number; totalExpenses: number; netFlow: number }
interface ChartDay { date: string; income: number; expense: number }
interface Budget {
  id: string; amount: number; spent: number; remaining: number;
  period: string; category: { name: string; color: string; icon: string };
}

const TYPE_ICONS: Record<string, string> = {
  BANK: '🏦', MOBILE_MONEY: '📱', CASH: '💵', SAVINGS: '🏦', INVESTMENT: '📈',
};

function SpendingChart({ data }: { data: ChartDay[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const H = 80;
  const barW = 10;
  const gap = 4;
  const groupW = barW * 2 + gap + 6;
  const W = data.length * groupW;

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: H + 20 }}>
      {data.map((d, i) => {
        const x = i * groupW;
        const inH = Math.max(2, (d.income / maxVal) * H);
        const exH = Math.max(2, (d.expense / maxVal) * H);
        const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-UG', { weekday: 'short' }).slice(0, 1);
        return (
          <g key={d.date}>
            <rect x={x} y={H - inH} width={barW} height={inH} rx={2} className="fill-emerald-500 opacity-80" />
            <rect x={x + barW + gap} y={H - exH} width={barW} height={exH} rx={2} className="fill-red-400 opacity-80" />
            <text x={x + barW} y={H + 14} textAnchor="middle" fontSize={8} className="fill-current text-forest-400 dark:text-parchment-500">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  const pct = Math.min(100, budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0);
  const over = pct >= 100;
  return (
    <div className="bg-white dark:bg-forest-700 rounded-xl p-4 border border-parchment-200 dark:border-forest-600">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
            style={{ backgroundColor: budget.category.color + '22' }}
          >
            {budget.category.icon}
          </span>
          <span className="text-sm font-medium text-forest-600 dark:text-parchment-100 truncate max-w-[120px]">
            {budget.category.name}
          </span>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${over ? 'text-red-500' : 'text-forest-400 dark:text-parchment-400'}`}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-parchment-200 dark:bg-forest-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-forest-400 dark:text-parchment-400 tabular-nums">
          {formatCurrency(budget.spent, 'UGX')} spent
        </span>
        <span className="text-xs text-forest-400 dark:text-parchment-400 tabular-nums">
          {formatCurrency(budget.amount, 'UGX')}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chartData, setChartData] = useState<ChartDay[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    Promise.all([
      api.get<Account[]>('/api/v1/accounts'),
      api.get<{ data: Transaction[] }>(`/api/v1/transactions?limit=5`),
      api.get<Summary>(`/api/v1/transactions/summary?dateFrom=${monthStart}&dateTo=${monthEnd}`),
      api.get<ChartDay[]>('/api/v1/transactions/chart?days=7'),
      api.get<Budget[]>('/api/v1/budgets'),
    ])
      .then(([accs, txns, sum, chart, bdgs]) => {
        setAccounts(accs as Account[]);
        setRecentTxns(((txns as unknown as { data: Transaction[] }).data) ?? []);
        setSummary(sum as Summary);
        setChartData(chart as ChartDay[]);
        setBudgets((bdgs as Budget[]).slice(0, 4));
      })
      .catch(() => navigate('/auth/pin'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment-100 dark:bg-forest-800">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-parchment-100/90 dark:bg-forest-800/90 backdrop-blur-sm border-b border-parchment-200 dark:border-forest-700">
          <h1 className="text-lg font-bold text-forest-600 dark:text-amber-400 tracking-tight">Spenditure</h1>
          <button
            onClick={async () => { await logout(); navigate('/auth/pin'); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-forest-400 dark:text-parchment-400 hover:bg-parchment-200 dark:hover:bg-forest-700 transition-colors"
            aria-label="Logout"
          >
            <span className="text-lg">↩</span>
          </button>
        </header>

        <div className="px-4 pt-4 space-y-4">
          {/* Total balance */}
          <section className="bg-forest-600 dark:bg-forest-700 rounded-2xl p-5 text-white">
            <p className="text-forest-200 text-xs uppercase tracking-wider mb-1">Total Balance</p>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(totalBalance, 'UGX')}</p>
            <p className="text-forest-300 text-sm mt-1">across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
          </section>

          {/* Month summary */}
          {summary && (
            <section className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-forest-700 rounded-xl p-4 border border-parchment-200 dark:border-forest-600">
                <p className="text-xs text-forest-400 dark:text-parchment-400 mb-1">Month In</p>
                <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(summary.totalIncome, 'UGX')}
                </p>
              </div>
              <div className="bg-white dark:bg-forest-700 rounded-xl p-4 border border-parchment-200 dark:border-forest-600">
                <p className="text-xs text-forest-400 dark:text-parchment-400 mb-1">Month Out</p>
                <p className="text-base font-semibold text-red-500 tabular-nums">
                  {formatCurrency(summary.totalExpenses, 'UGX')}
                </p>
              </div>
            </section>
          )}

          {/* 7-day spending chart */}
          {chartData.length > 0 && (
            <section className="bg-white dark:bg-forest-700 rounded-2xl p-4 border border-parchment-200 dark:border-forest-600">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-forest-600 dark:text-parchment-100">Last 7 Days</p>
                <div className="flex items-center gap-3 text-xs text-forest-400 dark:text-parchment-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />In</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />Out</span>
                </div>
              </div>
              <SpendingChart data={chartData} />
            </section>
          )}

          {/* Budget progress */}
          {budgets.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-forest-400 dark:text-parchment-400 uppercase tracking-wider mb-2">Budgets</p>
              <div className="space-y-2">
                {budgets.map((b) => <BudgetCard key={b.id} budget={b} />)}
              </div>
            </section>
          )}

          {/* Accounts */}
          <section>
            <p className="text-xs font-semibold text-forest-400 dark:text-parchment-400 uppercase tracking-wider mb-2">Accounts</p>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="bg-white dark:bg-forest-700 rounded-xl px-4 py-3 flex items-center gap-3 border border-parchment-200 dark:border-forest-600">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: acc.color + '22' }}>
                    {TYPE_ICONS[acc.type] ?? '💳'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest-600 dark:text-parchment-100 truncate">{acc.name}</p>
                    <p className="text-xs text-forest-400 dark:text-parchment-400">{acc._count?.transactions ?? 0} transactions</p>
                  </div>
                  <p className="text-sm font-semibold text-forest-600 dark:text-amber-400 tabular-nums">{formatCurrency(acc.balance, 'UGX')}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recent transactions */}
          <section className="bg-white dark:bg-forest-700 rounded-2xl border border-parchment-200 dark:border-forest-600 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-medium text-forest-600 dark:text-parchment-100">Recent Transactions</p>
              <button
                onClick={() => navigate('/transactions')}
                className="w-7 h-7 rounded-full bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 flex items-center justify-center text-sm font-bold"
              >
                +
              </button>
            </div>
            {recentTxns.length === 0 ? (
              <p className="text-sm text-forest-400 dark:text-parchment-400 text-center py-8 px-4">
                No transactions yet. Tap + to add your first one.
              </p>
            ) : (
              <ul className="divide-y divide-parchment-100 dark:divide-forest-600">
                {recentTxns.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '−'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-forest-600 dark:text-parchment-100 truncate">{tx.description}</p>
                      <p className="text-xs text-forest-400 dark:text-parchment-400">
                        {new Date(tx.date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-forest-600 dark:text-parchment-100">
                      {formatCurrency(tx.amount, 'UGX')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <BottomNav current="/dashboard" />
    </div>
  );
}
