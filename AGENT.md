# SprintNest – Build-Regeln für AI Agents

## Kritische Regeln (NIEMALS brechen)

### Signing & Signaturen
- **Niemals** eine Platzhalter-Signatur verwenden (`untrusted comment: placeholder` o.ä.)
- Wenn die `.sig`-Datei nach dem Build fehlt, ist das ein **Fehler** — Abbruch, nicht umgehen
- Die Signatur wird **automatisch von Tauri** während `npm run tauri:build` erstellt, wenn `TAURI_SIGNING_PRIVATE_KEY` gesetzt ist
- Niemals manuell mit `npx tauri signer sign` nachsignieren als Fallback

### Build-Artefakte
- Tauri erstellt automatisch: `SprintNest_<version>_x64-setup.nsis.zip` + `.nsis.zip.sig`
- **Niemals** die `.exe` manuell mit `Compress-Archive` zippen — das erzeugt ein ungültiges Update-Paket
- Das korrekte Artefakt liegt immer in: `src-tauri/target/release/bundle/nsis/SprintNest_<version>_x64-setup.nsis.zip`

### `createUpdaterArtifacts` in `tauri.conf.json`
- Muss immer `true` sein (nicht `"v1Compatible"`, nicht `false`)
- `"v1Compatible"` ist veraltet und wird in Tauri v3 entfernt

### Versionen
- Versionen **niemals manuell** hochzählen — das macht `scripts/bump-version.js` automatisch vor jedem Build (`pretauri:build` Hook)
- Beide Dateien müssen immer dieselbe Version haben: `package.json` und `src-tauri/tauri.conf.json`

---

## Build-Workflow

### Voraussetzungen
- Signing-Key: `G:\Programmier Projekte\Sprintnestkey\sprintnest.key`
- Upload-Token: `G:\Programmier Projekte\Sprintnestkey\.env` → `UPLOAD_TOKEN=...`
- Env-Variable muss vor dem Build gesetzt sein:
  ```powershell
  $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content "G:\Programmier Projekte\Sprintnestkey\sprintnest.key" -Raw).Trim()
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
  ```

### Neues Release bauen und hochladen
```powershell
cd "G:\Programmier Projekte\scrum-planner"
.\scripts\build-and-upload.ps1 -Notes "Beschreibung der Änderungen"
```

Das Script (`scripts/build-and-upload.ps1`):
1. Lädt den Signing-Key
2. Führt `npm run tauri:build` aus (bump-version.js erhöht Version automatisch)
3. Prüft ob `.nsis.zip` **und** `.nsis.zip.sig` existieren — **bricht ab wenn nicht**
4. Lädt beides auf `https://sn.madplix.de/admin/release` hoch

### Build-Script darf NICHT verändert werden um:
- Platzhalter-Signaturen zu ermöglichen
- Manuelle ZIP-Erstellung hinzuzufügen
- Fehler zu unterdrücken statt abzubrechen

---

## Update-Server

- URL: `https://sn.madplix.de`
- Releases clearen: `DELETE /admin/releases` (Bearer Token erforderlich)
- Releases auflisten: `GET /admin/releases` (Bearer Token erforderlich)
- Update prüfen (wie Tauri-Client): `GET /update/windows-x86_64/<version>`

---

## Architektur

```
Internet → Cloudflare Tunnel (HTTPS) → Traefik (HTTP) → SNupdate-net → Update-Server (Port 3000)
```

- TLS nur bei Cloudflare — Traefik leitet intern über HTTP weiter
- Docker-Netzwerk: `SNupdate-net` (external, Traefik ist manuell verbunden)
- Volume: `/home/madplix/docker/data/SNupdater` → enthält `releases.json` und `files/`
- Deployment: Portainer zieht automatisch via Webhook aus `https://github.com/MADPLIX/sprintnest-update-server` (Branch: `master`)
