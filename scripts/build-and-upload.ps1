# SprintNest Build & Upload Script
# Wenn Signing fehlschlägt, bricht das Script mit einem Fehler ab.

param(
    [string]$Notes = "Neue Version"
)

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot
$envPath = Join-Path $PSScriptRoot ".env"

# 1. .env laden
Write-Host "Lade .env..." -ForegroundColor Cyan
if (-not (Test-Path $envPath)) {
    Write-Error "FEHLER: .env nicht gefunden unter $envPath — Abbruch."
    exit 1
}
Get-Content $envPath | ForEach-Object {
    if ($_ -match "^(.+?)=(.+)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim())
    }
}

# 2. Signing Keys setzen
$env:TAURI_SIGNING_PRIVATE_KEY = $env:TAURI_PRIVATE_KEY
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $env:TAURI_KEY_PASSWORD

if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
    Write-Error "FEHLER: TAURI_PRIVATE_KEY nicht in .env gefunden — Abbruch."
    exit 1
}
if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    Write-Error "FEHLER: TAURI_KEY_PASSWORD nicht in .env gefunden — Abbruch."
    exit 1
}
if (-not $env:UPLOAD_TOKEN) {
    Write-Error "FEHLER: UPLOAD_TOKEN nicht in .env gefunden — Abbruch."
    exit 1
}

# 3. Build starten
Write-Host "Starte Build..." -ForegroundColor Cyan
Set-Location $projectDir
npm run tauri:build

# 4. Version und Pfade ermitteln
$version = (Get-Content "package.json" | ConvertFrom-Json).version
$nsisDir = "src-tauri\target\release\bundle\nsis"
$zipPath = "$nsisDir\SprintNest_${version}_x64-setup.nsis.zip"
$exePath  = "$nsisDir\SprintNest_${version}_x64-setup.exe"

if (Test-Path "$zipPath.sig") {
    $installerPath = $zipPath
    $sigPath = "$zipPath.sig"
} elseif (Test-Path "$exePath.sig") {
    $installerPath = $exePath
    $sigPath = "$exePath.sig"
} else {
    Write-Error "FEHLER: Keine .sig-Datei gefunden. Signing fehlgeschlagen — Abbruch."
    exit 1
}
if (-not (Test-Path $installerPath)) {
    Write-Error "FEHLER: Installer nicht gefunden: $installerPath — Abbruch."
    exit 1
}

$sig = (Get-Content $sigPath -Raw).Trim()
Write-Host "Signatur OK ($installerPath)." -ForegroundColor Green

# 5. Hochladen
Write-Host "Lade Release $version hoch..." -ForegroundColor Cyan
$result = curl.exe -s -X POST `
    -H "Authorization: Bearer $env:UPLOAD_TOKEN" `
    -F "version=$version" `
    -F "notes=$Notes" `
    -F "platform=x86_64-pc-windows-msvc" `
    -F "signature=$sig" `
    -F "installer=@$installerPath" `
    $env:RELEASE_ENDPOINT

if ($result -match '"ok":true') {
    Write-Host "Erfolgreich hochgeladen: Version $version" -ForegroundColor Green
} else {
    Write-Error ("FEHLER: Upload fehlgeschlagen: " + $result)
    exit 1
}