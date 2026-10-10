import { useState } from 'react';
import { api } from '~/lib/api';

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  children: Array<{ id: string; name: string; type: string }>;
}

interface Props {
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

type TxType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export function AddTransactionSheet({ accounts, categories, onClose, onSuccess }: Props) {
  const [type, setType] = useState<TxType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const relevantCategories = categories.filter(
    (c) => type === 'TRANSFER' || c.type === type,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId || !description) {
      setError('Amount, account, and description are required.');
      return;
    }
    if (type === 'TRANSFER' && !toAccountId) {
      setError('Select a destination account for transfers.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/v1/transactions', {
        type,
        amount: parseFloat(amount),
        accountId,
        ...(type === 'TRANSFER' ? { toAccountId } : {}),
        ...(categoryId ? { categoryId } : {}),
        date,
        description,
        ...(note ? { note } : {}),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-parchment-200 dark:border-forest-600 bg-parchment-50 dark:bg-forest-700 px-4 py-3 text-sm text-forest-600 dark:text-parchment-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500';
  const labelClass = 'block text-xs font-medium text-forest-400 dark:text-parchment-400 mb-1';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-forest-800 rounded-t-2xl shadow-xl max-h-[90dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-parchment-300 dark:bg-forest-600" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <h2 className="text-base font-semibold text-forest-600 dark:text-parchment-100">
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-forest-400 dark:text-parchment-400 hover:bg-parchment-100 dark:hover:bg-forest-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-8 space-y-4 flex-1">
          {/* Type selector */}
          <div className="flex rounded-xl overflow-hidden border border-parchment-200 dark:border-forest-600">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId(''); }}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  type === t
                    ? t === 'INCOME'
                      ? 'bg-green-600 text-white'
                      : t === 'EXPENSE'
                      ? 'bg-red-500 text-white'
                      : 'bg-blue-500 text-white'
                    : 'text-forest-400 dark:text-parchment-400 hover:bg-parchment-100 dark:hover:bg-forest-700'
                }`}
              >
                {t === 'INCOME' ? '+ Income' : t === 'EXPENSE' ? '− Expense' : '⇄ Transfer'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className={labelClass}>Amount (UGX)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} text-2xl font-bold tabular-nums`}
              style={{ fontSize: '1.5rem' }}
              required
            />
          </div>

          {/* Account */}
          <div>
            <label className={labelClass}>Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={inputClass}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* To Account (transfer only) */}
          {type === 'TRANSFER' && (
            <div>
              <label className={labelClass}>To Account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select destination…</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category */}
          {type !== 'TRANSFER' && (
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
              >
                <option value="">No category</option>
                {relevantCategories.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {parent.children.map((child) => (
                      <option key={child.id} value={child.id}>
                        &nbsp;&nbsp;{child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
              style={{ fontSize: '16px' }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              style={{ fontSize: '16px' }}
              required
            />
          </div>

          {/* Note */}
          <div>
            <label className={labelClass}>Note (optional)</label>
            <textarea
              placeholder="Additional details…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              style={{ fontSize: '16px' }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 font-semibold text-sm transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </>
  );
}
