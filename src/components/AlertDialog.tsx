import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function AlertDialog() {
  const alertState = useStore((s) => s.alertState);
  const closeAlert = useStore((s) => s.closeAlert);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAlert();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeAlert]);

  if (!alertState.open) return null;

  const isError = alertState.type === 'error';
  const isSuccess = alertState.type === 'success';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={closeAlert}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
              isError
                ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                : isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
            }`}
          >
            {isError ? '!' : isSuccess ? '✓' : 'i'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[var(--color-text)] whitespace-pre-wrap">{alertState.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={closeAlert}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isError
                ? 'bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)]'
                : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
