/**
 * Erhöht die Versionsnummer vor dem Build.
 * Wird von pretauri:build aufgerufen.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function bumpVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

// package.json
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const newVersion = bumpVersion(pkg.version || '0.2.0');
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// tauri.conf.json
const tauriPath = join(root, 'src-tauri', 'tauri.conf.json');
const tauri = JSON.parse(readFileSync(tauriPath, 'utf8'));
tauri.version = newVersion;
writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');

console.log(`Version auf ${newVersion} erhöht.`);
