import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import * as gdrive from '../lib/gdrive';

export function DriveSync() {
  const showAlert = useStore((s) => s.showAlert);
  const triggerProjectsRefresh = useStore((s) => s.triggerProjectsRefresh);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('sn_gdrive_last_sync'));

  useEffect(() => {
    gdrive.isConnected().then(setConnected);
  }, []);

  function updateLastSync() {
    const now = new Date().toISOString();
    localStorage.setItem('sn_gdrive_last_sync', now);
    setLastSync(now);
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
      await gdrive.push();
      updateLastSync();
      showAlert('Daten auf Google Drive gespeichert.', 'success');
    } catch (e) {
      showAlert('Fehler beim Hochladen: ' + String(e), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handlePull() {
    setSyncing(true);
    try {
      await gdrive.pull();
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePush}
              disabled={syncing}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors text-sm"
            >
              {syncing ? 'Lädt...' : 'Auf Drive speichern'}
            </button>
            <button
              onClick={handlePull}
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
    </section>
  );
}
