import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { isAuthenticated, api } from '~/lib/api';
import { BottomNav } from '~/components/BottomNav';

export const meta: MetaFunction = () => [{ title: 'Accounts — Spenditure' }];

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
  isArchived: boolean;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: string;
  amount: number;
  category?: { name: string };
}

const TYPE_LABELS: Record<string, string> = {
  BANK: 'Bank',
  MOBILE_MONEY: 'Mobile Money',
  CASH: 'Cash',
  SAVINGS: 'Savings',
  INVESTMENT: 'Investment',
};

function formatUGX(n: number) {
  return 'UGX ' + Math.abs(n).toLocaleString('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Account | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    api.get<Account[]>('/api/v1/accounts').then(setAccounts).catch(console.error);
  }, [navigate]);

  function selectAccount(acct: Account) {
    setSelected(acct);
    setTxLoading(true);
    api
      .get<{ data: Transaction[] }>(`/api/v1/transactions?accountId=${acct.id}&limit=10`)
      .then((res) => { setTxns(res.data ?? []); setTxLoading(false); })
      .catch(() => setTxLoading(false));
  }

  function refreshSelected(acct: Account) {
    selectAccount(acct);
    api.get<Account[]>('/api/v1/accounts').then(setAccounts).catch(console.error);
  }

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-900 flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-forest-600 px-4 py-4">
        <div className="flex items-center justify-between">
          {selected ? (
            <button onClick={() => setSelected(null)} className="text-white/70 text-sm">← Back</button>
          ) : (
            <h1 className="text-white font-semibold">Accounts</h1>
          )}
          {!selected && (
            <button
              onClick={() => setShowAdd(true)}
              className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg"
            >
              +
            </button>
          )}
        </div>
        {selected && (
          <div className="mt-1">
            <p className="text-white font-semibold">{selected.name}</p>
            <p className="text-amber-400 font-bold text-xl">{formatUGX(selected.balance)}</p>
          </div>
        )}
      </header>

      <div className="flex-1 p-4">
        {!selected ? (
          <div className="space-y-3">
            {accounts.filter((a) => !a.isArchived).map((acct) => (
              <button
                key={acct.id}
                onClick={() => selectAccount(acct)}
                className="w-full bg-white dark:bg-forest-900 rounded-2xl p-4 shadow-sm flex items-center gap-4 text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: acct.color }}
                >
                  {acct.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-forest-600 dark:text-parchment-100 truncate">{acct.name}</p>
                  <p className="text-xs text-gray-500">{TYPE_LABELS[acct.type] ?? acct.type}</p>
                </div>
                <p className="font-semibold text-forest-600 dark:text-amber-400 text-sm">{formatUGX(acct.balance)}</p>
              </button>
            ))}
            {accounts.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-12">No accounts yet</p>
            )}
          </div>
        ) : (
          <div>
            {selected.type === 'CASH' && (
              <button
                onClick={() => setShowReconcile(true)}
                className="w-full mb-4 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold"
              >
                Reconcile Cash
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Recent Transactions
            </h2>
            {txLoading && <p className="text-center text-sm text-gray-400 py-8">Loading…</p>}
            {!txLoading && txns.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">No transactions yet</p>
            )}
            <div className="space-y-2">
              {txns.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-forest-900 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest-600 dark:text-parchment-100 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.category?.name ?? tx.type}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'TRANSFER' ? 'text-blue-500' : 'text-red-500'
                    }`}
                  >
                    {tx.type === 'EXPENSE' ? '-' : '+'}{formatUGX(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
            {txns.length === 10 && (
              <Link
                to={`/transactions?accountId=${selected.id}`}
                className="block text-center text-sm text-amber-500 mt-4"
              >
                View all transactions →
              </Link>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddAccountSheet
          onClose={() => setShowAdd(false)}
          onAdded={(a) => { setAccounts((prev) => [...prev, a]); setShowAdd(false); }}
        />
      )}
      {showReconcile && selected && (
        <CashReconcileSheet
          account={selected}
          onClose={() => setShowReconcile(false)}
          onDone={(updatedAccount) => {
            setShowReconcile(false);
            setSelected(updatedAccount);
            refreshSelected(updatedAccount);
          }}
        />
      )}
      <BottomNav current="accounts" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash reconciliation sheet
// ---------------------------------------------------------------------------

type Period = 'morning' | 'evening';

function CashReconcileSheet({
  account,
  onClose,
  onDone,
}: {
  account: Account;
  onClose: () => void;
  onDone: (updated: Account) => void;
}) {
  const [period, setPeriod] = useState<Period>('morning');
  const [amountStr, setAmountStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = account.balance;
  const entered = parseFloat(amountStr.replace(/,/g, '')) || 0;
  const diff = entered - current;
  const absDiff = Math.abs(diff);
  const diffType = diff >= 0 ? 'INCOME' : 'EXPENSE';
  const hasChange = amountStr !== '' && absDiff > 0;
  const noChange = amountStr !== '' && absDiff === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amountStr || absDiff === 0) { onClose(); return; }
    setLoading(true);
    setError('');
    try {
      const description =
        period === 'morning'
          ? 'Cash reconciliation — morning opening'
          : 'Cash reconciliation — evening closing';
      await api.post('/api/v1/transactions', {
        accountId: account.id,
        type: diffType,
        amount: absDiff,
        description,
        date: new Date().toISOString(),
      });
      const updated = await api.get<Account>(`/api/v1/accounts/${account.id}`);
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white dark:bg-forest-900 rounded-t-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-forest-600 dark:text-parchment-100 text-lg">Reconcile Cash</h2>
          <button type="button" onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {/* Morning / Evening toggle */}
        <div className="flex rounded-xl overflow-hidden border border-parchment-200 dark:border-forest-700">
          {(['morning', 'evening'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                period === p
                  ? 'bg-forest-600 text-white'
                  : 'text-forest-600 dark:text-parchment-100'
              }`}
            >
              {p === 'morning' ? '☀️ Morning' : '🌙 Evening'}
            </button>
          ))}
        </div>

        {/* Current balance display */}
        <div className="bg-parchment-100 dark:bg-forest-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-0.5">Current recorded balance</p>
          <p className="text-lg font-bold text-forest-600 dark:text-amber-400">{formatUGX(current)}</p>
        </div>

        {/* Cash count input */}
        <div>
          <label className="block text-sm font-medium text-forest-600 dark:text-parchment-100 mb-1.5">
            How much cash do you have now?
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">UGX</span>
            <input
              type="number"
              min="0"
              step="500"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-full pl-14 pr-4 py-3 rounded-xl border border-parchment-200 dark:border-forest-700 bg-transparent text-forest-600 dark:text-parchment-100 text-base focus:outline-none focus:border-amber-500"
              style={{ fontSize: 16 }}
              autoFocus
            />
          </div>
        </div>

        {/* Difference preview */}
        {amountStr !== '' && (
          <div className={`rounded-xl p-4 text-sm ${
            noChange
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : diff < 0
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          }`}>
            {noChange && '✓ Balance matches — no adjustment needed'}
            {hasChange && diff < 0 && `Cash spent / missing: ${formatUGX(absDiff)} will be recorded as an expense`}
            {hasChange && diff > 0 && `Cash surplus: ${formatUGX(absDiff)} will be recorded as income`}
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || amountStr === ''}
          className="w-full py-3 rounded-xl bg-forest-600 text-white font-semibold disabled:opacity-40"
        >
          {loading ? 'Saving…' : noChange ? 'All good, close' : 'Record & close'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add account sheet
// ---------------------------------------------------------------------------

function AddAccountSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (a: Account) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [color, setColor] = useState('#1A2B22');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const acct = await api.post<Account>('/api/v1/accounts', { name, type, color, icon: 'wallet', currency: 'UGX' });
      onAdded(acct);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative bg-white dark:bg-forest-900 rounded-t-3xl p-6 space-y-4">
        <h2 className="font-semibold text-forest-600 dark:text-parchment-100">New Account</h2>
        <input
          className="w-full border border-gray-200 dark:border-forest-700 rounded-xl px-4 py-3 bg-transparent text-sm"
          placeholder="Account name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ fontSize: 16 }}
        />
        <select
          className="w-full border border-gray-200 dark:border-forest-700 rounded-xl px-4 py-3 bg-white dark:bg-forest-800 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ fontSize: 16 }}
        >
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 rounded cursor-pointer" />
        </div>
        <button
          type="submit"
          disabled={loading || !name}
          className="w-full py-3 rounded-xl bg-forest-600 text-white font-medium disabled:opacity-50"
        >
          {loading ? 'Adding…' : 'Add Account'}
        </button>
      </form>
    </div>
  );
}
