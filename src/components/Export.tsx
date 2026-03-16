import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DateInput } from './DateInput';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Task } from '../types';
import { getStatusLabel } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export function Export() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<'log' | 'projektplan'>('projektplan');
  const [logVon, setLogVon] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logBis, setLogBis] = useState(format(new Date(), 'yyyy-MM-dd'));

  async function loadData() {
    if (!selectedProjectId) return { projects: [], tasks: [], logs: [], sprints: [] };
    setLoading(true);
    try {
      const [projData, taskData, logData, sprintData] = await Promise.all([
        api.projects.getAll(),
        api.tasks.getAll(selectedProjectId),
        api.dailyLogs.getAll(selectedProjectId, logVon, logBis),
        api.sprints.getAll(selectedProjectId),
      ]);
      return { projects: projData, tasks: taskData, logs: logData, sprints: sprintData };
    } catch (e) {
      console.error('Fehler:', e);
      return { projects: [], tasks: [], logs: [], sprints: [] };
    } finally {
      setLoading(false);
    }
  }

  async function loadProjectPlanData() {
    if (!selectedProjectId) return { projects: [], tasks: [], sprints: [] };
    setLoading(true);
    try {
      const [projData, taskData, sprintData] = await Promise.all([
        api.projects.getAll(),
        api.tasks.getAll(selectedProjectId),
        api.sprints.getAll(selectedProjectId),
      ]);
      return { projects: projData, tasks: taskData, sprints: sprintData };
    } catch (e) {
      console.error('Fehler:', e);
      return { projects: [], tasks: [], sprints: [] };
    } finally {
      setLoading(false);
    }
  }

  const showAlert = useStore((s) => s.showAlert);

  async function exportLog() {
    if (!selectedProjectId) {
      showAlert('Bitte wähle ein Projekt.', 'info');
      return;
    }
    const { projects: projData, logs: logData, tasks: taskData, sprints: sprintData } = await loadData();
    const project = projData.find((p) => p.id === selectedProjectId);

    const sortedLogs = [...logData].sort((a, b) => a.datum.localeCompare(b.datum));

    const vonFormatted = format(new Date(logVon + 'T12:00:00'), 'dd. MMMM yyyy', { locale: de });
    const bisFormatted = format(new Date(logBis + 'T12:00:00'), 'dd. MMMM yyyy', { locale: de });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Arbeitsprotokoll', 14, 14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${project?.name || 'Export'} – ${vonFormatted} bis ${bisFormatted}`, 14, 22);

    const tableHeaders = ['Datum', 'Bereich', 'Aufgaben', 'Status', 'Notiz', 'Fotos'];
    const tableBody = sortedLogs.length === 0
      ? [['', '', 'Keine Einträge im gewählten Zeitraum', '', '', '']]
        : sortedLogs.map((l) => {
          const datum = format(new Date(l.datum + 'T12:00:00'), 'dd. MMMM yyyy', { locale: de });
          const linkedTasks: Task[] = (l.verknuepfte_tasks || [])
            .map((id) => taskData.find((t) => t.id === id))
            .filter((t): t is Task => t != null);
          const bereich =
            linkedTasks.length > 0
              ? (() => {
                  const hasBacklog = linkedTasks.some((t) => !t.sprint_id);
                  const sprintNames = [...new Set(linkedTasks.map((t) => t.sprint_id).filter(Boolean))]
                    .map((sid) => sprintData.find((s) => s.id === sid)?.name)
                    .filter(Boolean);
                  if (hasBacklog) sprintNames.unshift('Backlog');
                  return sprintNames.join(', ') || '–';
                })()
              : '–';
          const aufgaben =
            linkedTasks.length > 0
              ? linkedTasks.map((t) => t.titel).join(', ')
              : '–';
          const status =
            linkedTasks.length > 0
              ? linkedTasks.every((t) => t.status === 'Done')
                ? 'Erledigt'
                : linkedTasks.some((t) => t.status === 'In Progress' || t.status === 'Review')
                  ? 'In Bearbeitung'
                  : linkedTasks.some((t) => t.status === 'To Do')
                    ? 'Zu erledigen'
                    : [...new Set(linkedTasks.map((t) => getStatusLabel(t.status)))].join(', ')
              : '–';
          const notiz = (l.eintrag || '').replace(/\n/g, ' ').trim() || '–';
          const screenshotCount = (l.screenshot_pfade || []).length;
          const screenshotsCol = screenshotCount > 0 ? String(screenshotCount) : '–';
          return [datum, bereich, aufgaben, status, notiz, screenshotsCol];
        });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: 28,
      margin: { left: 12, right: 12 },
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 24 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22 },
        4: { cellWidth: 45 },
        5: { cellWidth: 20 },
      },
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    const imgMaxWidth = contentWidth;
    const imgMaxHeight = 240;
    const imgGap = 4;

    function normalizeImageForPdf(dataUrl: string): Promise<{ w: number; h: number; jpeg: string }> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve({ w: img.naturalWidth, h: img.naturalHeight, jpeg: canvas.toDataURL('image/jpeg', 0.92) });
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 28;
    y += 6;

    for (const l of sortedLogs) {
      const paths = l.screenshot_pfade || [];
      if (paths.length === 0) continue;

      const datumFormatted = format(new Date(l.datum + 'T12:00:00'), 'dd. MMMM yyyy', { locale: de });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fotos zum Eintrag vom ${datumFormatted}`, margin, y);
      y += 5;

      let x = margin;
      let rowHeight = 0;
      for (const path of paths) {
        try {
          const base64 = await api.readFileBase64(path);
          const ext = path.split(/[/\\]/).pop()?.toLowerCase()?.split('.').pop() || 'png';
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext === 'webp' ? 'webp' : 'png';
          const dataUrl = `data:image/${mime};base64,${base64}`;

          const { w, h, jpeg } = await normalizeImageForPdf(dataUrl);
          const scale = Math.min(imgMaxWidth / w, imgMaxHeight / h);
          const imgW = w * scale;
          const imgH = h * scale;

          if (x + imgW > pageWidth - margin && x > margin) {
            x = margin;
            y += rowHeight + imgGap;
            rowHeight = 0;
            if (y + imgH > pageHeight - 20) {
              doc.addPage();
              y = 20;
            }
          }

          doc.addImage(jpeg, 'JPEG', x, y, imgW, imgH);
          rowHeight = Math.max(rowHeight, imgH);
          x += imgW + imgGap;
        } catch {
          // Datei nicht lesbar – überspringen
        }
      }
      y += rowHeight + 8;
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
    }

    const filename = `Arbeitsprotokoll-${project?.name || 'Export'}-${logVon}-${logBis}.pdf`;

    try {
      const blob = doc.output('blob');
      const path = await invoke<string | null>('save_file_dialog', {
        default_name: filename,
        filters: [['PDF', ['pdf']]],
      });
      if (path) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = Array.from(new Uint8Array(arrayBuffer));
        await invoke('write_file_bytes', { path, data: uint8 });
        showAlert('PDF gespeichert!', 'success');
      }
    } catch (e) {
      console.error('Export-Fehler:', e);
      const msg = e instanceof Error ? e.message : String(e);
      const isFileLocked = /verwendet wird|os error 32|being used/i.test(msg);
      showAlert(
        isFileLocked
          ? 'Die Datei ist möglicherweise in einem anderen Programm geöffnet. Bitte schließen Sie die Datei oder wählen Sie einen anderen Speicherort.'
          : 'Fehler beim Export: ' + (msg || 'Unbekannter Fehler'),
        'error'
      );
    }
  }

  async function exportProjektplan() {
    if (!selectedProjectId) {
      showAlert('Bitte wähle ein Projekt.', 'info');
      return;
    }
    const { projects: projData, tasks: taskData, sprints: sprintData } = await loadProjectPlanData();
    const project = projData.find((p) => p.id === selectedProjectId);

    const sortedTasks = [...taskData].sort((a, b) => {
      const aSprint = a.sprint_id ? sprintData.find((s) => s.id === a.sprint_id) : null;
      const bSprint = b.sprint_id ? sprintData.find((s) => s.id === b.sprint_id) : null;
      const aStart = aSprint?.start_datum ?? a.faellig_am ?? '9999';
      const bStart = bSprint?.start_datum ?? b.faellig_am ?? '9999';
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      return (a.prioritaet - b.prioritaet) || (a.titel.localeCompare(b.titel));
    });

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Projektplan', 14, 14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${project?.name || 'Export'} – ${format(new Date(), 'dd. MMMM yyyy', { locale: de })}`, 14, 22);

    const tableHeaders = ['Aufgabe', 'Bearbeitungszeit', 'Kategorie', 'Status'];
    const tableBody = sortedTasks.length === 0
      ? [['', '', 'Keine Tasks im Projekt', '']]
      : sortedTasks.map((t) => {
          const sprint = t.sprint_id ? sprintData.find((s) => s.id === t.sprint_id) : null;
          const bearbeitungszeit = sprint
            ? `${format(new Date(sprint.start_datum + 'T12:00:00'), 'dd. MMMM yyyy', { locale: de })} – ${format(new Date(sprint.end_datum + 'T12:00:00'), 'dd. MMMM yyyy', { locale: de })}`
            : t.geschaetzte_stunden != null && t.geschaetzte_stunden > 0
              ? `${t.geschaetzte_stunden}h`
              : t.story_points != null
                ? String(t.story_points)
                : '–';
          const kategorie = sprint ? sprint.name : 'Backlog';
          const status = getStatusLabel(t.status);
          return [t.titel, bearbeitungszeit, kategorie, status];
        });

    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: 28,
      margin: { left: 12, right: 12 },
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 52 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
      },
    });

    const filename = `Projektplan-${project?.name || 'Export'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    try {
      const blob = doc.output('blob');
      const path = await invoke<string | null>('save_file_dialog', {
        default_name: filename,
        filters: [['PDF', ['pdf']]],
      });
      if (path) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = Array.from(new Uint8Array(arrayBuffer));
        await invoke('write_file_bytes', { path, data: uint8 });
        showAlert('PDF gespeichert!', 'success');
      }
    } catch (e) {
      console.error('Export-Fehler:', e);
      const msg = e instanceof Error ? e.message : String(e);
      const isFileLocked = /verwendet wird|os error 32|being used/i.test(msg);
      showAlert(
        isFileLocked
          ? 'Die Datei ist möglicherweise in einem anderen Programm geöffnet. Bitte schließen Sie die Datei oder wählen Sie einen anderen Speicherort.'
          : 'Fehler beim Export: ' + (msg || 'Unbekannter Fehler'),
        'error'
      );
    }
  }

  async function exportJson() {
    setLoading(true);
    try {
      const [projects, tasks, sprints, dailyLogs] = await Promise.all([
        api.projects.getAll(true),
        api.tasks.getAll(),
        api.sprints.getAll(),
        api.dailyLogs.getAll(),
      ]);
      const data = { projects, tasks, sprints, dailyLogs };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const path = await invoke<string | null>('save_file_dialog', {
        default_name: `SprintNest-Backup-${format(new Date(), 'yyyy-MM-dd')}.json`,
        filters: [['JSON', ['json']]],
      });
      if (path) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = Array.from(new Uint8Array(arrayBuffer));
        await invoke('write_file_bytes', { path, data: uint8 });
        showAlert('JSON exportiert!', 'success');
      }
    } catch (e) {
      console.error('Export-Fehler:', e);
      showAlert('Fehler beim Export: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setLoading(true);
    try {
      const [projects, tasks, sprints] = await Promise.all([
        api.projects.getAll(true),
        api.tasks.getAll(),
        api.sprints.getAll(),
      ]);
      const headers = ['Projekt', 'Task', 'Sprint', 'Status', 'Priorität', 'Story Points', 'Beschreibung'];
      const rows = tasks.map((t) => {
        const p = projects.find((x) => x.id === t.projekt_id);
        const s = t.sprint_id ? sprints.find((x) => x.id === t.sprint_id) : null;
        const desc = (t.beschreibung || '').replace(/"/g, '""').replace(/\n/g, ' ');
        return [
          p?.name ?? '',
          `"${(t.titel || '').replace(/"/g, '""')}"`,
          s?.name ?? 'Backlog',
          t.status,
          String(t.prioritaet),
          t.story_points != null ? String(t.story_points) : '',
          `"${desc}"`,
        ].join(';');
      });
      const csv = [headers.join(';'), ...rows].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const path = await invoke<string | null>('save_file_dialog', {
        default_name: `SprintNest-Tasks-${format(new Date(), 'yyyy-MM-dd')}.csv`,
        filters: [['CSV', ['csv']]],
      });
      if (path) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = Array.from(new Uint8Array(arrayBuffer));
        await invoke('write_file_bytes', { path, data: uint8 });
        showAlert('CSV exportiert!', 'success');
      }
    } catch (e) {
      console.error('Export-Fehler:', e);
      showAlert('Fehler beim Export: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">Export</h2>
      {!selectedProjectId && (
        <p className="text-[var(--color-text-muted)] mb-4">Wähle ein Projekt aus der Projektliste (für PDF-Export).</p>
      )}

      <div className="space-y-8 max-w-md">
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">PDF-Export</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--color-text-dim)] mb-2">Export-Typ</label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as 'log' | 'projektplan')}
                className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                aria-label="PDF-Export-Typ auswählen"
              >
                <option value="projektplan">Projektplan</option>
                <option value="log">Arbeitsprotokoll</option>
              </select>
            </div>

            {exportType === 'log' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-1">Von</label>
                  <DateInput
                    value={logVon}
                    onChange={(e) => setLogVon(e.target.value)}
                    className="px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-muted)] mb-1">Bis</label>
                  <DateInput
                    value={logBis}
                    onChange={(e) => setLogBis(e.target.value)}
                    className="px-3 py-2"
                  />
                </div>
              </div>
            )}

            <button
              onClick={exportType === 'log' ? exportLog : exportProjektplan}
              disabled={!selectedProjectId || loading}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              aria-label="Als PDF exportieren"
            >
              {loading ? 'Lade...' : 'Als PDF exportieren'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">Daten-Export</h3>
          <p className="text-sm text-[var(--color-text-dim)] mb-3">Vollständige Daten für Backup oder Auswertung.</p>
          <div className="flex gap-2">
            <button
              onClick={exportJson}
              disabled={loading}
              className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
              aria-label="Als JSON exportieren"
            >
              JSON exportieren
            </button>
            <button
              onClick={exportCsv}
              disabled={loading}
              className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
              aria-label="Als CSV exportieren"
            >
              CSV exportieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
