import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { useStore } from '../store/useStore';

export function UpdateNotification() {
  const {
    updateAvailable,
    updateVersion,
    updateNotes,
    updateInstalling,
    setUpdateAvailable,
    clearUpdate,
    setUpdateInstalling,
  } = useStore();

  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  useEffect(() => {
    check()
      .then((update) => {
        if (update?.available) {
          setPendingUpdate(update);
          setUpdateAvailable(update.version, update.body ?? null);
        }
      })
      .catch(() => {
        // Offline or server unavailable — silently ignore
      });
  }, [setUpdateAvailable]);

  if (!updateAvailable) return null;

  async function handleInstall() {
    if (!pendingUpdate) return;
    setError(null);
    setUpdateInstalling(true);
    try {
      await pendingUpdate.downloadAndInstall();
    } catch (e) {
      setError(String(e));
      setUpdateInstalling(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-80 rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)]">Update verfügbar</p>
          <p className="text-xs text-[var(--color-text-muted)]">Version {updateVersion}</p>
        </div>
        <button
          onClick={clearUpdate}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-lg leading-none"
          title="Schließen"
        >
          ×
        </button>
      </div>

      {updateNotes && (
        <div className="px-4 pb-2">
          <button
            className="text-xs text-[var(--color-accent)] hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Weniger anzeigen' : 'Was ist neu?'}
          </button>
          {expanded && (
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-[var(--color-text-muted)]">
              {updateNotes}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 pb-2 text-xs text-[var(--color-danger)]">{error}</div>
      )}

      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={handleInstall}
          disabled={updateInstalling}
          className="flex-1 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateInstalling ? 'Wird installiert…' : 'Jetzt installieren'}
        </button>
        <button
          onClick={clearUpdate}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)]"
        >
          Später
        </button>
      </div>
    </div>
  );
}
