import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { api, isAuthenticated } from '~/lib/api';
import { formatCurrency } from '@spenditure/utils';
import { BottomNav } from '~/components/BottomNav';
import { AddTransactionSheet } from '~/components/AddTransactionSheet';

export const meta: MetaFunction = () => [{ title: 'Transactions — Spenditure' }];

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  children: Array<{ id: string; name: string; type: string; icon: string; color: string }>;
}

interface Account {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  accountId: string;
  categoryId: string | null;
  account?: { name: string };
  category?: { name: string; icon: string; color: string } | null;
}

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
}

type TxType = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

function getMonthBounds(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  return { from, to };
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDate(txns: Transaction[]): Array<{ label: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txns) {
    const key = new Date(tx.date).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([, items]) => ({
    label: dateLabel(items[0].date),
    items,
  }));
}

export default function Transactions() {
  const navigate = useNavigate();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [filter, setFilter] = useState<TxType>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const monthLabel = viewDate.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });

  const buildTxParams = useCallback((cursor?: string) => {
    const { from, to } = getMonthBounds(viewDate.getFullYear(), viewDate.getMonth());
    const p = new URLSearchParams({ limit: '100', dateFrom: from, dateTo: to });
    if (filter !== 'ALL') p.set('type', filter);
    if (accountFilter !== 'ALL') p.set('accountId', accountFilter);
    if (search) p.set('search', search);
    if (cursor) p.set('cursor', cursor);
    return p.toString();
  }, [viewDate, filter, accountFilter, search]);

  const buildSummaryParams = useCallback(() => {
    const { from, to } = getMonthBounds(viewDate.getFullYear(), viewDate.getMonth());
    const p = new URLSearchParams({ dateFrom: from, dateTo: to });
    if (accountFilter !== 'ALL') p.set('accountId', accountFilter);
    if (filter !== 'ALL') p.set('type', filter);
    return p.toString();
  }, [viewDate, filter, accountFilter]);

  const load = useCallback(() => {
    setLoading(true);
    setTxns([]);
    setNextCursor(null);

    Promise.all([
      api.get<unknown>(`/api/v1/transactions?${buildTxParams()}`),
      api.get<unknown>('/api/v1/accounts'),
      api.get<unknown>('/api/v1/categories'),
      api.get<unknown>(`/api/v1/transactions/summary?${buildSummaryParams()}`),
    ])
      .then(([txRaw, accsRaw, catsRaw, sumRaw]) => {
        const env = txRaw as { data?: Transaction[]; nextCursor?: string | null; total?: number };
        setTxns(env.data ?? []);
        setNextCursor(env.nextCursor ?? null);
        setTotal(env.total ?? 0);
        setAccounts(accsRaw as Account[]);
        setCategories(catsRaw as Category[]);
        setSummary(sumRaw as Summary);
      })
      .catch(() => navigate('/auth/pin'))
      .finally(() => setLoading(false));
  }, [navigate, buildTxParams, buildSummaryParams]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    api.get<unknown>(`/api/v1/transactions?${buildTxParams(nextCursor)}`)
      .then((raw) => {
        const env = raw as { data?: Transaction[]; nextCursor?: string | null };
        setTxns((prev) => [...prev, ...(env.data ?? [])]);
        setNextCursor(env.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [nextCursor, loadingMore, buildTxParams]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    load();
  }, [load, navigate]);

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const grouped = groupByDate(txns);

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-parchment-100/90 dark:bg-forest-800/90 backdrop-blur-sm border-b border-parchment-200 dark:border-forest-700 px-4 py-3 space-y-3">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-forest-600 dark:text-amber-400">Transactions</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-parchment-200 dark:hover:bg-forest-700 text-forest-400 dark:text-parchment-400"
              aria-label="Previous month"
            >‹</button>
            <span className="text-sm font-medium text-forest-600 dark:text-parchment-100 min-w-[110px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-parchment-200 dark:hover:bg-forest-700 text-forest-400 dark:text-parchment-400"
              aria-label="Next month"
            >›</button>
          </div>
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {(['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === t
                  ? 'bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900'
                  : 'bg-parchment-200 dark:bg-forest-700 text-forest-400 dark:text-parchment-400'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'INCOME' ? 'Income' : t === 'EXPENSE' ? 'Expense' : 'Transfer'}
            </button>
          ))}
        </div>

        {/* Account filter */}
        {accounts.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setAccountFilter('ALL')}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                accountFilter === 'ALL'
                  ? 'bg-amber-500 text-white'
                  : 'bg-parchment-200 dark:bg-forest-700 text-forest-400 dark:text-parchment-400'
              }`}
            >
              All Accounts
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setAccountFilter(acc.id)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  accountFilter === acc.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-parchment-200 dark:bg-forest-700 text-forest-400 dark:text-parchment-400'
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          type="search"
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-parchment-200 dark:border-forest-600 bg-white dark:bg-forest-700 px-4 py-2 text-sm text-forest-600 dark:text-parchment-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{ fontSize: '16px' }}
        />

        {/* Summary bar */}
        {summary && (filter === 'ALL' || filter === 'INCOME' || filter === 'EXPENSE') && (
          <div className="flex gap-3 pt-0.5">
            {filter !== 'EXPENSE' && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                In: {formatCurrency(summary.totalIncome, 'UGX')}
              </span>
            )}
            {filter !== 'INCOME' && (
              <span className="text-xs font-medium text-red-500 tabular-nums">
                Out: {formatCurrency(summary.totalExpenses, 'UGX')}
              </span>
            )}
            <span className="text-xs text-forest-400 dark:text-parchment-400 ml-auto tabular-nums">
              {txns.length}{total > txns.length ? ` of ${total}` : ''} txns
            </span>
          </div>
        )}
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <p className="text-center text-sm text-forest-400 dark:text-parchment-400 py-16 px-4">
            No transactions for {monthLabel}.
          </p>
        ) : (
          <>
            {grouped.map(({ label, items }) => (
              <section key={label}>
                <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-forest-400 dark:text-parchment-400 uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="text-xs text-forest-400 dark:text-parchment-400 tabular-nums">
                    {items.length} txn{items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ul className="bg-white dark:bg-forest-700 mx-4 rounded-xl overflow-hidden border border-parchment-200 dark:border-forest-600 divide-y divide-parchment-100 dark:divide-forest-600">
                  {items.map((tx) => (
                    <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{
                          backgroundColor: (tx.category?.color ?? '#6B7280') + '22',
                          color: tx.category?.color ?? '#6B7280',
                        }}
                      >
                        {tx.category?.icon ?? (tx.type === 'TRANSFER' ? '⇄' : tx.type === 'INCOME' ? '↑' : '↓')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-forest-600 dark:text-parchment-100 truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {tx.account && (
                            <span className="text-xs text-forest-400 dark:text-parchment-400 bg-parchment-100 dark:bg-forest-600 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                              {tx.account.name}
                            </span>
                          )}
                          {tx.category && (
                            <span className="text-xs text-forest-400 dark:text-parchment-400 truncate">
                              {tx.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                          tx.type === 'INCOME'
                            ? 'text-green-600'
                            : tx.type === 'TRANSFER'
                            ? 'text-blue-500'
                            : 'text-red-500'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '⇄' : '−'}
                        {formatCurrency(tx.amount, 'UGX')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!nextCursor && txns.length > 0 && (
              <p className="text-center text-xs text-forest-400 dark:text-parchment-400 py-4">
                All {txns.length} transactions loaded
              </p>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowSheet(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 shadow-lg flex items-center justify-center text-2xl font-light z-30 active:scale-95 transition-transform"
        aria-label="Add transaction"
      >
        +
      </button>

      <BottomNav current="/transactions" />

      {showSheet && (
        <AddTransactionSheet
          accounts={accounts}
          categories={categories}
          onClose={() => setShowSheet(false)}
          onSuccess={() => { setShowSheet(false); load(); }}
        />
      )}
    </div>
  );
}
