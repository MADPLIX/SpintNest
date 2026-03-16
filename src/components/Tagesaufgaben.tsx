import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project, Sprint, Task } from '../types';
import { getAufwandLabel, getStatusLabel } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { Modal } from './Modal';

const todayStr = format(new Date(), 'yyyy-MM-dd');

function isOverdue(faelligAm: string | undefined): boolean {
  if (!faelligAm) return false;
  return faelligAm < todayStr;
}

function isDueToday(faelligAm: string | undefined): boolean {
  return faelligAm === todayStr;
}

export function Tagesaufgaben() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setView = useStore((s) => s.setView);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToMarkDone, setTaskToMarkDone] = useState<Task | null>(null);
  const [sprintFilter, setSprintFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  async function loadData() {
    if (!selectedProjectId) {
      setTasks([]);
      setProjects([]);
      setSprints([]);
      setLoading(false);
      return;
    }
    try {
      const [taskData, projData, sprintData] = await Promise.all([
        api.tasks.getAll(selectedProjectId),
        api.projects.getAll(),
        api.sprints.getAll(selectedProjectId),
      ]);
      setProjects(projData);
      setSprints(sprintData);
      setTasks(taskData);
    } catch (e) {
      console.error('Fehler:', e);
    } finally {
      setLoading(false);
    }
  }

  const inProgressTasks = tasks.filter(
    (t) => t.status === 'In Progress' || t.status === 'Review'
  );
  const filteredTasks = sprintFilter
    ? inProgressTasks.filter((t) => t.sprint_id === sprintFilter)
    : inProgressTasks;
  const overdueTasks = filteredTasks.filter((t) => isOverdue(t.faellig_am));
  const dueTodayTasks = filteredTasks.filter((t) => isDueToday(t.faellig_am));

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aOverdue = isOverdue(a.faellig_am);
    const bOverdue = isOverdue(b.faellig_am);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (a.faellig_am && b.faellig_am) {
      const dateCmp = a.faellig_am.localeCompare(b.faellig_am);
      if (dateCmp !== 0) return dateCmp;
      return a.prioritaet - b.prioritaet;
    }
    if (a.faellig_am) return -1;
    if (b.faellig_am) return 1;
    return a.prioritaet - b.prioritaet;
  });

  async function markAsDone(task: Task) {
    const proj = projects.find((p) => p.id === task.projekt_id);
    if (proj?.definition_of_done?.trim()) {
      setTaskToMarkDone(task);
      return;
    }
    await doMarkAsDone(task);
  }

  async function doMarkAsDone(task: Task) {
    try {
      await api.tasks.update({ id: task.id, status: 'Done' });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'Done' as const } : t))
      );
      setTaskToEdit(null);
      setTaskToMarkDone(null);
    } catch (e) {
      console.error('Fehler:', e);
    }
  }

  async function handleTaskUpdate(updates: Partial<Task>) {
    if (!taskToEdit) return;
    try {
      const updated = await api.tasks.update({ id: taskToEdit.id, ...updates });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskToEdit.id ? updated : t))
      );
    } catch (e) {
      console.error('Fehler:', e);
    }
  }

  if (loading) {
    return <div className="text-[var(--color-text-muted)]">Lade...</div>;
  }

  if (!selectedProjectId) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-6">Tagesaufgaben</h2>
        <div className="py-12 px-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] mb-4">Kein Projekt ausgewählt</p>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">
            Wähle ein Projekt aus der Sidebar, um deine Tagesaufgaben zu sehen.
          </p>
          <button
            onClick={() => setView('projects')}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
          >
            Zu den Projekten
          </button>
        </div>
      </div>
    );
  }

  const project = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">Tagesaufgaben</h2>
        <div className="flex items-center gap-3">
          <select
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">Alle Sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-[var(--color-text-muted)] text-sm">
            {project?.name} · {filteredTasks.length} in Bearbeitung
          </span>
        </div>
      </div>

      {dueTodayTasks.length > 0 && overdueTasks.length === 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            📌 {dueTodayTasks.length} Aufgabe{dueTodayTasks.length > 1 ? 'n' : ''} fällig heute
          </p>
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border-2 border-red-500/50 bg-red-500/10">
          <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
            ⚠ {overdueTasks.length} überfällige Aufgabe{overdueTasks.length > 1 ? 'n' : ''}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            Diese Tasks haben das Fälligkeitsdatum überschritten und sollten priorisiert werden.
          </p>
          <ul className="text-sm space-y-1">
            {overdueTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">•</span>
                <span>{t.titel}</span>
                <span className="text-[var(--color-text-dim)]">
                  (fällig: {t.faellig_am ? format(new Date(t.faellig_am + 'T12:00:00'), 'dd.MM.yyyy', { locale: de }) : '–'})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sortedTasks.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)] mb-2">Keine Tasks in Bearbeitung</p>
          <p className="text-sm text-[var(--color-text-dim)] mb-4">
            Alle Aufgaben sind erledigt oder noch im Backlog.
          </p>
          <button
            onClick={() => setView('board')}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
          >
            Zum Scrum Board
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const overdue = isOverdue(task.faellig_am);
            const dueToday = isDueToday(task.faellig_am);
            const sprint = task.sprint_id
              ? sprints.find((s) => s.id === task.sprint_id)
              : null;

            return (
              <div
                key={task.id}
                className={`
                  group flex items-start gap-4 p-4 rounded-xl border transition-all
                  ${overdue
                    ? 'border-red-500/60 bg-red-500/5 hover:bg-red-500/10'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-hover)]'}
                `}
              >
                <button
                  onClick={() => markAsDone(task)}
                  className="mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] flex items-center justify-center transition-colors"
                  title="Als erledigt markieren"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-accent)]"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setTaskToEdit(task)}
                >
                  <div className="font-medium text-[var(--color-text)]">{task.titel}</div>
                  {task.beschreibung && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-2">
                      {task.beschreibung}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {sprint && (
                      <span className="px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]">
                        {sprint.name}
                      </span>
                    )}
                    {task.story_points != null && (
                      <span className="px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
                        {getAufwandLabel(task.story_points)}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]">
                      P{task.prioritaet}
                    </span>
                    {task.faellig_am && (
                      <span
                        className={`px-2 py-0.5 rounded ${
                          overdue
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400 font-medium'
                            : dueToday
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium'
                              : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {overdue ? 'Überfällig ' : dueToday ? 'Heute fällig · ' : 'bis '}
                        {format(new Date(task.faellig_am + 'T12:00:00'), 'dd.MM.yyyy', { locale: de })}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]">
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setTaskToEdit(task)}
                  className="shrink-0 px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] rounded-lg transition-colors"
                >
                  Bearbeiten
                </button>
              </div>
            );
          })}
        </div>
      )}

      {taskToMarkDone && (() => {
        const proj = projects.find((p) => p.id === taskToMarkDone.projekt_id);
        const dod = proj?.definition_of_done?.trim();
        return (
          <Modal title="Definition of Done (Fertigstellungskriterien)" onClose={() => setTaskToMarkDone(null)}>
            <div className="space-y-4">
              {dod && (
                <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
                  {dod.split('\n').filter(Boolean).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-[var(--color-text-muted)]">Alle Kriterien erfüllt?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => doMarkAsDone(taskToMarkDone)}
                  className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
                >
                  Ja, als erledigt markieren
                </button>
                <button
                  onClick={() => setTaskToMarkDone(null)}
                  className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {taskToEdit && (
        <TaskDetailModal
          task={taskToEdit}
          sprints={sprints.map((s) => ({ id: s.id, name: s.name }))}
          onSave={handleTaskUpdate}
          onClose={() => setTaskToEdit(null)}
        />
      )}
    </div>
  );
}
