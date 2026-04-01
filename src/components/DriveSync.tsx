import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import * as gdrive from '../lib/gdrive';
import {
  AUTOSYNC_BLOCKED_HINT_SESSION_KEY,
  isGdriveAutosyncEnabled,
  setGdriveAutosyncEnabled,
} from '../lib/gdriveAutoSync';
import { ConfirmModal } from './ConfirmModal';

export function DriveSync() {
  const showAlert = useStore((s) => s.showAlert);
  const triggerProjectsRefresh = useStore((s) => s.triggerProjectsRefresh);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('sn_gdrive_last_sync'));
  const [autosync, setAutosync] = useState(() => isGdriveAutosyncEnabled());
  const [pullConfirmOpen, setPullConfirmOpen] = useState(false);

  useEffect(() => {
    gdrive.isConnected().then(setConnected);
  }, []);

  function updateLastSync() {
    const now = new Date().toISOString();
    localStorage.setItem('sn_gdrive_last_sync', now);
    setLastSync(now);
  }

  function persistAutosync(on: boolean) {
    setGdriveAutosyncEnabled(on);
    setAutosync(on);
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      await gdrive.connect();
      setConnected(true);
      showAlert('Google Drive erfolgreich verbunden!', 'success');
    } catch (e) {
      showAlert('Verbindung fehlgeschlagen: ' + String(e), 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function handlePush() {
    setSyncing(true);
    try {
      await gdrive.push('manual');
      sessionStorage.removeItem(AUTOSYNC_BLOCKED_HINT_SESSION_KEY);
      updateLastSync();
      showAlert('Daten auf Google Drive gespeichert.', 'success');
    } catch (e) {
      showAlert('Fehler beim Hochladen: ' + String(e), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function runPull() {
    setPullConfirmOpen(false);
    setSyncing(true);
    try {
      await gdrive.pull();
      sessionStorage.removeItem(AUTOSYNC_BLOCKED_HINT_SESSION_KEY);
      updateLastSync();
      triggerProjectsRefresh();
      showAlert('Daten von Google Drive geladen.', 'success');
    } catch (e) {
      showAlert('Fehler beim Herunterladen: ' + String(e), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    await gdrive.disconnect();
    setConnected(false);
    setLastSync(null);
  }

  return (
    <section className="p-5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
      <h3 className="text-lg font-medium text-[var(--color-text)] mb-1">Google Drive Sync</h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Speichere deine Projekte in deinem Google Drive und synchronisiere zwischen Geräten.
      </p>

      {!connected ? (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-text-dim)]">
            Verbinde deinen Google-Account, um deine Projekte in deinem persönlichen Google Drive zu sichern.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors text-sm"
          >
            {connecting ? 'Warte auf Browser-Anmeldung...' : 'Mit Google Drive verbinden'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-emerald-400">Verbunden mit Google Drive</span>
          </div>
          {lastSync && (
            <p className="text-xs text-[var(--color-text-dim)]">
              Letzte Synchronisierung: {new Date(lastSync).toLocaleString('de-DE')}
            </p>
          )}
          <label className="flex items-start gap-3 cursor-pointer text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={autosync}
              onChange={(e) => persistAutosync(e.target.checked)}
              className="mt-1 rounded border-[var(--color-border)]"
            />
            <span>
              <span className="font-medium">Automatisch auf Drive sichern</span>
              <span className="block text-xs text-[var(--color-text-muted)] mt-1">
                Lädt nur hoch, wenn auf Google Drive seit dem letzten Laden oder Speichern auf diesem Gerät nichts
                Neueres liegt (Schutz vor Überschreiben durch ein zweites Gerät). Nach Änderungen mit kurzer
                Verzögerung, kurz nach Start und beim Beenden. Einmal „Von Drive laden“ setzt den Abgleich auf
                diesem PC. Manuelles „Auf Drive speichern“ lädt immer hoch.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePush}
              disabled={syncing}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors text-sm"
            >
              {syncing ? 'Lädt...' : 'Auf Drive speichern'}
            </button>
            <button
              onClick={() => setPullConfirmOpen(true)}
              disabled={syncing}
              className="px-4 py-2 bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-bg)] disabled:opacity-50 transition-colors text-sm"
            >
              {syncing ? 'Lädt...' : 'Von Drive laden'}
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-[var(--color-danger)] hover:text-[var(--color-danger-hover)] text-sm transition-colors"
            >
              Trennen
            </button>
          </div>
        </div>
      )}

      {pullConfirmOpen && (
        <ConfirmModal
          title="Von Google Drive laden?"
          message="Alle lokalen Projekte, Tasks, Sprints und Arbeitsprotokolle werden durch die Kopie aus Google Drive ersetzt. Nicht gesicherte lokale Änderungen gehen verloren. Fortfahren?"
          confirmLabel="Ja, von Drive laden"
          danger
          onConfirm={() => void runPull()}
          onCancel={() => setPullConfirmOpen(false)}
        />
      )}
    </section>
  );
}
