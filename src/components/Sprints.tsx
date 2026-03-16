import { useEffect, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DateInput } from './DateInput';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project, Sprint, Task } from '../types';
import { SPRINT_FARBEN } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { ConfirmModal } from './ConfirmModal';
import { BurndownChart } from './BurndownChart';
import { Modal } from './Modal';
import { SortableSprintCard } from './SortableSprintCard';

export function Sprints() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const showAlert = useStore((s) => s.showAlert);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [sprintToEdit, setSprintToEdit] = useState<Sprint | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    start_datum: '',
    end_datum: '',
    ziel: '',
    farbe: SPRINT_FARBEN[1].value,
  });
  const [formData, setFormData] = useState({
    name: '',
    start_datum: '',
    end_datum: '',
    ziel: '',
    farbe: SPRINT_FARBEN[1].value,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  async function loadData() {
    try {
      const [projData, sprintData, taskData] = await Promise.all([
        api.projects.getAll(),
        selectedProjectId ? api.sprints.getAll(selectedProjectId) : Promise.resolve([]),
        selectedProjectId ? api.tasks.getAll(selectedProjectId) : Promise.resolve([]),
      ]);
      setProjects(projData);
      setSprints(sprintData);
      setTasks(taskData);
      setExpandedSprints(new Set());
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Laden: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function assignTaskToSprint(taskId: string, sprintId: string | null) {
    const task = tasks.find((t) => t.id === taskId);
    const newStatus = sprintId && task?.status === 'Backlog' ? 'To Do' : undefined;
    try {
      await api.tasks.update({
        id: taskId,
        sprint_id: sprintId ?? '',
        status: newStatus,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, sprint_id: sprintId || undefined, status: newStatus || t.status }
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

  function openSprintEdit(s: Sprint) {
    setSprintToEdit(s);
    setEditForm({
      name: s.name,
      start_datum: s.start_datum,
      end_datum: s.end_datum,
      ziel: s.ziel || '',
      farbe: s.farbe || SPRINT_FARBEN[1].value,
    });
  }

  async function handleSprintEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sprintToEdit) return;
    if (editForm.start_datum && editForm.end_datum && editForm.start_datum >= editForm.end_datum) {
      showAlert('Das Startdatum muss vor dem Enddatum liegen.', 'error');
      return;
    }
    try {
      const updated = await api.sprints.update({
        id: sprintToEdit.id,
        name: editForm.name,
        start_datum: editForm.start_datum,
        end_datum: editForm.end_datum,
        ziel: editForm.ziel || undefined,
        farbe: editForm.farbe,
      });
      setSprints((prev) =>
        prev.map((x) => (x.id === sprintToEdit.id ? updated : x))
      );
      setSprintToEdit(null);
    } catch (err) {
      console.error('Fehler:', err);
      showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  }

  async function handleSprintReorder(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !selectedProjectId) return;
    const oldIndex = sprints.findIndex((s) => s.id === active.id);
    const newIndex = sprints.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...sprints];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);
    const newOrder = reordered.map((s) => s.id);
    try {
      await api.sprints.reorder(selectedProjectId, newOrder);
      setSprints(reordered);
    } catch (err) {
      console.error('Fehler:', err);
      showAlert('Fehler beim Sortieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  }

  async function confirmSprintDelete() {
    if (!sprintToDelete) return;
    try {
      await api.sprints.delete(sprintToDelete.id);
      setSprints((prev) => prev.filter((s) => s.id !== sprintToDelete.id));
      setTasks((prev) => prev.map((t) => (t.sprint_id === sprintToDelete.id ? { ...t, sprint_id: undefined } : t)));
      setSprintToDelete(null);
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Löschen des Sprints: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (formData.start_datum && formData.end_datum && formData.start_datum >= formData.end_datum) {
      showAlert('Das Startdatum muss vor dem Enddatum liegen.', 'error');
      return;
    }
    try {
      await api.sprints.create({
        projekt_id: selectedProjectId,
        name: formData.name,
        start_datum: formData.start_datum,
        end_datum: formData.end_datum,
        ziel: formData.ziel,
        farbe: formData.farbe,
      });
      setFormData({ name: '', start_datum: '', end_datum: '', ziel: '', farbe: SPRINT_FARBEN[1].value });
      setShowForm(false);
      loadData();
    } catch (e) {
      console.error('Fehler:', e);
      showAlert('Fehler beim Erstellen: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  if (loading) return <div className="text-[var(--color-text-muted)]">Lade...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">
          Sprints {selectedProjectId ? `– ${projects.find((p) => p.id === selectedProjectId)?.name}` : ''}
        </h2>
        {selectedProjectId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
          >
            {showForm ? 'Abbrechen' : 'Neuer Sprint'}
          </button>
        )}
      </div>
      {!selectedProjectId && (
        <div className="py-12 px-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] mb-4">Kein Projekt ausgewählt</p>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">
            Wähle ein Projekt aus der Sidebar oder erstelle ein neues.
          </p>
          <button
            onClick={() => useStore.getState().setView('projects')}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
          >
            Zu den Projekten
          </button>
        </div>
      )}
      {selectedProjectId && sprints.length === 0 && !showForm && (
        <div className="py-12 px-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] mb-4">Noch keine Sprints</p>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">
            Erstelle deinen ersten Sprint, um Tasks zu planen.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
          >
            Neuer Sprint
          </button>
        </div>
      )}
      {showForm && selectedProjectId && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Sprint-Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Startdatum</label>
              <DateInput
                value={formData.start_datum}
                onChange={(e) => setFormData({ ...formData, start_datum: e.target.value })}
                className="px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">Enddatum</label>
              <DateInput
                value={formData.end_datum}
                onChange={(e) => setFormData({ ...formData, end_datum: e.target.value })}
                className="px-3 py-2"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Sprint-Ziel"
              value={formData.ziel}
              onChange={(e) => setFormData({ ...formData, ziel: e.target.value })}
              className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] md:col-span-2"
            />
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--color-text-muted)] mb-2">Farbe</label>
              <div className="flex gap-2 flex-wrap">
                {SPRINT_FARBEN.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, farbe: f.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.farbe === f.value
                        ? 'border-white ring-2 ring-[var(--color-accent)] scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: f.value }}
                    title={f.label}
                  />
                ))}
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]">
              Erstellen
            </button>
          </div>
        </form>
      )}
      {sprints.length > 0 && (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={handleSprintReorder}
      >
        <SortableContext items={sprints.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sprints.map((s) => {
              const sprintTasks = tasks.filter((t) => t.sprint_id === s.id);
              const sprintDoneTasks = sprintTasks.filter((t) => t.status === 'Done');
              const sprintOpenTasks = sprintTasks.filter((t) => t.status !== 'Done');
              const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
              const donePoints = sprintDoneTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
              const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
              const backlogTasks = tasks.filter(
                (t) => t.status === 'Backlog' && !t.sprint_id
              );
              const isExpanded = expandedSprints.has(s.id);
              const toggleSprint = () => {
                setExpandedSprints((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                });
              };
              return (
                <SortableSprintCard
                  key={s.id}
                  sprint={s}
                  isExpanded={isExpanded}
                  onToggle={toggleSprint}
                  onEdit={() => openSprintEdit(s)}
                  onDelete={() => setSprintToDelete(s)}
                  onColorChange={async (farbe) => {
                    try {
                      await api.sprints.update({ id: s.id, farbe });
                      setSprints((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, farbe } : x))
                      );
                    } catch (err) {
                      console.error('Fehler:', err);
                      showAlert('Fehler beim Aktualisieren: ' + (err instanceof Error ? err.message : String(err)), 'error');
                    }
                  }}
                  headerStats={
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {s.start_datum} – {s.end_datum} · {sprintOpenTasks.length} Tasks
                      {totalPoints > 0 && (
                        <span className="ml-2 font-medium text-[var(--color-accent)]">
                          {donePoints}/{totalPoints} SP
                        </span>
                      )}
                    </span>
                  }
                  expandedContent={isExpanded && (
              <div className="p-5 border-t border-[var(--color-border)]">
                {totalPoints > 0 && (
                  <>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--color-text-muted)]">Sprint-Fortschritt</span>
                        <span className="text-[var(--color-text)]">{donePoints} / {totalPoints} Story Points ({progressPct}%)</span>
                      </div>
                      <div className="h-2 bg-[var(--color-bg-hover)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-accent)] transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <BurndownChart sprint={s} tasks={tasks} />
                  </>
                )}
                {s.ziel && (
                  <p className="text-sm text-[var(--color-text-muted)] mb-4 pb-4 border-b border-[var(--color-border)]">
                    {s.ziel}
                  </p>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Retrospektive</label>
                  <textarea
                    value={s.retro_notizen ?? ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      try {
                        await api.sprints.update({ id: s.id, retro_notizen: val || undefined });
                        setSprints((prev) => prev.map((x) => (x.id === s.id ? { ...x, retro_notizen: val || undefined } : x)));
                      } catch (err) {
                        console.error('Fehler:', err);
                        showAlert('Fehler beim Speichern: ' + (err instanceof Error ? err.message : String(err)), 'error');
                      }
                    }}
                    placeholder="Was lief gut? Was können wir verbessern?"
                    className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-dim)] resize-none"
                    rows={3}
                  />
                </div>
                <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                  Sprint-Backlog ({sprintOpenTasks.length} Tasks)
                </h4>
                {sprintOpenTasks.length > 0 ? (
                  <ul className="space-y-2 mb-4">
                    {sprintOpenTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-border-light)] transition-colors"
                        onClick={() => setTaskToEdit(t)}
                      >
                        <span className="text-[var(--color-text)]">
                          {t.titel}
                          {(t.geschaetzte_stunden != null && t.geschaetzte_stunden > 0) || t.faellig_am ? (
                            <span className="ml-2 text-xs text-[var(--color-text-dim)]">
                              {t.geschaetzte_stunden != null && t.geschaetzte_stunden > 0 && `~${t.geschaetzte_stunden}h`}
                              {t.geschaetzte_stunden != null && t.geschaetzte_stunden > 0 && t.faellig_am && ' · '}
                              {t.faellig_am && `bis ${t.faellig_am}`}
                            </span>
                          ) : null}
                        </span>
                        <select
                          value={t.sprint_id || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            assignTaskToSprint(t.id, e.target.value || null)
                          }
                          className="text-xs px-2 py-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)]"
                        >
                          <option value={s.id}>{s.name}</option>
                          <option value="">Aus Sprint entfernen</option>
                          {sprints
                            .filter((x) => x.id !== s.id)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--color-text-dim)] mb-4">
                    Keine Tasks in diesem Sprint.
                  </p>
                )}
                {backlogTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                      Task zuordnen
                    </h4>
                    <select
                      className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                      onChange={(e) => {
                        const taskId = e.target.value;
                        if (taskId) {
                          assignTaskToSprint(taskId, s.id);
                          e.target.value = '';
                        }
                      }}
                      value=""
                    >
                      <option value="">– Backlog-Task auswählen –</option>
                      {backlogTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.titel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              )}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      )}

      {taskToEdit && (
        <TaskDetailModal
          task={taskToEdit}
          sprints={sprints.map((s) => ({ id: s.id, name: s.name }))}
          tasks={tasks}
          onSave={handleTaskUpdate}
          onDelete={handleTaskDelete}
          onDuplicate={handleTaskDuplicate}
          onClose={() => setTaskToEdit(null)}
        />
      )}

      {sprintToEdit && (
        <Modal title="Sprint bearbeiten" onClose={() => setSprintToEdit(null)}>
          <form onSubmit={handleSprintEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Sprint-Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                required
              />
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Startdatum</label>
                <DateInput
                  value={editForm.start_datum}
                  onChange={(e) => setEditForm({ ...editForm, start_datum: e.target.value })}
                  className="px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Enddatum</label>
                <DateInput
                  value={editForm.end_datum}
                  onChange={(e) => setEditForm({ ...editForm, end_datum: e.target.value })}
                  className="px-3 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Sprint-Ziel</label>
              <input
                type="text"
                value={editForm.ziel}
                onChange={(e) => setEditForm({ ...editForm, ziel: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Farbe</label>
              <div className="flex gap-2 flex-wrap">
                {SPRINT_FARBEN.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, farbe: f.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editForm.farbe === f.value
                        ? 'border-white ring-2 ring-[var(--color-accent)] scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: f.value }}
                    title={f.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setSprintToEdit(null)}
                className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]"
              >
                Speichern
              </button>
            </div>
          </form>
        </Modal>
      )}

      {sprintToDelete && (
        <ConfirmModal
          title="Sprint löschen"
          message={`Möchtest du den Sprint „${sprintToDelete.name}" wirklich löschen? Die Tasks werden ins Backlog verschoben.`}
          confirmLabel="Löschen"
          danger
          onConfirm={confirmSprintDelete}
          onCancel={() => setSprintToDelete(null)}
        />
      )}
    </div>
  );
}
