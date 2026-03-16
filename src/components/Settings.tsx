import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { api } from '../api';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import {
  getTheme,
  setTheme as saveTheme,
  getAccentColor,
  setAccentColor,
  applyAccentColor,
  ACCENT_PRESETS,
} from '../lib/settings';
import { startTour } from '../lib/tour';
import { DriveSync } from './DriveSync';
import { ConfirmModal } from './ConfirmModal';

export function Settings() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setView = useStore((s) => s.setView);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const triggerProjectsRefresh = useStore((s) => s.triggerProjectsRefresh);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const showAlert = useStore((s) => s.showAlert);
  const setThemeStore = useStore((s) => s.setTheme);

  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme());
  const [accentColor, setAccentColorLocal] = useState(getAccentColor());
  const [customColor, setCustomColor] = useState(getAccentColor());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  function handleThemeChange(t: 'dark' | 'light') {
    setTheme(t);
    saveTheme(t);
    setThemeStore(t);
    document.documentElement.setAttribute('data-theme', t);
  }

  function handleAccentChange(hex: string) {
    setAccentColorLocal(hex);
    setCustomColor(hex);
    setAccentColor(hex);
  }

  async function exportProjectBackup() {
    if (!selectedProjectId) {
      showAlert('Bitte wähle zuerst ein Projekt aus der Sidebar.', 'info');
      return;
    }
    setLoading(true);
    try {
      const [projData, taskData, sprintData, logData] = await Promise.all([
        api.projects.getAll(),
        api.tasks.getAll(selectedProjectId),
        api.sprints.getAll(selectedProjectId),
        api.dailyLogs.getAll(selectedProjectId, '2000-01-01', '2099-12-31'),
      ]);
      const project = projData.find((p) => p.id === selectedProjectId);
      const backup = {
        version: 1,
        exportDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        project,
        tasks: taskData,
        sprints: sprintData,
        dailyLogs: logData,
      };
      const json = JSON.stringify(backup, null, 2);
      const bytes = Array.from(new TextEncoder().encode(json));
      const filename = `Backup-${project?.name || 'Projekt'}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      const path = await invoke<string | null>('save_file_dialog', {
        default_name: filename,
        filters: [['JSON', ['json']]],
      });
      if (path) {
        await invoke('write_file_bytes', { path, data: bytes });
        showAlert('Projekt-Backup gespeichert!', 'success');
      }
    } catch (e) {
      console.error('Backup-Fehler:', e);
      showAlert('Fehler beim Backup: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportFullBackup() {
    setLoading(true);
    try {
      const [projData, taskData, sprintData, logData] = await Promise.all([
        api.projects.getAll(),
        api.tasks.getAll(),
        api.sprints.getAll(),
        api.dailyLogs.getAll(undefined, '2000-01-01', '2099-12-31'),
      ]);
      const backup = {
        version: 1,
        exportDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        type: 'full',
        projects: projData,
        tasks: taskData,
        sprints: sprintData,
        dailyLogs: logData,
      };
      const json = JSON.stringify(backup, null, 2);
      const bytes = Array.from(new TextEncoder().encode(json));
      const filename = `Backup-Vollstaendig-${format(new Date(), 'yyyy-MM-dd')}.json`;
      const path = await invoke<string | null>('save_file_dialog', {
        default_name: filename,
        filters: [['JSON', ['json']]],
      });
      if (path) {
        await invoke('write_file_bytes', { path, data: bytes });
        showAlert('Vollständiges Backup gespeichert!', 'success');
      }
    } catch (e) {
      console.error('Backup-Fehler:', e);
      showAlert('Fehler beim Backup: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function importBackup() {
    setLoading(true);
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!path || Array.isArray(path)) return;
      const content = await invoke<string>('read_file_text', { path: String(path) });
      const raw = JSON.parse(content) as Record<string, unknown>;

      // Unterstützung für data.json (HashMap-Format) und Backup-Format (Array)
      let project: import('../types').Project | undefined;
      let taskList: import('../types').Task[] = [];
      let sprintList: import('../types').Sprint[] = [];
      let logList: import('../types').DailyLog[] = [];

      if (raw.project && typeof raw.project === 'object' && !Array.isArray(raw.project)) {
        // Projekt-Backup: { project, tasks, sprints, dailyLogs }
        project = raw.project as import('../types').Project;
        taskList = Array.isArray(raw.tasks) ? (raw.tasks as import('../types').Task[]) : [];
        sprintList = Array.isArray(raw.sprints) ? (raw.sprints as import('../types').Sprint[]) : [];
        logList = Array.isArray(raw.dailyLogs) ? (raw.dailyLogs as import('../types').DailyLog[]) : [];
      } else if (raw.projects) {
        const projects = raw.projects;
        if (Array.isArray(projects) && projects.length > 0) {
          project = projects[0] as import('../types').Project;
          const projId = project.id;
          taskList = Array.isArray(raw.tasks)
            ? (raw.tasks as { projekt_id: string }[]).filter((t) => t.projekt_id === projId) as import('../types').Task[]
            : [];
          sprintList = Array.isArray(raw.sprints)
            ? (raw.sprints as { projekt_id: string }[]).filter((s) => s.projekt_id === projId) as import('../types').Sprint[]
            : [];
          logList = Array.isArray(raw.dailyLogs)
            ? (raw.dailyLogs as { projekt_id: string }[]).filter((l) => l.projekt_id === projId) as import('../types').DailyLog[]
            : [];
        } else if (typeof projects === 'object' && projects !== null && !Array.isArray(projects)) {
          // data.json: projects/tasks/sprints/daily_logs als HashMap
          const projEntries = Object.values(projects) as import('../types').Project[];
          if (projEntries.length > 0) {
            project = projEntries[0];
            const projId = project.id;
            const tasksObj = raw.tasks as Record<string, unknown> | undefined;
            const sprintsObj = raw.sprints as Record<string, unknown> | undefined;
            const logsObj = (raw.daily_logs ?? raw.dailyLogs) as Record<string, unknown> | undefined;
            taskList = tasksObj ? (Object.values(tasksObj) as { projekt_id: string }[]).filter((t) => t.projekt_id === projId) as import('../types').Task[] : [];
            sprintList = sprintsObj ? (Object.values(sprintsObj) as { projekt_id: string }[]).filter((s) => s.projekt_id === projId) as import('../types').Sprint[] : [];
            logList = logsObj ? (Object.values(logsObj) as { projekt_id: string }[]).filter((l) => l.projekt_id === projId) as import('../types').DailyLog[] : [];
          }
        }
      }

      if (!project) {
        showAlert('Ungültiges Backup-Format: Kein Projekt gefunden.', 'error');
        return;
      }

      const imported = await api.importBackup({
        project,
        tasks: taskList,
        sprints: sprintList,
        dailyLogs: logList,
      });
      triggerProjectsRefresh();
      await new Promise((r) => setTimeout(r, 300));
      useStore.getState().addOpenProject(imported.id);
      setView('dashboard');
      showAlert(`Import erfolgreich! Projekt „${imported.name}" wurde erstellt.`, 'success');
    } catch (e) {
      console.error('Import-Fehler:', e);
      showAlert('Fehler beim Import: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-2xl font-semibold text-[var(--color-text)]">Einstellungen</h2>

      <section className="p-5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Hilfe</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Interaktive Einführung in die wichtigsten Bereiche von SprintNest.
        </p>
        <button
          onClick={() => startTour(() => setSidebarCollapsed(false))}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Tour starten
        </button>
      </section>

      <section className="p-5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Zurücksetzen</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Alle Projekte, Tasks, Sprints, Protokolle und Einstellungen löschen. Die App startet danach neu. Nicht rückgängig machbar.
        </p>
        <button
          onClick={() => setShowResetConfirm(true)}
          disabled={resetting}
          className="px-4 py-2 bg-[var(--color-danger)] text-white rounded-lg hover:bg-[var(--color-danger-hover)] disabled:opacity-50 transition-colors"
        >
          {resetting ? 'Wird zurückgesetzt...' : 'Alles zurücksetzen'}
        </button>
      </section>

      {showResetConfirm && (
        <ConfirmModal
          title="Alles zurücksetzen?"
          message="Alle Projekte, Tasks, Sprints, Arbeitsprotokolle, Screenshots und Einstellungen werden unwiderruflich gelöscht. Die App startet danach neu. Fortfahren?"
          confirmLabel="Ja, zurücksetzen"
          danger
          onConfirm={async () => {
            setResetting(true);
            try {
              await api.resetAppData();
              localStorage.removeItem('sprintnest_theme');
              localStorage.removeItem('sprintnest_accent');
              localStorage.removeItem('sprintnest_tour_seen');
              setShowResetConfirm(false);
              window.location.reload();
            } catch (e) {
              console.error('Reset-Fehler:', e);
              showAlert('Fehler beim Zurücksetzen: ' + (e instanceof Error ? e.message : String(e)), 'error');
              setResetting(false);
            }
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      <section className="p-5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Darstellung</h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Design</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange('dark')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Dunkel
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Hell
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Akzentfarbe (Buttons, Links)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleAccentChange(p.value)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  accentColor === p.value ? 'border-white ring-2 ring-[var(--color-accent)] scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: p.value }}
                title={p.label}
              />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => handleAccentChange(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-[var(--color-border)]"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onBlur={() => {
                if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) handleAccentChange(customColor);
              }}
              onKeyDown={(e) => e.key === 'Enter' && /^#[0-9A-Fa-f]{6}$/.test(customColor) && handleAccentChange(customColor)}
              placeholder="#6366f1"
              className="w-28 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)]"
            />
          </div>
        </div>
      </section>

      <section className="p-5 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">Sicherung & Wiederherstellung</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Sichere deine Projekte als JSON-Datei. Bei einem Projekt-Backup wird nur das ausgewählte Projekt exportiert.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportProjectBackup}
            disabled={!selectedProjectId || loading}
            className="px-4 py-2 bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg)] disabled:opacity-50 text-[var(--color-text)]"
          >
            {loading ? 'Lade...' : 'Projekt sichern'}
          </button>
          <button
            onClick={exportFullBackup}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg)] disabled:opacity-50 text-[var(--color-text)]"
          >
            {loading ? 'Lade...' : 'Alle Daten sichern'}
          </button>
          <button
            onClick={importBackup}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Lade...' : 'Backup importieren'}
          </button>
        </div>
        {!selectedProjectId && (
          <p className="text-xs text-[var(--color-text-dim)] mt-2">Projekt sichern: Wähle zuerst ein Projekt in der Sidebar.</p>
        )}
      </section>

      <DriveSync />
    </div>
  );
}
