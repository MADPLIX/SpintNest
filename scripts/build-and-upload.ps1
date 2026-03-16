# SprintNest Build & Upload Script
# WICHTIG: Kein Fallback auf Platzhalter-Signaturen erlaubt.
# Wenn Signing fehlschlägt, bricht das Script mit einem Fehler ab.

param(
    [string]$Notes = "Neue Version"
)

$ErrorActionPreference = "Stop"
$keyPath = "G:\Programmier Projekte\Sprintnestkey\sprintnest.key"
$projectDir = "G:\Programmier Projekte\scrum-planner"
$tokenEnvPath = "G:\Programmier Projekte\Sprintnestkey\.env"

# 1. Private Key laden
Write-Host "Lade Signing-Key..." -ForegroundColor Cyan
if (-not (Test-Path $keyPath)) {
    Write-Error "FEHLER: Key nicht gefunden unter $keyPath — Abbruch."
    exit 1
}
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $keyPath -Raw).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

# 2. Build starten (Tauri erstellt .nsis.zip + .nsis.zip.sig automatisch)
Write-Host "Starte Build..." -ForegroundColor Cyan
Set-Location $projectDir
npm run tauri:build

# Version aus package.json lesen
$version = (Get-Content "package.json" | ConvertFrom-Json).version
$nsisDir = "src-tauri\target\release\bundle\nsis"
$zipPath = "$nsisDir\SprintNest_${version}_x64-setup.nsis.zip"
$exePath  = "$nsisDir\SprintNest_${version}_x64-setup.exe"

# Tauri v2 (createUpdaterArtifacts: true) → .exe + .exe.sig
# Tauri v1-compat (createUpdaterArtifacts: "v1Compatible") → .nsis.zip + .nsis.zip.sig
if (Test-Path "$zipPath.sig") {
    $installerPath = $zipPath
    $sigPath = "$zipPath.sig"
} elseif (Test-Path "$exePath.sig") {
    $installerPath = $exePath
    $sigPath = "$exePath.sig"
} else {
    Write-Error "FEHLER: Keine .sig-Datei gefunden. Signing ist fehlgeschlagen (Key oder Passwort falsch?) — Abbruch. KEIN Platzhalter wird hochgeladen."
    exit 1
}
if (-not (Test-Path $installerPath)) {
    Write-Error "FEHLER: Installer nicht gefunden: $installerPath — Abbruch."
    exit 1
}

$sig = (Get-Content $sigPath -Raw).Trim()
Write-Host "Signatur OK ($installerPath)." -ForegroundColor Green

# 4. Upload-Token laden
$token = ""
if (Test-Path $tokenEnvPath) {
    Get-Content $tokenEnvPath | ForEach-Object {
        if ($_ -match "^UPLOAD_TOKEN=(.+)$") { $token = $matches[1].Trim() }
    }
}
if (-not $token) {
    Write-Error "FEHLER: UPLOAD_TOKEN nicht in $tokenEnvPath gefunden — Abbruch."
    exit 1
}

# 5. Hochladen
Write-Host "Lade Release $version hoch..." -ForegroundColor Cyan
$result = curl.exe -s -X POST `
    -H "Authorization: Bearer $token" `
    -F "version=$version" `
    -F "notes=$Notes" `
    -F "platform=x86_64-pc-windows-msvc" `
    -F "signature=$sig" `
    -F "installer=@$installerPath" `
    https://sn.madplix.de/admin/release

if ($result -match '"ok":true') {
    Write-Host "Erfolgreich hochgeladen: Version $version" -ForegroundColor Green
} else {
    Write-Error ("FEHLER: Upload fehlgeschlagen: " + $result)
    exit 1
}
