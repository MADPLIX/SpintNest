import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import * as gdrive from './gdrive';
import { useStore } from '../store/useStore';

/** Session: Hinweis bei blockiertem Auto-Push max. einmal; nach Pull/manuellem Push zurücksetzen. */
export const AUTOSYNC_BLOCKED_HINT_SESSION_KEY = 'sn_gdrive_autosync_blocked_hint';

const DEBOUNCE_MS = 45_000;
const STARTUP_PUSH_MS = 2_500;

export const GDRIVE_AUTOSYNC_STORAGE_KEY = 'sn_gdrive_autosync';

export function isGdriveAutosyncEnabled(): boolean {
  const v = localStorage.getItem(GDRIVE_AUTOSYNC_STORAGE_KEY);
  if (v === null) return false;
  return v === '1' || v === 'true';
}

export function setGdriveAutosyncEnabled(on: boolean): void {
  localStorage.setItem(GDRIVE_AUTOSYNC_STORAGE_KEY, on ? '1' : '0');
}

function touchLastSync(): void {
  localStorage.setItem('sn_gdrive_last_sync', new Date().toISOString());
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function warnAutosyncBlockedOnce(): void {
  if (sessionStorage.getItem(AUTOSYNC_BLOCKED_HINT_SESSION_KEY)) return;
  sessionStorage.setItem(AUTOSYNC_BLOCKED_HINT_SESSION_KEY, '1');
  useStore.getState().showAlert(
    'Automatisches Sichern übersprungen: Auf Google Drive liegt eine neuere Version als der letzte Abgleich auf diesem Gerät, oder es fehlt noch ein Abgleich. Nutze „Von Drive laden“, wenn du den Stand vom anderen Gerät brauchst. Danach kannst du wieder normal weiterarbeiten; „Auf Drive speichern“ aktualisiert den Abgleich bewusst.',
    'info'
  );
}

async function tryPushQuiet(options?: { silentIfBlocked?: boolean }): Promise<void> {
  if (!isGdriveAutosyncEnabled()) return;
  if (!(await gdrive.isConnected())) return;
  try {
    const pushed = await gdrive.push('auto');
    if (!pushed) {
      if (!options?.silentIfBlocked) warnAutosyncBlockedOnce();
      return;
    }
    touchLastSync();
  } catch (e) {
    console.error('Google Drive Auto-Push:', e);
  }
}

/** Best-effort Push vor App-Ende; nicht awaiten (Schließen darf nicht hängen). */
export function exitPushBestEffort(): void {
  void tryPushQuiet({ silentIfBlocked: true });
}

function scheduleDebouncedPush(): void {
  if (!isGdriveAutosyncEnabled()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void tryPushQuiet();
  }, DEBOUNCE_MS);
}

/** Registriert Listener für Auto-Push; Rückgabe ist Cleanup (z. B. useEffect). */
export function initGdriveAutoSync(): () => void {
  const cleanups: Array<() => void> = [];

  listen('data-saved', () => {
    scheduleDebouncedPush();
  })
    .then((unlisten) => cleanups.push(unlisten))
    .catch((e) => console.warn('gdrive autosync listen:', e));

  const startTimer = window.setTimeout(() => {
    void tryPushQuiet({ silentIfBlocked: true });
  }, STARTUP_PUSH_MS);
  cleanups.push(() => clearTimeout(startTimer));

  getCurrentWindow()
    .onCloseRequested(() => {
      // Kein preventDefault. Gleicher Pfad wie Titelleiste (tryPushQuiet, nicht blockierend).
      exitPushBestEffort();
    })
    .then((unlisten) => cleanups.push(unlisten))
    .catch((e) => console.warn('gdrive autosync close:', e));

  return () => {
    for (const c of cleanups) c();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };
}