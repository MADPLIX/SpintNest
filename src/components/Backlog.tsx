import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project, Task } from '../types';
import { getAufwandLabel } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

export function Backlog() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setView = useStore((s) => s.setView);
  const setShowTaskModal = useStore((s) => s.setShowTaskModal);
  const showAlert = useStore((s) => s.showAlert);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  async function loadData() {
    try {
      const [projData, taskData, sprintData] = await Promise.all([
        api.projects.getAll(),
        api.tasks.getAll(selectedProjectId || undefined),
        api.sprints.getAll(selectedProjectId || undefined),
      ]);
      setProjects(projData);
      setAllTasks(taskData);
      const backlog = taskData
        .filter((t) => t.status === 'Backlog')
        .sort((a, b) => a.prioritaet - b.prioritaet);
      setTasks(backlog);
      setSprints(sprintData.map((s) => ({ id: s.id, name: s.name })));
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Laden: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function assignSprint(taskId: string, sprintId: string | null) {
    try {
      await api.tasks.update({
        id: taskId,
        sprint_id: sprintId ?? '',
        status: sprintId ? 'To Do' : undefined,
      });
      setTasks((prev) =>
        prev
          .map((t) =>
            t.id === taskId
              ? { ...t, sprint_id: sprintId || undefined, status: sprintId ? ('To Do' as const) : t.status }
              : t
          )
          .filter((t) => t.status === 'Backlog')
      );
      setAllTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, sprint_id: sprintId || undefined, status: sprintId ? ('To Do' as const) : t.status }
            : t
        )
      );
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Zuweisen: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleTaskUpdate(updates: Partial<Task>) {
    if (!taskToEdit) return;
    try {
      const updated = await api.tasks.update({
        id: taskToEdit.id,
        ...updates,
      });
      setAllTasks((prev) => prev.map((t) => (t.id === taskToEdit.id ? updated : t)));
      setTasks((prev) =>
        prev.map((t) => (t.id === taskToEdit.id ? updated : t)).filter((t) => t.status === 'Backlog')
      );
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Aktualisieren: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleTaskDelete() {
    if (!taskToEdit) return;
    try {
      await api.tasks.delete(taskToEdit.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToEdit.id));
      setAllTasks((prev) => prev.filter((t) => t.id !== taskToEdit.id));
      setTaskToEdit(null);
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Löschen: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleTaskDuplicate() {
    if (!taskToEdit || !selectedProjectId) return;
    try {
      const newTask = await api.tasks.create({
        projekt_id: selectedProjectId,
        titel: taskToEdit.titel + ' (Kopie)',
        beschreibung: taskToEdit.beschreibung,
        prioritaet: taskToEdit.prioritaet,
        story_points: taskToEdit.story_points,
        geschaetzte_stunden: taskToEdit.geschaetzte_stunden,
        faellig_am: taskToEdit.faellig_am,
        akzeptanzkriterien: taskToEdit.akzeptanzkriterien,
        status: 'Backlog',
        sprint_id: undefined,
      });
      setAllTasks((prev) => [...prev, newTask]);
      setTasks((prev) => [...prev, newTask]);
      setTaskToEdit(null);
      showAlert('Task dupliziert.', 'success');
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Duplizieren: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  if (loading) return <div className="text-[var(--color-text-muted)]">Lade...</div>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          Produkt-Backlog {selectedProjectId ? `– ${projects.find((p) => p.id === selectedProjectId)?.name}` : ''}
        </h2>
        {selectedProjectId && (
          <button
            onClick={() => {
              setView('board');
              setShowTaskModal(true);
            }}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Task hinzufügen
          </button>
        )}
      </div>
      {!selectedProjectId && (
        <p className="text-[var(--color-text-muted)] mb-4">Wähle ein Projekt aus der Projektliste.</p>
      )}
      {selectedProjectId && tasks.length === 0 && (
        <p className="text-[var(--color-text-muted)] py-8 text-center">
          Keine Backlog-Tasks. Klicke auf „Task hinzufügen“, um einen neuen Task zu erstellen.
        </p>
      )}
      <div className="space-y-3">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] flex justify-between items-start gap-4 cursor-pointer hover:border-[var(--color-border-light)] transition-colors"
            onClick={() => setTaskToEdit(t)}
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-[var(--color-text)]">{t.titel}</h3>
              {t.beschreibung && (
                <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-2">
                  {t.beschreibung}
                </p>
              )}
              <div className="flex gap-3 mt-2 text-xs text-[var(--color-text-dim)]">
                {t.story_points != null && <span>Aufwand: {getAufwandLabel(t.story_points)}</span>}
                <span>Priorität: {t.prioritaet}</span>
                {t.geschaetzte_stunden != null && t.geschaetzte_stunden > 0 && (
                  <span>~{t.geschaetzte_stunden}h</span>
                )}
                {t.faellig_am && <span>bis {t.faellig_am}</span>}
              </div>
            </div>
            {sprints.length > 0 && (
              <select
                value={t.sprint_id || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  assignSprint(t.id, e.target.value || null);
                }}
                className="shrink-0 px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="">Kein Sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {taskToEdit && (
        <TaskDetailModal
          task={taskToEdit}
          sprints={sprints}
          tasks={allTasks}
          onSave={handleTaskUpdate}
          onDelete={handleTaskDelete}
          onDuplicate={handleTaskDuplicate}
          onClose={() => setTaskToEdit(null)}
        />
      )}
    </div>
  );
}
