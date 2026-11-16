import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { api, getAccessToken, isAuthenticated } from '~/lib/api';
import { formatCurrency } from '@spenditure/utils';
import { BottomNav } from '~/components/BottomNav';
import {
  ACCOUNT_TYPE_ICONS,
  IconBank,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconRepeat,
  IconX,
} from '~/components/Icons';

export const meta: MetaFunction = () => [{ title: 'Audit — Spenditure' }];

const BASE = (import.meta as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditFinding {
  type: 'possible_duplicate' | 'unverified_manual';
  transactionId: string;
  matchedId?: string;
  description: string;
  amount: number;
  date: string;
}

interface AuditFindings {
  possibleDuplicates: AuditFinding[];
  unverifiedManual: AuditFinding[];
}

interface AuditRecord {
  id: string;
  period: string;
  importedCount: number;
  manualCount: number;
  importPct: number;
  totalIncome: number;
  totalExpense: number;
  findings: string;
  updatedAt: string;
}

interface AccountWithAudit {
  id: string;
  name: string;
  type: string;
  color: string;
  lastAudit: AuditRecord | null;
  daysSinceAudit: number | null;
}

// ---------------------------------------------------------------------------
// Score ring
// ---------------------------------------------------------------------------

function ScoreRing({ pct }: { pct: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - pct / 100);
  const color = pct >= 80 ? '#27AE60' : pct >= 60 ? '#E8A820' : '#C0392B';
  return (
    <svg width={60} height={60} viewBox="0 0 60 60" className="flex-shrink-0">
      <circle cx={30} cy={30} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-parchment-200 dark:text-forest-600" />
      <circle
        cx={30} cy={30} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
      />
      <text x={30} y={35} textAnchor="middle" fontSize={12} fontWeight={700} fill={color} fontFamily="-apple-system,system-ui,sans-serif">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// History modal
// ---------------------------------------------------------------------------

function HistoryModal({
  account,
  onClose,
}: {
  account: AccountWithAudit;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AuditRecord[]>(`/api/v1/audit/${account.id}/history`)
      .then((d) => setHistory(d as AuditRecord[]))
      .finally(() => setLoading(false));
  }, [account.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-forest-900 rounded-t-3xl max-h-[80dvh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-parchment-300 dark:bg-forest-600" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <h2 className="font-semibold text-sm text-forest-600 dark:text-parchment-100">{account.name} — Audit History</h2>
          <button onClick={onClose} className="text-forest-400"><IconX size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-8 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-center text-forest-400 py-8">No audit records yet.</p>
          ) : (
            history.map((a) => {
              const findings: AuditFindings = (() => {
                try { return JSON.parse(a.findings) as AuditFindings; }
                catch { return { possibleDuplicates: [], unverifiedManual: [] }; }
              })();
              const [y, m] = a.period.split('-');
              const label = new Date(Number(y), Number(m) - 1, 1)
                .toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
              return (
                <div key={a.id} className="bg-parchment-50 dark:bg-forest-800 rounded-xl p-4 flex items-center gap-4">
                  <ScoreRing pct={a.importPct} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-forest-600 dark:text-parchment-100">{label}</p>
                    <p className="text-xs text-forest-400 dark:text-parchment-400 mt-0.5">
                      {a.importedCount} imported · {a.manualCount} manual
                    </p>
                    {(findings.possibleDuplicates.length > 0 || findings.unverifiedManual.length > 0) && (
                      <div className="flex gap-2 mt-1">
                        {findings.possibleDuplicates.length > 0 && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                            {findings.possibleDuplicates.length} duplicates?
                          </span>
                        )}
                        {findings.unverifiedManual.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            {findings.unverifiedManual.length} unverified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline import sheet (per account)
// ---------------------------------------------------------------------------

function ImportSheet({
  account,
  onClose,
  onImported,
}: {
  account: AccountWithAudit;
  onClose: () => void;
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  const isMomo = account.type === 'MOBILE_MONEY';
  const accept = isMomo ? '.xlsx' : '.pdf';
  const endpoint = isMomo ? 'momo' : 'dfcu';
  const label = isMomo ? 'MTN MoMo .xlsx statement' : 'DFCU Bank PDF statement';

  async function upload(file: File) {
    setLoading(true);
    setError('');
    setResult(null);
    const token = getAccessToken();
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', account.id);
    try {
      const res = await fetch(`${BASE}/api/v1/import/${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const json = await res.json() as { data: { imported: number; skipped: number; errors: string[] } };
      if (!res.ok) { setError('Import failed — please try again.'); return; }
      setResult(json.data);
      if (json.data.imported > 0) onImported();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-forest-900 rounded-t-3xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-parchment-300 dark:bg-forest-600" />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="font-semibold text-sm text-forest-600 dark:text-parchment-100">Import Statement</h2>
            <p className="text-xs text-forest-400 dark:text-parchment-400 mt-0.5">{account.name}</p>
          </div>
          <button onClick={onClose} className="text-forest-400"><IconX size={18} /></button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-forest-400 dark:text-parchment-400">
                Upload your {label} to import transactions into <span className="font-medium text-forest-600 dark:text-parchment-100">{account.name}</span>.
                The audit will re-run automatically after import.
              </p>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="w-full py-10 rounded-2xl border-2 border-dashed border-parchment-300 dark:border-forest-600 flex flex-col items-center gap-2 text-forest-400 dark:text-parchment-400 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <IconDownload size={28} />
                    <span className="text-sm">Tap to choose file</span>
                    <span className="text-xs opacity-70">{accept.toUpperCase()} · max 10 MB</span>
                  </>
                )}
              </button>

              <input
                ref={fileRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
              />

              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">
                  {result.imported} transaction{result.imported !== 1 ? 's' : ''} imported
                </p>
                {result.skipped > 0 && (
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
                    {result.skipped} already existed and were skipped
                  </p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 space-y-1">
                  {result.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-forest-600 text-white font-semibold text-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account audit card
// ---------------------------------------------------------------------------

function AccountAuditCard({
  account,
  onImport,
  onRunAudit,
  onViewHistory,
  running,
}: {
  account: AccountWithAudit;
  onImport: () => void;
  onRunAudit: () => void;
  onViewHistory: () => void;
  running: boolean;
}) {
  const Icon = ACCOUNT_TYPE_ICONS[account.type] ?? IconBank;
  const overdue = account.daysSinceAudit === null || account.daysSinceAudit >= 30;

  return (
    <div className={`bg-white dark:bg-forest-700 rounded-2xl border overflow-hidden ${
      overdue
        ? 'border-amber-300 dark:border-amber-700'
        : 'border-parchment-200 dark:border-forest-600'
    }`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: account.color + '22', color: account.color }}
        >
          <Icon size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-forest-600 dark:text-parchment-100 truncate">{account.name}</p>
          <p className="text-xs text-forest-400 dark:text-parchment-400">
            {account.type === 'MOBILE_MONEY' ? 'Mobile Money' : 'Bank'}
          </p>
        </div>
        {overdue && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full flex-shrink-0">
            {account.daysSinceAudit === null ? 'Never audited' : `${account.daysSinceAudit}d ago`}
          </span>
        )}
      </div>

      {/* Score + stats */}
      <div className="px-4 pb-3 flex items-center gap-4">
        {account.lastAudit ? (
          <>
            <ScoreRing pct={account.lastAudit.importPct} />
            <div className="flex-1 min-w-0">
              {(() => {
                const [y, m] = account.lastAudit.period.split('-');
                const label = new Date(Number(y), Number(m) - 1, 1)
                  .toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
                return (
                  <>
                    <p className="text-xs text-forest-400 dark:text-parchment-400">{label}</p>
                    <p className="text-sm font-medium text-forest-600 dark:text-parchment-100 mt-0.5">
                      {account.lastAudit.importedCount} imported · {account.lastAudit.manualCount} manual
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                        In {formatCurrency(account.lastAudit.totalIncome, 'UGX')}
                      </span>
                      <span className="text-xs text-red-500 tabular-nums">
                        Out {formatCurrency(account.lastAudit.totalExpense, 'UGX')}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <p className="text-sm text-forest-400 dark:text-parchment-400 flex-1">
            No audit data yet — import a statement or run audit to start.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-parchment-100 dark:border-forest-600 flex">
        <button
          onClick={onImport}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-forest-500 dark:text-parchment-300 hover:bg-parchment-50 dark:hover:bg-forest-600 transition-colors"
        >
          <IconDownload size={14} />
          Import statement
        </button>
        <div className="w-px bg-parchment-100 dark:bg-forest-600" />
        <button
          onClick={onRunAudit}
          disabled={running}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-forest-500 dark:text-parchment-300 hover:bg-parchment-50 dark:hover:bg-forest-600 transition-colors disabled:opacity-50"
        >
          <IconRepeat size={14} className={running ? 'animate-spin' : ''} />
          {running ? 'Running…' : 'Run audit'}
        </button>
        <div className="w-px bg-parchment-100 dark:bg-forest-600" />
        <button
          onClick={onViewHistory}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-forest-500 dark:text-parchment-300 hover:bg-parchment-50 dark:hover:bg-forest-600 transition-colors"
        >
          <IconChevronRight size={14} />
          History
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuditPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountWithAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [importFor, setImportFor] = useState<AccountWithAudit | null>(null);
  const [historyFor, setHistoryFor] = useState<AccountWithAudit | null>(null);

  function load() {
    return api
      .get<AccountWithAudit[]>('/api/v1/audit')
      .then((d) => setAccounts(d as AccountWithAudit[]))
      .catch(() => navigate('/auth/pin'));
  }

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    load().finally(() => setLoading(false));
  }, [navigate]);

  async function runAudit(accountId: string) {
    setRunningId(accountId);
    try {
      await api.post(`/api/v1/audit/${accountId}/run`, {});
      await load();
    } finally {
      setRunningId(null);
    }
  }

  const overdue = accounts.filter((a) => a.daysSinceAudit === null || a.daysSinceAudit >= 30);
  const upToDate = accounts.filter((a) => a.daysSinceAudit !== null && a.daysSinceAudit < 30);

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 flex flex-col">
      <header className="sticky top-0 z-10 bg-parchment-100/90 dark:bg-forest-800/90 backdrop-blur-sm border-b border-parchment-200 dark:border-forest-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center text-forest-400 dark:text-parchment-400 -ml-1"
        >
          <IconChevronLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-bold text-forest-600 dark:text-amber-400 tracking-tight">Financial Audit</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 text-forest-400 dark:text-parchment-500 space-y-2">
            <div className="flex justify-center"><IconRepeat size={36} /></div>
            <p className="text-sm">No bank or MoMo accounts found.</p>
            <p className="text-xs">Add a BANK or MOBILE_MONEY account to start auditing.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-forest-400 dark:text-parchment-400">
              Each account should be audited every 30 days (auto-runs on the 28th). Import a statement then run an audit to see your coverage score.
            </p>

            {overdue.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Needs attention
                </p>
                {overdue.map((acc) => (
                  <AccountAuditCard
                    key={acc.id}
                    account={acc}
                    running={runningId === acc.id}
                    onImport={() => setImportFor(acc)}
                    onRunAudit={() => runAudit(acc.id)}
                    onViewHistory={() => setHistoryFor(acc)}
                  />
                ))}
              </section>
            )}

            {upToDate.length > 0 && (
              <section className="space-y-3">
                {overdue.length > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Up to date
                  </p>
                )}
                {upToDate.map((acc) => (
                  <AccountAuditCard
                    key={acc.id}
                    account={acc}
                    running={runningId === acc.id}
                    onImport={() => setImportFor(acc)}
                    onRunAudit={() => runAudit(acc.id)}
                    onViewHistory={() => setHistoryFor(acc)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav current="/audit" />

      {importFor && (
        <ImportSheet
          account={importFor}
          onClose={() => setImportFor(null)}
          onImported={() => { load(); setImportFor(null); }}
        />
      )}

      {historyFor && (
        <HistoryModal
          account={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}
