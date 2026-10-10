import { useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { api, ApiError, isAuthenticated } from '~/lib/api';
import { formatCurrency } from '@spenditure/utils';
import { BottomNav } from '~/components/BottomNav';

export const meta: MetaFunction = () => [{ title: 'Recurring — Spenditure' }];

interface Account { id: string; name: string }
interface Category { id: string; name: string; type: string }
interface Recurring {
  id: string; accountId: string; categoryId: string | null; type: string;
  amount: number; description: string; frequency: string;
  nextDate: string; endDate: string | null; isActive: boolean;
}

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};

const BLANK = {
  accountId: '', categoryId: '', type: 'EXPENSE', amount: '',
  description: '', frequency: 'MONTHLY',
  nextDate: new Date().toISOString().slice(0, 10), endDate: '',
};

export default function RecurringPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Recurring[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    Promise.all([
      api.get<Recurring[]>('/api/v1/recurring'),
      api.get<Account[]>('/api/v1/accounts'),
      api.get<Category[]>('/api/v1/categories'),
    ])
      .then(([r, a, c]) => {
        setItems(r as Recurring[]);
        setAccounts(a as Account[]);
        setCategories(c as Category[]);
      })
      .catch(() => navigate('/auth/pin'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const reload = () =>
    api.get<Recurring[]>('/api/v1/recurring').then((r) => setItems(r as Recurring[]));

  const handleToggle = async (item: Recurring) => {
    await api.patch(`/api/v1/recurring/${item.id}`, { isActive: !item.isActive });
    await reload();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/v1/recurring/${id}`);
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId || !form.description || !form.amount) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/api/v1/recurring', {
        accountId: form.accountId,
        categoryId: form.categoryId || undefined,
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description,
        frequency: form.frequency,
        nextDate: form.nextDate,
        endDate: form.endDate || undefined,
      });
      setShowForm(false);
      setForm(BLANK);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'EXPENSE',
  );

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
          <h1 className="text-lg font-bold text-forest-600 dark:text-amber-400 tracking-tight">Recurring</h1>
          <button
            onClick={() => { setShowForm(true); setError(''); }}
            className="w-9 h-9 rounded-full bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 flex items-center justify-center text-xl font-bold"
          >
            +
          </button>
        </header>

        <div className="px-4 pt-4 space-y-3">
          {items.length === 0 && !showForm && (
            <div className="text-center py-16 text-forest-400 dark:text-parchment-500">
              <p className="text-4xl mb-3">↻</p>
              <p className="text-sm">No recurring transactions yet.</p>
              <p className="text-xs mt-1">Tap + to schedule salary, rent, subscriptions…</p>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-forest-700 rounded-xl px-4 py-3 border border-parchment-200 dark:border-forest-600 ${!item.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 text-sm font-bold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {item.type === 'INCOME' ? '+' : '−'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-forest-600 dark:text-parchment-100 truncate">{item.description}</p>
                  <p className="text-xs text-forest-400 dark:text-parchment-400 mt-0.5">
                    {FREQ_LABELS[item.frequency]} · next {new Date(item.nextDate).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-forest-600 dark:text-amber-400">
                  {formatCurrency(item.amount, 'UGX')}
                </p>
              </div>
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => handleToggle(item)}
                  className="text-xs px-3 py-1 rounded-lg border border-parchment-200 dark:border-forest-500 text-forest-400 dark:text-parchment-400 hover:bg-parchment-100 dark:hover:bg-forest-600 transition-colors"
                >
                  {item.isActive ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs px-3 py-1 rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add form sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div className="bg-parchment-100 dark:bg-forest-800 rounded-t-3xl px-4 pt-4 pb-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-forest-600 dark:text-parchment-100">New Recurring</h2>
              <button onClick={() => setShowForm(false)} className="text-forest-400 dark:text-parchment-400 text-xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Type toggle */}
              <div className="flex rounded-xl overflow-hidden border border-parchment-200 dark:border-forest-600">
                {['EXPENSE', 'INCOME'].map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.type === t
                        ? t === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                        : 'text-forest-400 dark:text-parchment-400'
                    }`}
                  >
                    {t === 'INCOME' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>

              <input
                type="text" placeholder="Description" required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              />

              <input
                type="number" placeholder="Amount (UGX)" required min={1} step="any"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              />

              <select
                required value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              >
                <option value="">Select account</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              >
                <option value="">Category (optional)</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              >
                {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>

              <div>
                <label className="text-xs text-forest-400 dark:text-parchment-400 mb-1 block">First occurrence</label>
                <input
                  type="date" required value={form.nextDate}
                  onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                  style={{ fontSize: 16 }}
                />
              </div>

              <div>
                <label className="text-xs text-forest-400 dark:text-parchment-400 mb-1 block">End date (optional)</label>
                <input
                  type="date" value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-forest-700 border-parchment-300 dark:border-forest-500 text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                  style={{ fontSize: 16 }}
                />
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <button
                type="submit" disabled={saving}
                className="w-full py-4 rounded-xl font-semibold text-white bg-forest-600 dark:bg-amber-500 dark:text-forest-900 disabled:opacity-40 transition-colors"
                style={{ fontSize: 16 }}
              >
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav current="/recurring" />
    </div>
  );
}
