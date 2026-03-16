import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { getChangelog } from '../lib/changelog';

const STORAGE_KEY = 'sn_last_seen_version';

export function WhatsNewModal() {
  const [entry, setEntry] = useState<{ version: string; items: string[] } | null>(null);

  useEffect(() => {
    getVersion().then((version) => {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (lastSeen === version) return;
      const changelog = getChangelog(version);
      if (changelog) setEntry(changelog);
      localStorage.setItem(STORAGE_KEY, version);
    });
  }, []);

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-modal)] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Was ist neu in SprintNest</p>
            <p className="text-xs text-[var(--color-text-muted)]">Version {entry.version}</p>
          </div>
        </div>

        <ul className="px-6 py-4 space-y-3">
          {entry.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
                     fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
              <span className="text-sm text-[var(--color-text-muted)] leading-snug">{item}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-5">
          <button
            onClick={() => setEntry(null)}
            className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            Los geht's
          </button>
        </div>
      </div>
    </div>
  );
}
