import { useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/react';
import { api, isAuthenticated } from '~/lib/api';
import { formatCurrency } from '@spenditure/utils';
import { BottomNav } from '~/components/BottomNav';
import { IconChevronRight, IconRepeat } from '~/components/Icons';

export const meta: MetaFunction = () => [{ title: 'Audit — Spenditure' }];

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

interface Audit {
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

function ScoreRing({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - pct / 100);
  const color = pct >= 80 ? '#27AE60' : pct >= 60 ? '#E8A820' : '#C0392B';
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx={36} cy={36} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-parchment-200 dark:text-forest-600" />
      <circle
        cx={36} cy={36} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fill={color} fontFamily="-apple-system,system-ui,sans-serif">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function periodLabel(period: string) {
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
}

function AuditCard({ audit, expanded, onToggle }: {
  audit: Audit;
  expanded: boolean;
  onToggle: () => void;
}) {
  const findings: AuditFindings = (() => {
    try { return JSON.parse(audit.findings) as AuditFindings; }
    catch { return { possibleDuplicates: [], unverifiedManual: [] }; }
  })();

  const total = audit.importedCount + audit.manualCount;

  return (
    <div className="bg-white dark:bg-forest-700 rounded-2xl border border-parchment-200 dark:border-forest-600 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center gap-4 text-left"
      >
        <ScoreRing pct={audit.importPct} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-forest-600 dark:text-parchment-100">
            {periodLabel(audit.period)}
          </p>
          <p className="text-xs text-forest-400 dark:text-parchment-400 mt-0.5">
            {audit.importedCount} imported · {audit.manualCount} manual · {total} total
          </p>
          <div className="flex gap-3 mt-1.5">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              In {formatCurrency(audit.totalIncome, 'UGX')}
            </span>
            <span className="text-xs font-medium text-red-500 tabular-nums">
              Out {formatCurrency(audit.totalExpense, 'UGX')}
            </span>
          </div>
        </div>
        <IconChevronRight
          size={16}
          className={`flex-shrink-0 text-forest-300 dark:text-forest-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-parchment-100 dark:border-forest-600 px-4 py-3 space-y-3">
          {/* Coverage bar */}
          <div>
            <div className="flex justify-between text-xs text-forest-400 dark:text-parchment-400 mb-1">
              <span>Statement coverage</span>
              <span className="tabular-nums">{audit.importedCount} / {total}</span>
            </div>
            <div className="w-full h-1.5 bg-parchment-200 dark:bg-forest-600 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, audit.importPct)}%` }}
              />
            </div>
          </div>

          {findings.possibleDuplicates.length > 0 && (
            <FindingGroup
              title="Possible duplicates"
              subtitle="Manual entries that look like an already-imported transaction"
              color="amber"
              items={findings.possibleDuplicates}
            />
          )}

          {findings.unverifiedManual.length > 0 && (
            <FindingGroup
              title="Unverified manual entries"
              subtitle="Recorded on a bank/MoMo account but not matched in imported statements"
              color="blue"
              items={findings.unverifiedManual}
            />
          )}

          {findings.possibleDuplicates.length === 0 && findings.unverifiedManual.length === 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center py-2">
              All manual entries matched — no issues found
            </p>
          )}

          <p className="text-xs text-forest-400 dark:text-parchment-500 text-right">
            Last updated {new Date(audit.updatedAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}

function FindingGroup({
  title,
  subtitle,
  color,
  items,
}: {
  title: string;
  subtitle: string;
  color: 'amber' | 'blue';
  items: AuditFinding[];
}) {
  const dot = color === 'amber'
    ? 'bg-amber-400'
    : 'bg-blue-400';

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-xs font-semibold text-forest-600 dark:text-parchment-100">{title}</span>
        <span className="text-xs text-forest-400 dark:text-parchment-400 ml-auto tabular-nums">{items.length}</span>
      </div>
      <p className="text-xs text-forest-400 dark:text-parchment-400 mb-2 pl-4">{subtitle}</p>
      <div className="space-y-1 pl-4">
        {items.slice(0, 5).map((f) => (
          <div key={f.transactionId} className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-forest-600 dark:text-parchment-100 truncate">{f.description}</p>
              <p className="text-xs text-forest-400 dark:text-parchment-400">
                {new Date(f.date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span className="text-xs font-medium text-forest-600 dark:text-parchment-100 tabular-nums flex-shrink-0">
              {formatCurrency(f.amount, 'UGX')}
            </span>
          </div>
        ))}
        {items.length > 5 && (
          <p className="text-xs text-forest-400 dark:text-parchment-400">+{items.length - 5} more</p>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/auth/pin'); return; }
    api.get<Audit[]>('/api/v1/audit')
      .then((data) => setAudits(data as Audit[]))
      .catch(() => navigate('/auth/pin'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function runAudit() {
    setRunning(true);
    try {
      const data = await api.post<Audit[]>('/api/v1/audit/run', {});
      setAudits(data as Audit[]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-800 flex flex-col">
      <header className="sticky top-0 z-10 bg-parchment-100/90 dark:bg-forest-800/90 backdrop-blur-sm border-b border-parchment-200 dark:border-forest-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-forest-600 dark:text-amber-400 tracking-tight">Financial Audit</h1>
        <button
          onClick={runAudit}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-600 dark:bg-amber-500 text-white dark:text-forest-900 text-xs font-semibold disabled:opacity-50 transition-opacity"
        >
          <IconRepeat size={13} className={running ? 'animate-spin' : ''} />
          {running ? 'Running…' : 'Run audit'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-16 text-forest-400 dark:text-parchment-500 space-y-2">
            <div className="flex justify-center"><IconRepeat size={36} /></div>
            <p className="text-sm">No audit data yet.</p>
            <p className="text-xs">Tap "Run audit" to analyse your recent months.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-forest-400 dark:text-parchment-400">
              Showing statement coverage — how many transactions came from imported statements vs manually entered on bank/MoMo accounts.
            </p>
            {audits.map((a) => (
              <AuditCard
                key={a.id}
                audit={a}
                expanded={expanded === a.id}
                onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
              />
            ))}
          </>
        )}
      </div>

      <BottomNav current="/audit" />
    </div>
  );
}
