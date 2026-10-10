import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { isAuthenticated, logout, api } from '~/lib/api';
import { BottomNav } from '~/components/BottomNav';

export const meta: MetaFunction = () => [{ title: 'Settings — Spenditure' }];

const APP_VERSION = '0.3.0';
const BASE = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000';

interface User { id: string; name: string; email: string; currency: string; }

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showClear, setShowClear] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    api.get<User>('/api/v1/auth/me').then(setUser).catch(console.error);
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/auth/pin');
  }

  function exportDownload(format: 'csv' | 'excel') {
    window.location.href = `${BASE}/api/v1/export/${format === 'csv' ? 'csv' : 'excel'}`;
  }

  return (
    <div className="min-h-screen bg-parchment dark:bg-forest-950 flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-forest px-4 py-4">
        <h1 className="text-white font-semibold">Settings</h1>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* Profile */}
        <Section title="Profile">
          <Row label="Name" value={user?.name ?? '…'} />
          <button
            onClick={() => setShowPin(true)}
            className="w-full text-left px-4 py-3 text-sm text-amber font-medium"
          >
            Change PIN →
          </button>
        </Section>

        {/* Import */}
        <Section title="Import">
          <Link to="/import" className="block px-4 py-3 text-sm text-forest dark:text-parchment">
            Import Bank / MoMo Statement →
          </Link>
        </Section>

        {/* Export */}
        <Section title="Export">
          <button onClick={() => exportDownload('csv')} className="w-full text-left px-4 py-3 text-sm text-forest dark:text-parchment">
            Export as CSV
          </button>
          <div className="border-t border-parchment dark:border-forest-700" />
          <button onClick={() => exportDownload('excel')} className="w-full text-left px-4 py-3 text-sm text-forest dark:text-parchment">
            Export as Excel (.xlsx)
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
          <div className="border-t border-parchment dark:border-forest-700" />
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-red-400"
          >
            Sign out
          </button>
        </Section>
      </div>

      {showPin && <ChangePinSheet onClose={() => setShowPin(false)} />}
      {showClear && <ClearDataSheet onClose={() => setShowClear(false)} />}

      <BottomNav current="settings" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 px-1">{title}</p>
      <div className="bg-white dark:bg-forest-900 rounded-2xl overflow-hidden divide-y divide-parchment dark:divide-forest-700">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-forest dark:text-parchment">{value}</span>
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
          <button type="submit" disabled={loading || current.length < 4 || next.length < 4} className="w-full py-3 rounded-xl bg-forest text-white font-medium disabled:opacity-50">
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
        <h2 className="font-semibold text-forest dark:text-parchment mb-4">{title}</h2>
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
