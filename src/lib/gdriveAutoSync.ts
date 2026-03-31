import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import * as gdrive from './gdrive';

const DEBOUNCE_MS = 45_000;
const STARTUP_PUSH_MS = 2_500;

export const GDRIVE_AUTOSYNC_STORAGE_KEY = 'sn_gdrive_autosync';

export function isGdriveAutosyncEnabled(): boolean {
  const v = localStorage.getItem(GDRIVE_AUTOSYNC_STORAGE_KEY);
  if (v === null) return true;
  return v === '1' || v === 'true';
}

export function setGdriveAutosyncEnabled(on: boolean): void {
  localStorage.setItem(GDRIVE_AUTOSYNC_STORAGE_KEY, on ? '1' : '0');
}

function touchLastSync(): void {
  localStorage.setItem('sn_gdrive_last_sync', new Date().toISOString());
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function tryPushQuiet(): Promise<void> {
  if (!isGdriveAutosyncEnabled()) return;
  if (!(await gdrive.isConnected())) return;
  try {
    await gdrive.push();
    touchLastSync();
  } catch (e) {
    console.error('Google Drive Auto-Push:', e);
  }
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
    void tryPushQuiet();
  }, STARTUP_PUSH_MS);
  cleanups.push(() => clearTimeout(startTimer));

  let closingAfterPush = false;
  getCurrentWindow()
    .onCloseRequested(async (event) => {
      if (closingAfterPush) return;
      if (!isGdriveAutosyncEnabled() || !(await gdrive.isConnected())) return;
      event.preventDefault();
      try {
        await gdrive.push();
        touchLastSync();
      } catch (e) {
        console.error('Google Drive push on close:', e);
      }
      closingAfterPush = true;
      await getCurrentWindow().destroy();
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

