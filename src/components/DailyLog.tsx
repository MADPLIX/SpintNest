import { format, addDays, startOfWeek, addWeeks, isAfter, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readImage } from '@tauri-apps/plugin-clipboard-manager';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { DailyLog as DailyLogType, Project, Task } from '../types';
import { getStatusLabel } from '../types';

export function DailyLog() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const showAlert = useStore((s) => s.showAlert);
  const [logs, setLogs] = useState<DailyLogType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weekOffset, setWeekOffset] = useState(0);
  const [entry, setEntry] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [selectedProjectId, selectedDate]);

  useEffect(() => {
    if (selectedProjectId) {
      api.tasks.getAll(selectedProjectId).then(setTasks).catch(console.error);
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
    } catch (e) {
      console.error('Fehler:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      const data = await api.dailyLogs.getAll(
        selectedProjectId || undefined,
        selectedDate,
        selectedDate
      );
      setLogs(data);
      const todayLog = data.find((l) => l.datum === selectedDate);
      if (todayLog) {
        setEntry(todayLog.eintrag);
        setScreenshots(todayLog.screenshot_pfade || []);
        setLinkedTaskIds(todayLog.verknuepfte_tasks || []);
      } else {
        setEntry('');
        setScreenshots([]);
        setLinkedTaskIds([]);
      }
    } catch (e) {
      console.error('Fehler:', e);
    }
  }

  async function handleAddScreenshot() {
    try {
      const path = await open({
        multiple: true,
        directory: false,
        filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      if (path) {
        const paths = Array.isArray(path) ? path : [path];
        setScreenshots((prev) => [...prev, ...paths.map((p) => String(p))]);
      }
    } catch (e) {
      console.error('Fehler beim Öffnen:', e);
    }
  }

  async function handleTakeScreenshot() {
    try {
      const win = getCurrentWindow();
      await win.hide();
      await new Promise((r) => setTimeout(r, 300));
      try {
        const { getScreenshotableMonitors, getMonitorScreenshot } = await import('tauri-plugin-screenshots-api');
        const monitors = await getScreenshotableMonitors();
        const primary = monitors[0];
        if (primary) {
          const path = await getMonitorScreenshot(primary.id);
          if (path) setScreenshots((prev) => [...prev, path]);
        }
      } finally {
        await win.show();
      }
    } catch (e) {
      console.error('Fehler beim Screenshot:', e);
      getCurrentWindow().show().catch(() => {});
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const img = await readImage();
      if (!img) throw new Error('Kein Bild in der Zwischenablage');
      const [rgba, size] = await Promise.all([img.rgba(), img.size()]);
      const { width, height } = size;
      if (width === 0 || height === 0) throw new Error('Ungültige Bildgröße');

      const expectedLen = width * height * 4;
      if (rgba.length !== expectedLen) {
        throw new Error(`Bilddaten unvollständig: ${rgba.length} vs ${expectedLen} erwartet`);
      }

      const pixelData = new Uint8ClampedArray(rgba);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas nicht verfügbar');
      ctx.clearRect(0, 0, width, height);
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixelData);
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const dir = await api.getScreenshotsDir();
      const filename = `screenshot-${Date.now()}.png`;
      const sep = dir.includes('\\') ? '\\' : '/';
      const path = `${dir.replace(/[/\\]$/, '')}${sep}${filename}`;
      await invoke('write_file_bytes', { path, data: Array.from(bytes) });
      setScreenshots((prev) => [...prev, path]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Fehler beim Einfügen:', e);
      showAlert(
        msg.includes('Kein Bild') || msg.includes('Zwischenablage')
          ? 'Kein Bild in der Zwischenablage. Nutze Win+Shift+S (Snipping Tool), wähle einen Bereich, dann klicke hier erneut.'
          : `Fehler: ${msg}`,
        'error'
      );
    }
  }

  async function handleSave() {
    if (!selectedProjectId) {
      showAlert('Bitte wähle zuerst ein Projekt.', 'info');
      return;
    }
    const existing = logs.find((l) => l.datum === selectedDate);
    try {
      if (existing) {
        await api.dailyLogs.update({
          id: existing.id,
          eintrag: entry,
          screenshot_pfade: screenshots,
          verknuepfte_tasks: linkedTaskIds,
        });
      } else {
        await api.dailyLogs.create({
          projekt_id: selectedProjectId,
          datum: selectedDate,
          eintrag: entry,
          screenshot_pfade: screenshots,
          verknuepfte_tasks: linkedTaskIds,
        });
      }
      await loadLogs();
      showAlert('Gespeichert!', 'success');
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      const msg = e instanceof Error ? e.message : String(e);
      showAlert('Fehler beim Speichern: ' + (msg || 'Unbekannter Fehler'), 'error');
    }
  }

  function removeScreenshot(idx: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));
  }

  const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = addWeeks(baseWeek, weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek = weekOffset === 0;

  if (loading) return <div className="text-[var(--color-text-muted)]">Lade...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">Arbeitsprotokoll</h2>
        {selectedProjectId && (
          <span className="text-[var(--color-text-muted)]">
            Projekt: {projects.find((p) => p.id === selectedProjectId)?.name || '–'}
          </span>
        )}
      </div>

      {!selectedProjectId && (
        <p className="text-[var(--color-text-muted)] mb-4">Wähle ein Projekt aus der Projektliste.</p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0"
          title="Vorherige Woche"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {weekDays.map((d) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const isSelected = dateStr === selectedDate;
            const isFuture = isAfter(startOfDay(d), startOfDay(new Date()));
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                disabled={isFuture}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  isSelected ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                {format(d, 'EEE d.MM', { locale: de })}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={isCurrentWeek}
          className="p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Nächste Woche"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Tageseintrag</label>
          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Was hast du heute gemacht?"
            className="w-full h-40 px-4 py-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg resize-none text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            disabled={!selectedProjectId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Verknüpfte Tasks (aus dem Scrum Board)
          </label>
          <p className="text-xs text-[var(--color-text-dim)] mb-2">
            Verknüpfe Tasks, um Bereich und Status im PDF-Export zu befüllen.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {linkedTaskIds.map((taskId) => {
              const task = tasks.find((t) => t.id === taskId);
              return (
                <span
                  key={taskId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-muted)] text-[var(--color-accent)] rounded-lg text-sm"
                >
                  {task?.titel || taskId}
                  <button
                    type="button"
                    onClick={() => setLinkedTaskIds((prev) => prev.filter((id) => id !== taskId))}
                    className="hover:text-[var(--color-danger)]"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id && !linkedTaskIds.includes(id)) {
                setLinkedTaskIds((prev) => [...prev, id]);
              }
              e.target.value = '';
            }}
            disabled={!selectedProjectId || tasks.length === 0}
            className="w-full px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">– Task hinzufügen –</option>
            {tasks
              .filter((t) => !linkedTaskIds.includes(t.id))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titel} ({getStatusLabel(t.status)})
                </option>
              ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 gap-2">
            <label className="block text-sm font-medium text-[var(--color-text-muted)]">Screenshots</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAddScreenshot}
                disabled={!selectedProjectId}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Datei auswählen
              </button>
              <span className="text-[var(--color-text-dim)]">|</span>
              <button
                onClick={handlePasteFromClipboard}
                disabled={!selectedProjectId}
                className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                title="Win+Shift+S drücken, Bereich wählen, dann hier klicken"
              >
                Aus Zwischenablage (Snipping)
              </button>
              <span className="text-[var(--color-text-dim)]">|</span>
              <button
                onClick={handleTakeScreenshot}
                disabled={!selectedProjectId}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                title="Vollbild-Monitor-Screenshot"
              >
                Ganzer Bildschirm
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {screenshots.map((path, i) => (
              <div key={i} className="relative group">
                <div
                  className="w-24 h-24 rounded flex items-center justify-center overflow-hidden border border-[var(--color-border)]"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)`,
                    backgroundColor: '#f9fafb',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                  }}
                >
                  <img
                    src={convertFileSrc(path)}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-xs text-[var(--color-text-dim)] truncate px-2 text-center">
                    {path.split(/[/\\]/).pop()}
                  </span>
                </div>
                <button
                  onClick={() => removeScreenshot(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-danger)] text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedProjectId}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
