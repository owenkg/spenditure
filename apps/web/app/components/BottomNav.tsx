import { useNavigate } from '@remix-run/react';

const NAV_ITEMS = [
  { label: 'Home', icon: '⊞', path: '/dashboard' },
  { label: 'Txns', icon: '↕', path: '/transactions' },
  { label: 'Recurring', icon: '↻', path: '/recurring' },
  { label: 'Accounts', icon: '🗂', path: '/accounts' },
  { label: 'Settings', icon: '⚙', path: '/settings' },
];

export function BottomNav({ current }: { current: string }) {
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white dark:bg-forest-900 border-t border-parchment-200 dark:border-forest-700 flex safe-area-pb">
      {NAV_ITEMS.map((item) => {
        const active = current === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              active
                ? 'text-forest-600 dark:text-amber-400'
                : 'text-forest-300 dark:text-forest-500'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
