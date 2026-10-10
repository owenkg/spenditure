import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { api, ApiError } from '~/lib/api';

type Mode = 'loading' | 'setup' | 'login';

interface StatusResponse {
  isSetup: boolean;
}

function PinInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...value];
    next[index] = char;
    onChange(next);
    if (char && index < 3) refs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs[index - 1].current?.focus();
      const next = [...value];
      next[index - 1] = '';
      onChange(next);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="
            w-14 h-14 text-center text-xl font-bold rounded-xl border-2
            bg-white dark:bg-forest-700
            border-parchment-300 dark:border-forest-500
            text-forest-600 dark:text-parchment-100
            focus:outline-none focus:border-amber-500 dark:focus:border-amber-400
            disabled:opacity-50
          "
          style={{ fontSize: '16px' }}
        />
      ))}
    </div>
  );
}

export default function PinPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('loading');
  const [name, setName] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<StatusResponse>('/api/v1/auth/status')
      .then((r) => setMode(r.isSetup ? 'login' : 'setup'))
      .catch(() => setMode('login'));
  }, []);

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    setPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinStr = pin.join('');
    if (pinStr.length !== 4) return;

    if (mode === 'setup') {
      const confirmStr = confirmPin.join('');
      if (pinStr !== confirmStr) {
        setError('PINs do not match');
        shake();
        return;
      }
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const endpoint = mode === 'setup' ? '/api/v1/auth/setup' : '/api/v1/auth/login';
      const body = mode === 'setup' ? { name: name.trim(), pin: pinStr } : { pin: pinStr };
      await api.post(endpoint, body);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong');
      }
      shake();
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment-100 dark:bg-forest-800">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-parchment-100 dark:bg-forest-800 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-forest-600 dark:text-amber-400 tracking-tight">
            Spenditure
          </h1>
          <p className="text-sm text-forest-400 dark:text-parchment-400 mt-1">
            {mode === 'setup' ? 'Set up your account' : 'Enter your PIN'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'setup' && (
            <div>
              <label className="block text-sm font-medium text-forest-600 dark:text-parchment-200 mb-1">
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. George"
                className="
                  w-full px-4 py-3 rounded-xl border-2
                  bg-white dark:bg-forest-700
                  border-parchment-300 dark:border-forest-500
                  text-forest-600 dark:text-parchment-100
                  placeholder-forest-300 dark:placeholder-forest-400
                  focus:outline-none focus:border-amber-500 dark:focus:border-amber-400
                "
                style={{ fontSize: '16px' }}
                autoFocus
              />
            </div>
          )}

          <div className={shaking ? 'animate-shake' : ''}>
            <p className="text-sm font-medium text-center text-forest-600 dark:text-parchment-200 mb-3">
              {mode === 'setup' ? 'Choose a 4-digit PIN' : 'Enter PIN'}
            </p>
            <PinInput value={pin} onChange={setPin} disabled={submitting} />
          </div>

          {mode === 'setup' && (
            <div>
              <p className="text-sm font-medium text-center text-forest-600 dark:text-parchment-200 mb-3">
                Confirm PIN
              </p>
              <PinInput value={confirmPin} onChange={setConfirmPin} disabled={submitting} />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || pin.join('').length !== 4}
            className="
              w-full py-4 rounded-xl font-semibold text-white
              bg-forest-600 dark:bg-amber-500 dark:text-forest-900
              hover:bg-forest-700 dark:hover:bg-amber-400
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
            style={{ fontSize: '16px' }}
          >
            {submitting ? 'Please wait…' : mode === 'setup' ? 'Create account' : 'Unlock'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  );
}
