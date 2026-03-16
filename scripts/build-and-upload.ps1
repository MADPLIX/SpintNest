# SprintNest Build Script (nur signierte Versionen, kein Upload)

$ErrorActionPreference = "Stop"
$projectDir = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $projectDir ".env"
$keyPath = Join-Path $projectDir "..\Sprintnestkey\sprintnest_new.key"

# 1. .env laden (Werte getrimmt, Anführungszeichen entfernt)
Write-Host "Lade .env..." -ForegroundColor Cyan
if (-not (Test-Path $envPath)) {
    Write-Error "FEHLER: .env nicht gefunden unter $envPath - Abbruch."
    exit 1
}
$content = Get-Content $envPath -Raw -Encoding UTF8
$content = $content.TrimStart([char]0xFEFF)
foreach ($line in ($content -split '\r?\n')) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    if ($line -match '^\s*([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($key, $value)
    }
}

# 2. Prüfungen
if (-not (Test-Path $keyPath)) {
    Write-Error "FEHLER: Key nicht gefunden unter $keyPath - Abbruch."
    exit 1
}

# 3. Passwort abfragen (wird direkt übergeben, kein .env)
$securePassword = Read-Host "Passwort für Signing-Key" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

# 4. Build starten (Node-Wrapper umgeht cmd.exe – Credentials werden korrekt übergeben)
Write-Host "Starte Build..." -ForegroundColor Cyan
Set-Location $projectDir
node scripts/tauri-build-with-signing.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 5. Version und Pfade ermitteln
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
    Write-Error "FEHLER: Keine .sig-Datei gefunden. Signing fehlgeschlagen - Abbruch."
    exit 1
}
if (-not (Test-Path $installerPath)) {
    Write-Error "FEHLER: Installer nicht gefunden: $installerPath - Abbruch."
    exit 1
}

$sig = (Get-Content $sigPath -Raw).Trim()
Write-Host "Signatur OK ($installerPath)." -ForegroundColor Green
Write-Host "Build abgeschlossen: Version $version" -ForegroundColor Green