import { useState, useRef } from 'react';
import { Link } from '@remix-run/react';
import { BottomNav } from '~/components/BottomNav';
import { api } from '~/lib/api';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface CardState {
  file: File | null;
  loading: boolean;
  result: ImportResult | null;
  error: string | null;
}

function ImportCard({
  title,
  accept,
  endpoint,
  hint,
}: {
  title: string;
  accept: string;
  endpoint: string;
  hint: string;
}) {
  const [state, setState] = useState<CardState>({ file: null, loading: false, result: null, error: null });
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(f: File | null) {
    setState({ file: f, loading: false, result: null, error: null });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    onFile(e.dataTransfer.files[0] ?? null);
  }

  async function upload() {
    if (!state.file) return;
    setState((s) => ({ ...s, loading: true, error: null, result: null }));
    try {
      const form = new FormData();
      form.append('file', state.file);
      const res = await api.uploadForm(endpoint, form);
      const data = (res as { data: ImportResult }).data ?? res;
      setState((s) => ({ ...s, loading: false, result: data as ImportResult }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Upload failed' }));
    }
  }

  return (
    <div className="bg-white dark:bg-forest-900 rounded-2xl p-5 shadow-sm border border-parchment-200 dark:border-forest-700">
      <h2 className="font-semibold text-forest-600 dark:text-parchment-100 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">{hint}</p>

      <div
        className="border-2 border-dashed border-amber/50 rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-amber active:bg-amber/5"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {state.file ? (
          <p className="text-sm font-medium text-forest-600 dark:text-parchment-100 truncate">{state.file.name}</p>
        ) : (
          <p className="text-sm text-gray-400">Tap to select or drag &amp; drop</p>
        )}
      </div>

      {state.file && !state.result && (
        <button
          onClick={upload}
          disabled={state.loading}
          className="mt-3 w-full py-3 rounded-xl bg-forest-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {state.loading ? 'Importing…' : 'Import'}
        </button>
      )}

      {state.result && (
        <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-sm">
          <p className="text-green-700 dark:text-green-400 font-medium">
            ✓ Imported {state.result.imported} transaction{state.result.imported !== 1 ? 's' : ''}
          </p>
          {state.result.skipped > 0 && (
            <p className="text-gray-500 text-xs mt-0.5">{state.result.skipped} duplicates skipped</p>
          )}
          {state.result.errors.length > 0 && (
            <p className="text-red-500 text-xs mt-0.5">{state.result.errors.length} errors</p>
          )}
        </div>
      )}

      {state.error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-parchment-100 dark:bg-forest-900 flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-forest-600 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="text-white/70 text-sm">←</Link>
          <h1 className="text-white font-semibold">Import Statements</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        <ImportCard
          title="DFCU Bank Statement"
          accept=".pdf,application/pdf"
          endpoint="/v1/import/dfcu"
          hint="Download your statement PDF from DFCU internet banking and import it here."
        />
        <ImportCard
          title="MTN Mobile Money Statement"
          accept=".eml,message/rfc822,text/plain"
          endpoint="/v1/import/momo"
          hint="Forward the MoMo statement email from MoMoStatement@mtn.com and save it as .eml, then import."
        />
      </div>

      <BottomNav current="settings" />
    </div>
  );
}
