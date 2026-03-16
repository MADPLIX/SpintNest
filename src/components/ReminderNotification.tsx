import { useState } from 'react';
import { useStore } from '../store/useStore';

export function ReminderNotification() {
  const overdueNames = useStore((s) => s.reminderOverdue);
  const todayNames = useStore((s) => s.reminderToday);
  const clearReminder = useStore((s) => s.clearReminder);
  const [expanded, setExpanded] = useState(false);

  if (overdueNames.length === 0 && todayNames.length === 0) return null;

  const hasOverdue = overdueNames.length > 0;

  return (
    <div className={`fixed bottom-4 right-4 z-[200] w-80 rounded-xl border shadow-[var(--shadow-modal)] bg-[var(--color-bg-elevated)] overflow-hidden ${
      hasOverdue ? 'border-[var(--color-danger)]' : 'border-[var(--color-accent)]'
    }`}>
      <div className="flex items-center gap-3 p-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          hasOverdue
            ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
            : 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
        }`}>
          !
        </span>
        <div className="flex-1 min-w-0">
          {hasOverdue && (
            <p className="text-sm font-medium text-[var(--color-text)]">
              {overdueNames.length} Task{overdueNames.length > 1 ? 's' : ''} überfällig
            </p>
          )}
          {todayNames.length > 0 && (
            <p className="text-sm font-medium text-[var(--color-text)]">
              {todayNames.length} Task{todayNames.length > 1 ? 's' : ''} heute fällig
            </p>
          )}
        </div>
        <button
          onClick={clearReminder}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-lg leading-none"
          title="Schließen"
        >
          ×
        </button>
      </div>

      <div className="px-4 pb-2">
        <button
          className={`text-xs hover:underline ${hasOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Weniger anzeigen' : 'Details anzeigen'}
        </button>
        {expanded && (
          <ul className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {overdueNames.map((name, i) => (
              <li key={i} className="text-xs text-[var(--color-danger)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] shrink-0" />
                {name}
              </li>
            ))}
            {todayNames.map((name, i) => (
              <li key={i} className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 pb-4 pt-1">
        <button
          onClick={clearReminder}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)]"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}
