/**
 * Führt Tauri-Build mit Signing aus.
 * Umgeht cmd.exe, damit Umgebungsvariablen (Passwort mit Sonderzeichen) korrekt übergeben werden.
 */
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) throw new Error('.env nicht gefunden');
  const content = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  const env = { ...process.env };
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*#|^\s*$/.test(line)) continue;
    const m = line.match(/^\s*([^=]+)=(.*)$/);
    if (m) {
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[m[1].trim()] = value;
    }
  }
  return env;
}

const env = loadEnv();
const keyPath = resolve(root, '..', 'Sprintnestkey', 'sprintnest_new.key');

if (!existsSync(keyPath)) throw new Error(`Key nicht gefunden: ${keyPath}`);

// Passwort: von PowerShell-Prompt (process.env) oder aus .env
const password = (process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || env.TAURI_KEY_PASSWORD || '')
  .trim()
  .replace(/[\x00-\x1F\x7F]/g, '');
if (!password) throw new Error('Passwort erforderlich (wird abgefragt oder aus .env)');

// Key als absoluter Pfad (Tauri liest die Datei direkt – vermeidet Encoding-Probleme)
const keyPathResolved = resolve(keyPath);

const buildEnv = {
  ...process.env,
  ...env,
  TAURI_SIGNING_PRIVATE_KEY: keyPathResolved,
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: password,
};

// 1. Bump version
const bump = spawnSync('node', [join(__dirname, 'bump-version.js')], { cwd: root, stdio: 'inherit', env: buildEnv });
if (bump.status !== 0) process.exit(bump.status || 1);

// 2. Tauri build (direkt über Node, kein npx/cmd.exe)
const tauriCli = join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const tauri = spawnSync('node', [tauriCli, 'build'], { cwd: root, stdio: 'inherit', env: buildEnv });
process.exit(tauri.status ?? 1);
