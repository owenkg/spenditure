import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { isAuthenticated, logout, api, getAccessToken } from '~/lib/api';
import { BottomNav } from '~/components/BottomNav';
import { IconDownload, IconLogOut, IconX } from '~/components/Icons';

export const meta: MetaFunction = () => [{ title: 'Settings — Spenditure' }];

const APP_VERSION = '0.3.0';
const BASE = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000';

interface User { id: string; name: string; email: string; currency: string; }

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    api.get<User>('/api/v1/auth/me').then(setUser).catch(console.error);
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/auth/pin');
  }

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-900 flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-forest-600 px-4 py-4">
        <h1 className="text-white font-semibold">Settings</h1>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* Profile */}
        <Section title="Profile">
          <Row label="Name" value={user?.name ?? '…'} />
          <button
            onClick={() => setShowPin(true)}
            className="w-full text-left px-4 py-3 text-sm text-amber-500 font-medium"
          >
            Change PIN →
          </button>
        </Section>

        {/* Import */}
        <Section title="Import">
          <Link to="/import" className="block px-4 py-3 text-sm text-forest-600 dark:text-parchment-100">
            Import Bank / MoMo Statement →
          </Link>
        </Section>

        {/* Audit */}
        <Section title="Audit">
          <Link to="/audit" className="block px-4 py-3 text-sm text-forest-600 dark:text-parchment-100">
            Financial Audit →
          </Link>
        </Section>

        {/* Export */}
        <Section title="Export">
          <button
            onClick={() => setShowExport(true)}
            className="w-full text-left px-4 py-3 text-sm text-forest-600 dark:text-parchment-100 flex items-center gap-2"
          >
            <IconDownload size={16} className="text-forest-400 dark:text-parchment-400 flex-shrink-0" />
            Export transactions…
          </button>
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="App" value="Spenditure" />
          <Row label="Version" value={`v${APP_VERSION}`} />
        </Section>

        {/* Danger */}
        <Section title="Danger Zone">
          <button
            onClick={() => setShowClear(true)}
            className="w-full text-left px-4 py-3 text-sm text-red-500 font-medium"
          >
            Clear all transaction data…
          </button>
          <div className="border-t border-parchment-200 dark:border-forest-700" />
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-400 flex items-center gap-2"
          >
            <IconLogOut size={16} className="flex-shrink-0" />
            Sign out
          </button>
        </Section>
      </div>

      {showPin && <ChangePinSheet onClose={() => setShowPin(false)} />}
      {showClear && <ClearDataSheet onClose={() => setShowClear(false)} />}
      {showExport && <ExportSheet onClose={() => setShowExport(false)} />}

      <BottomNav current="/settings" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 px-1">{title}</p>
      <div className="bg-white dark:bg-forest-900 rounded-2xl overflow-hidden divide-y divide-parchment-200 dark:divide-forest-700">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-forest-600 dark:text-parchment-100">{value}</span>
    </div>
  );
}

function ChangePinSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError('PINs do not match'); return; }
    setLoading(true); setError('');
    try {
      await api.patch('/api/v1/settings/pin', { currentPin: current, newPin: next });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Change PIN">
      {done ? (
        <p className="text-center text-green-600 py-4">PIN updated ✓</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <PinInput label="Current PIN" value={current} onChange={setCurrent} />
          <PinInput label="New PIN" value={next} onChange={setNext} />
          <PinInput label="Confirm new PIN" value={confirm} onChange={setConfirm} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading || current.length < 4 || next.length < 4} className="w-full py-3 rounded-xl bg-forest-600 text-white font-medium disabled:opacity-50">
            {loading ? 'Updating…' : 'Update PIN'}
          </button>
        </form>
      )}
    </Sheet>
  );
}

function ClearDataSheet({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/api/v1/settings/data/clear', { pin });
      setDone(true);
      setTimeout(() => { onClose(); navigate('/dashboard'); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Clear All Data">
      {done ? (
        <p className="text-center text-green-600 py-4">All transactions cleared ✓</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-gray-500">This will permanently delete all your transactions. Enter your PIN to confirm.</p>
          <PinInput label="PIN" value={pin} onChange={setPin} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading || pin.length < 4} className="w-full py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50">
            {loading ? 'Clearing…' : 'Clear all transactions'}
          </button>
        </form>
      )}
    </Sheet>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-forest-900 rounded-t-3xl p-6">
        <h2 className="font-semibold text-forest-600 dark:text-parchment-100 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PinInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="w-full border border-gray-200 dark:border-forest-700 rounded-xl px-4 py-3 text-center text-2xl tracking-widest bg-transparent"
        placeholder="••••"
        style={{ fontSize: 24 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export sheet
// ---------------------------------------------------------------------------

type RangePreset =
  | 'all'
  | 'this-month'
  | 'last-month'
  | 'last-30'
  | 'last-60'
  | 'last-90'
  | 'this-year'
  | 'last-year'
  | 'specific-month'
  | 'specific-year';

function buildDateRange(preset: RangePreset, specificYear: number, specificMonth: number): { dateFrom?: string; dateTo?: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  if (preset === 'all') return { label: 'all time' };

  if (preset === 'this-month') {
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0, 23, 59, 59);
    return { dateFrom: from.toISOString(), dateTo: to.toISOString(), label: from.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' }) };
  }

  if (preset === 'last-month') {
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);
    return { dateFrom: from.toISOString(), dateTo: to.toISOString(), label: from.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' }) };
  }

  if (preset === 'last-30' || preset === 'last-60' || preset === 'last-90') {
    const days = preset === 'last-30' ? 30 : preset === 'last-60' ? 60 : 90;
    const from = new Date(now.getTime() - days * 86400000);
    return { dateFrom: from.toISOString(), dateTo: now.toISOString(), label: `last ${days} days` };
  }

  if (preset === 'this-year') {
    return {
      dateFrom: new Date(y, 0, 1).toISOString(),
      dateTo: new Date(y, 11, 31, 23, 59, 59).toISOString(),
      label: String(y),
    };
  }

  if (preset === 'last-year') {
    return {
      dateFrom: new Date(y - 1, 0, 1).toISOString(),
      dateTo: new Date(y - 1, 11, 31, 23, 59, 59).toISOString(),
      label: String(y - 1),
    };
  }

  if (preset === 'specific-month') {
    const from = new Date(specificYear, specificMonth, 1);
    const to = new Date(specificYear, specificMonth + 1, 0, 23, 59, 59);
    return {
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
      label: from.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' }),
    };
  }

  if (preset === 'specific-year') {
    return {
      dateFrom: new Date(specificYear, 0, 1).toISOString(),
      dateTo: new Date(specificYear, 11, 31, 23, 59, 59).toISOString(),
      label: String(specificYear),
    };
  }

  return { label: 'all time' };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ExportSheet({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [format, setFormat] = useState<'csv' | 'excel'>('excel');
  const [preset, setPreset] = useState<RangePreset>('this-month');
  const [specificYear, setSpecificYear] = useState(now.getFullYear());
  const [specificMonth, setSpecificMonth] = useState(now.getMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const thisYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => thisYear - i);

  const presets: { id: RangePreset; label: string }[] = [
    { id: 'all', label: 'All time' },
    { id: 'this-month', label: `This month (${now.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })})` },
    { id: 'last-month', label: `Last month (${new Date(thisYear, now.getMonth() - 1, 1).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })})` },
    { id: 'last-30', label: 'Last 30 days' },
    { id: 'last-60', label: 'Last 60 days' },
    { id: 'last-90', label: 'Last 90 days' },
    { id: 'this-year', label: `This year (${thisYear})` },
    { id: 'last-year', label: `Last year (${thisYear - 1})` },
    { id: 'specific-month', label: 'Specific month…' },
    { id: 'specific-year', label: 'Specific year…' },
  ];

  async function download() {
    setLoading(true);
    setError('');
    const { dateFrom, dateTo, label } = buildDateRange(preset, specificYear, specificMonth);
    const token = getAccessToken();
    const path = format === 'csv' ? 'csv' : 'excel';
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const slug = label.replace(/\s+/g, '-').toLowerCase();
    const filename = `spenditure-${slug}.${ext}`;

    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await fetch(`${BASE}/api/v1/export/${path}${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setError('Export failed — please try again.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-forest-900 rounded-t-3xl max-h-[85dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-parchment-300 dark:bg-forest-600" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <h2 className="font-semibold text-forest-600 dark:text-parchment-100">Export Transactions</h2>
          <button onClick={onClose} className="text-forest-400 dark:text-parchment-400"><IconX size={18} /></button>
        </div>

        <div className="overflow-y-auto px-4 pb-8 space-y-5 flex-1">
          {/* Format toggle */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Format</p>
            <div className="flex rounded-xl overflow-hidden border border-parchment-200 dark:border-forest-700">
              {(['excel', 'csv'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    format === f
                      ? 'bg-forest-600 text-white'
                      : 'text-forest-400 dark:text-parchment-400'
                  }`}
                >
                  {f === 'excel' ? 'Excel (.xlsx)' : 'CSV'}
                </button>
              ))}
            </div>
          </div>

          {/* Date range presets */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date range</p>
            <div className="space-y-1">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                    preset === p.id
                      ? 'bg-forest-600 text-white'
                      : 'bg-parchment-100 dark:bg-forest-800 text-forest-600 dark:text-parchment-100'
                  }`}
                >
                  <span>{p.label}</span>
                  {preset === p.id && (
                    <span className="text-xs opacity-70 font-normal">selected</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Specific month picker */}
          {preset === 'specific-month' && (
            <div className="flex gap-2">
              <select
                value={specificMonth}
                onChange={(e) => setSpecificMonth(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-xl border border-parchment-200 dark:border-forest-700 bg-white dark:bg-forest-800 text-sm text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
              <select
                value={specificYear}
                onChange={(e) => setSpecificYear(Number(e.target.value))}
                className="w-28 px-3 py-2.5 rounded-xl border border-parchment-200 dark:border-forest-700 bg-white dark:bg-forest-800 text-sm text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
                style={{ fontSize: 16 }}
              >
                {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
              </select>
            </div>
          )}

          {/* Specific year picker */}
          {preset === 'specific-year' && (
            <select
              value={specificYear}
              onChange={(e) => setSpecificYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-parchment-200 dark:border-forest-700 bg-white dark:bg-forest-800 text-sm text-forest-600 dark:text-parchment-100 focus:outline-none focus:border-amber-500"
              style={{ fontSize: 16 }}
            >
              {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={download}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-forest-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <IconDownload size={16} />
            {loading ? 'Preparing…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
