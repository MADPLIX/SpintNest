import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project, Task, Sprint } from '../types';
import { SPRINT_FARBEN } from '../types';
import { TaskCard } from './TaskCard';
import { SprintBoardColumn } from './SprintBoardColumn';
import { TaskModal } from './TaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { Modal } from './Modal';

const BACKLOG_COLOR = '#94a3b8';
const IN_PROGRESS_COLOR = '#14b8a6';
const REVIEW_COLOR = '#8b5cf6';
const DONE_COLOR = '#22c55e';

/** Frühestes Fälligkeitsdatum oben; Tasks ohne Datum zuletzt (alphabetisch nach Titel). */
function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.faellig_am?.trim();
    const db = b.faellig_am?.trim();
    if (da && db) return da.localeCompare(db);
    if (da && !db) return -1;
    if (!da && db) return 1;
    return a.titel.localeCompare(b.titel, undefined, { sensitivity: 'base' });
  });
}

export function Board() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const showTaskModal = useStore((s) => s.showTaskModal);
  const setShowTaskModal = useStore((s) => s.setShowTaskModal);
  const showAlert = useStore((s) => s.showAlert);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [pendingDoneTask, setPendingDoneTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [projData, taskData, sprintData] = await Promise.all([
          api.projects.getAll(),
          api.tasks.getAll(selectedProjectId || undefined),
          api.sprints.getAll(selectedProjectId || undefined),
        ]);
        if (cancelled) return;
        setTasks(taskData);
        setSprints(sprintData);
        if (selectedProjectId) {
          const p = projData.find((x) => x.id === selectedProjectId);
          setProject(p || null);
        } else {
          setProject(null);
        }
      } catch (e) {
        console.error('Fehler:', e);
        showAlert('Fehler beim Laden: ' + (e instanceof Error ? e.message : String(e)), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  function handleDragStart(e: DragStartEvent) {
    const task = tasks.find((t) => t.id === e.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const taskId = e.active.id as string;
    const dropId = e.over?.id as string | undefined;
    if (!dropId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (dropId === 'backlog') {
      if (task.status === 'Backlog' && !task.sprint_id) return;
      try {
        await api.tasks.update({
          id: taskId,
          status: 'Backlog',
          sprint_id: '',
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: 'Backlog' as const, sprint_id: undefined } : t
          )
        );
      } catch (err) {
        console.error('Fehler:', err);
        showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
      return;
    }

    if (dropId === 'in-progress') {
      if (task.status === 'In Progress') return;
      try {
        await api.tasks.update({
          id: taskId,
          status: 'In Progress',
          sprint_id: task.sprint_id || undefined,
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: 'In Progress' as const } : t
          )
        );
      } catch (err) {
        console.error('Fehler:', err);
        showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
      return;
    }

    if (dropId === 'review') {
      if (task.status === 'Review') return;
      try {
        await api.tasks.update({
          id: taskId,
          status: 'Review',
          sprint_id: task.sprint_id || undefined,
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: 'Review' as const } : t
          )
        );
      } catch (err) {
        console.error('Fehler:', err);
        showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
      return;
    }

    if (dropId === 'done') {
      if (task.status === 'Done') return;
      if (project?.definition_of_done?.trim()) {
        setPendingDoneTask(task);
        return;
      }
      try {
        await api.tasks.update({ id: taskId, status: 'Done' });
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'Done' as const } : t))
        );
      } catch (err) {
        console.error('Fehler:', err);
        showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
      }
      return;
    }

    const sprint = sprints.find((s) => s.id === dropId);
    if (sprint) {
      const newStatus: Task['status'] = 'To Do';
      if (task.sprint_id !== sprint.id || task.status !== newStatus) {
        try {
          await api.tasks.update({
            id: taskId,
            sprint_id: sprint.id,
            status: newStatus,
          });
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, sprint_id: sprint.id, status: newStatus as Task['status'] }
                : t
            )
          );
        } catch (err) {
          console.error('Fehler:', err);
          showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
        }
      }
    }
  }

  async function handleConfirmTask(data: {
    titel: string;
    beschreibung: string;
    prioritaet: number;
    story_points?: number;
    geschaetzte_stunden?: number;
    faellig_am?: string;
    akzeptanzkriterien?: string;
    sprint_id?: string;
  }) {
    if (!selectedProjectId) return;
    setShowTaskModal(false);
    try {
      const task = await api.tasks.create({
        projekt_id: selectedProjectId,
        titel: data.titel,
        beschreibung: data.beschreibung,
        prioritaet: data.prioritaet,
        story_points: data.story_points,
        status: 'Backlog',
        sprint_id: data.sprint_id,
        faellig_am: data.faellig_am,
        geschaetzte_stunden: data.geschaetzte_stunden,
        akzeptanzkriterien: data.akzeptanzkriterien,
      });
      setTasks((prev) => [...prev, task]);
    } catch (e) {
      console.error('Fehler:', e);
    }
  }

  const backlogTasks = sortTasksByDueDate(
    tasks.filter((t) => !t.sprint_id && (t.status === 'Backlog' || t.status === 'To Do'))
  );
  const inProgressTasks = sortTasksByDueDate(tasks.filter((t) => t.status === 'In Progress'));
  const reviewTasks = sortTasksByDueDate(tasks.filter((t) => t.status === 'Review'));
  /** Erledigt: nicht nach Fälligkeit sortieren – Reihenfolge wie geladen (chronologisch/natürlich). */
  const doneTasks = tasks.filter((t) => t.status === 'Done');
  const sprintTasksMap = new Map<string, Task[]>();
  for (const s of sprints) {
    sprintTasksMap.set(
      s.id,
      sortTasksByDueDate(
        tasks.filter((t) => t.sprint_id === s.id && (t.status === 'To Do' || t.status === 'Backlog'))
      )
    );
  }

  async function handleTaskUpdate(updates: Partial<Task>) {
    if (!taskToEdit) return;
    try {
      const updated = await api.tasks.update({
        id: taskToEdit.id,
        ...updates,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskToEdit.id ? updated : t))
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
      setTasks((prev) => [...prev, newTask]);
      setTaskToEdit(null);
      showAlert('Task dupliziert.', 'success');
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Duplizieren: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  if (loading) return <div className="text-[var(--color-text-muted)]">Lade...</div>;

  if (!selectedProjectId) {
    return (
      <div className="text-[var(--color-text-muted)]">
        <p>Bitte wähle ein Projekt aus der Projektliste.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          Scrum Board {project ? `– ${project.name}` : ''}
        </h2>
        <button
          onClick={() => setShowTaskModal(true)}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          + Task hinzufügen
        </button>
      </div>

      {showTaskModal && (
        <TaskModal
          sprints={sprints.map((s) => ({ id: s.id, name: s.name }))}
          onConfirm={handleConfirmTask}
          onCancel={() => setShowTaskModal(false)}
        />
      )}

      {pendingDoneTask && project?.definition_of_done?.trim() && (
        <Modal title="Definition of Done (Fertigstellungskriterien)" onClose={() => setPendingDoneTask(null)}>
          <div className="space-y-4">
            <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
              {project.definition_of_done!.split('\n').filter(Boolean).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <p className="text-sm text-[var(--color-text-muted)]">Alle Kriterien erfüllt?</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!pendingDoneTask) return;
                  try {
                    await api.tasks.update({ id: pendingDoneTask.id, status: 'Done' });
                    setTasks((prev) =>
                      prev.map((t) => (t.id === pendingDoneTask.id ? { ...t, status: 'Done' as const } : t))
                    );
                  } catch (err) {
                    console.error('Fehler:', err);
                    showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
                  }
                  setPendingDoneTask(null);
                }}
                className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
              >
                Ja, als erledigt markieren
              </button>
              <button
                onClick={() => setPendingDoneTask(null)}
                className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </Modal>
      )}

      {taskToEdit && (
        <TaskDetailModal
          task={taskToEdit}
          sprints={sprints.map((s) => ({ id: s.id, name: s.name }))}
          onSave={handleTaskUpdate}
          onDelete={handleTaskDelete}
          onDuplicate={handleTaskDuplicate}
          onClose={() => setTaskToEdit(null)}
        />
      )}

      {tasks.length === 0 && (
        <div className="py-16 px-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] mb-4">Noch keine Tasks in diesem Projekt.</p>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">
            Erstelle deinen ersten Task und ziehe ihn per Drag & Drop in die gewünschte Spalte.
          </p>
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Task hinzufügen
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SprintBoardColumn
            id="backlog"
            title="Produkt-Backlog"
            color={BACKLOG_COLOR}
            tasks={backlogTasks}
            onOpenTaskDetail={setTaskToEdit}
          />
          {sprints.map((s) => (
            <SprintBoardColumn
              key={s.id}
              id={s.id}
              title={s.name}
              color={s.farbe || SPRINT_FARBEN[1].value}
              tasks={sprintTasksMap.get(s.id) || []}
              onOpenTaskDetail={setTaskToEdit}
            />
          ))}
          <SprintBoardColumn
            id="in-progress"
            title="In Bearbeitung"
            color={IN_PROGRESS_COLOR}
            tasks={inProgressTasks}
            onOpenTaskDetail={setTaskToEdit}
          />
          <SprintBoardColumn
            id="review"
            title="Überprüfung"
            color={REVIEW_COLOR}
            tasks={reviewTasks}
            onOpenTaskDetail={setTaskToEdit}
          />
          <SprintBoardColumn
            id="done"
            title="Erledigt"
            color={DONE_COLOR}
            tasks={doneTasks}
            onOpenTaskDetail={setTaskToEdit}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 rotate-2 shadow-xl">
              <TaskCard
                task={activeTask}
                accentColor={
                  activeTask.status === 'Done'
                    ? DONE_COLOR
                    : activeTask.status === 'In Progress'
                      ? IN_PROGRESS_COLOR
                      : activeTask.status === 'Review'
                        ? REVIEW_COLOR
                        : activeTask.sprint_id
                          ? sprints.find((s) => s.id === activeTask.sprint_id)?.farbe || SPRINT_FARBEN[1].value
                          : BACKLOG_COLOR
                }
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
