import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from './gdriveConfig';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'sprintnest_data.json';

/** Letzte bekannte modifiedTime der Drive-Datei (nach Pull/Push dieses Geräts). Für Konflikt-Schutz beim Auto-Push. */
export const GDRIVE_REMOTE_MODIFIED_KEY = 'sn_gdrive_remote_modified';

function getStoredRemoteModified(): string | null {
  return localStorage.getItem(GDRIVE_REMOTE_MODIFIED_KEY);
}

function setStoredRemoteModified(iso: string | null): void {
  if (iso) localStorage.setItem(GDRIVE_REMOTE_MODIFIED_KEY, iso);
  else localStorage.removeItem(GDRIVE_REMOTE_MODIFIED_KEY);
}

async function fetchFileModifiedTime(token: string, fileId: string): Promise<string | null> {
  const res = await fetch(`${DRIVE_API}/${fileId}?fields=modifiedTime`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { modifiedTime?: string };
  return json.modifiedTime ?? null;
}

/**
 * Auto-Push nur, wenn sich auf Drive seit unserem letzten Pull/Push nichts geändert hat
 * (sonst droht ein anderes Gerät mit neuerem Stand überschrieben zu werden).
 */
export async function canAutosyncPush(): Promise<boolean> {
  if (!(await isConnected())) return false;
  let token: string;
  try {
    token = await getToken();
  } catch {
    return false;
  }
  const fileId = await findFileId(token);
  if (!fileId) return true;
  const remote = await fetchFileModifiedTime(token, fileId);
  if (!remote) return false;
  const stored = getStoredRemoteModified();
  if (!stored) return false;
  return remote <= stored;
}

interface TokenStore {
  access_token: string;
  refresh_token: string | null;
  expires_at: number;
}

let _cache: TokenStore | null = null;

async function loadTokens(): Promise<TokenStore | null> {
  if (_cache) return _cache;
  const raw = await invoke<string | null>('load_gdrive_tokens');
  if (!raw) return null;
  try { _cache = JSON.parse(raw); return _cache; } catch { return null; }
}

async function saveTokens(access: string, refresh: string | null, expiresIn: number) {
  const existing = await loadTokens();
  _cache = {
    access_token: access,
    refresh_token: refresh ?? existing?.refresh_token ?? null,
    expires_at: Date.now() + expiresIn * 1000 - 60_000,
  };
  await invoke('save_gdrive_tokens', { tokens: JSON.stringify(_cache) });
}

export async function isConnected(): Promise<boolean> {
  const t = await loadTokens();
  return !!(t?.refresh_token);
}

function generateVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function connect(): Promise<void> {
  const port = await invoke<number>('start_oauth_listener');
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  await invoke('open_url', { url: `${AUTH_URL}?${params}` });

  let unlistenFn: (() => void) | undefined;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unlistenFn?.();
      reject(new Error('Timeout: Keine Antwort vom Browser.'));
    }, 5 * 60 * 1000);

    listen<string>('oauth-code', async (event) => {
      clearTimeout(timeout);
      unlistenFn?.();
      try {
        const res = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code: decodeURIComponent(event.payload),
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: verifier,
          }),
        });
        const json = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
        if (!json.access_token) throw new Error(json.error_description ?? json.error ?? 'Kein Access Token erhalten');
        saveTokens(json.access_token, json.refresh_token ?? null, json.expires_in ?? 3600);
        resolve();
      } catch (e) {
        reject(e);
      }
    }).then((fn) => { unlistenFn = fn; });
  });
}

async function getToken(): Promise<string> {
  const t = await loadTokens();
  if (!t?.refresh_token) throw new Error('Nicht verbunden');

  if (t.access_token && Date.now() < t.expires_at) return t.access_token;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: t.refresh_token, grant_type: 'refresh_token' }),
  });
  const json = await res.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!json.access_token) throw new Error(json.error ?? 'Token-Refresh fehlgeschlagen');
  await saveTokens(json.access_token, null, json.expires_in ?? 3600);
  return json.access_token;
}

async function findFileId(token: string): Promise<string | null> {
  const res = await fetch(
    `${DRIVE_API}?spaces=appDataFolder&q=name%3D'${FILE_NAME}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const json = await res.json() as { files?: { id: string }[] };
  return json.files?.[0]?.id ?? null;
}

async function createFile(token: string, body: string): Promise<string> {
  const boundary = 'sn_boundary';
  const multipart = [
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
    JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
    body,
    `\r\n--${boundary}--`,
  ].join('');

  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipart,
  });
  if (!res.ok) throw new Error(`Drive Upload fehlgeschlagen (${res.status})`);
  const json = (await res.json()) as { id?: string; modifiedTime?: string };
  if (!json.id) throw new Error('Drive: keine Datei-ID');
  const mod = json.modifiedTime ?? (await fetchFileModifiedTime(token, json.id));
  if (mod) setStoredRemoteModified(mod);
  return json.id;
}

async function persistRemoteAfterUpload(token: string, fileId: string, patchResponse: Response): Promise<void> {
  if (patchResponse.ok) {
    const text = await patchResponse.text();
    if (text) {
      try {
        const j = JSON.parse(text) as { modifiedTime?: string };
        if (j.modifiedTime) {
          setStoredRemoteModified(j.modifiedTime);
          return;
        }
      } catch {
        /* kein JSON */
      }
    }
  }
  const mod = await fetchFileModifiedTime(token, fileId);
  if (mod) setStoredRemoteModified(mod);
}

/**
 * @param mode `auto` = nur wenn canAutosyncPush (kein Überschreiben neuerer Drive-Version).
 *            `manual` = immer hochladen (expliziter Klick), danach Baseline aktualisieren.
 * @returns Bei `auto`: false, wenn wegen Konflikt-Schutz nichts hochgeladen wurde; sonst true.
 */
export async function push(mode: 'auto' | 'manual' = 'manual'): Promise<boolean> {
  const token = await getToken();
  if (mode === 'auto' && !(await canAutosyncPush())) return false;

  const bundle = await invoke<string>('get_sync_bundle');
  const fileId = await findFileId(token);

  if (fileId) {
    const patchRes = await fetch(`${DRIVE_UPLOAD}/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: bundle,
    });
    if (!patchRes.ok) throw new Error(`Drive Upload fehlgeschlagen (${patchRes.status})`);
    await persistRemoteAfterUpload(token, fileId, patchRes);
  } else {
    await createFile(token, bundle);
  }
  return true;
}

export async function pull(): Promise<void> {
  const token = await getToken();
  const fileId = await findFileId(token);
  if (!fileId) return;

  const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bundle = await res.text();
  await invoke('apply_sync_bundle', { bundle });
  const mod = await fetchFileModifiedTime(token, fileId);
  if (mod) setStoredRemoteModified(mod);
}

export async function disconnect(): Promise<void> {
  _cache = null;
  await invoke('clear_gdrive_tokens');
  localStorage.removeItem('sn_gdrive_last_sync');
  setStoredRemoteModified(null);
}
