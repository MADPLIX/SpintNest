import { useEffect, useMemo, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { useStore } from '../store/useStore';

const MANUAL_DOWNLOAD_URL = 'https://sn.madplix.de/download';

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

  const markdownComponents = useMemo<Components>(
    () => ({
      a: ({ href, children, ...props }) => (
        <a
          {...props}
          href={href}
          className="text-[var(--color-accent)] hover:underline break-words cursor-pointer"
          onClick={(e) => {
            if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
              e.preventDefault();
              void invoke('open_url', { url: href });
            }
          }}
        >
          {children}
        </a>
      ),
    }),
    []
  );

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

  const isSignatureError = error?.toLowerCase().includes('signature') ?? false;

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

  function handleManualDownload() {
    invoke('open_url', { url: MANUAL_DOWNLOAD_URL });
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
            <div
              className="mt-1 max-h-32 overflow-y-auto text-xs text-[var(--color-text-muted)]
                [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5
                [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5
                [&_li]:pl-0.5
                [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:text-[var(--color-text)] [&_h1]:mt-2 [&_h1]:mb-1
                [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:text-[var(--color-text)] [&_h2]:mt-2 [&_h2]:mb-1
                [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-[var(--color-text)] [&_h3]:mt-2 [&_h3]:mb-1
                [&_strong]:font-semibold [&_strong]:text-[var(--color-text)]
                [&_code]:rounded [&_code]:bg-[var(--color-bg-card)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px]
                [&_pre]:my-1.5 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[var(--color-bg-card)] [&_pre]:p-2
                [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-border)] [&_blockquote]:pl-2 [&_blockquote]:italic"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {updateNotes}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 pb-2 space-y-2">
          <p className="text-xs text-[var(--color-danger)]">{error}</p>
          {isSignatureError && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Nach einem Schlüsselwechsel muss die neue Version einmal manuell heruntergeladen werden.{' '}
              <button
                type="button"
                onClick={handleManualDownload}
                className="text-[var(--color-accent)] hover:underline font-medium"
              >
                Jetzt herunterladen
              </button>
            </p>
          )}
        </div>
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
