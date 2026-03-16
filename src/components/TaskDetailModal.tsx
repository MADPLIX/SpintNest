import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { DateInput } from './DateInput';
import { saveTaskTemplate } from '../lib/taskTemplates';
import type { Task, TaskStatus } from '../types';
import { TASK_STATUSES, AUFWAND_OPTIONS, getStatusLabel } from '../types';

type TaskDetailModalProps = {
  task: Task;
  sprints: { id: string; name: string }[];
  tasks?: Task[];
  onSave: (updates: Partial<Task>) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
};

export function TaskDetailModal({
  task,
  sprints,
  tasks = [],
  onSave,
  onDelete,
  onDuplicate,
  onClose,
}: TaskDetailModalProps) {
  const [titel, setTitel] = useState(task.titel);
  const [beschreibung, setBeschreibung] = useState(task.beschreibung);
  const [prioritaet, setPrioritaet] = useState(task.prioritaet);
  const [aufwand, setAufwand] = useState(
    task.story_points?.toString() ?? ''
  );
  const [geschaetzteStunden, setGeschaetzteStunden] = useState(
    task.geschaetzte_stunden?.toString() ?? ''
  );
  const [faelligAm, setFaelligAm] = useState(task.faellig_am ?? '');
  const [akzeptanzkriterien, setAkzeptanzkriterien] = useState(
    task.akzeptanzkriterien ?? ''
  );
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [sprintId, setSprintId] = useState(task.sprint_id ?? '');
  const [blockiertDurch, setBlockiertDurch] = useState<string[]>(task.blockiert_durch ?? []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setTitel(task.titel);
    setBeschreibung(task.beschreibung);
    setPrioritaet(task.prioritaet);
    setAufwand(task.story_points?.toString() ?? '');
    setGeschaetzteStunden(task.geschaetzte_stunden?.toString() ?? '');
    setFaelligAm(task.faellig_am ?? '');
    setAkzeptanzkriterien(task.akzeptanzkriterien ?? '');
    setStatus(task.status);
    setSprintId(task.sprint_id ?? '');
    setBlockiertDurch(task.blockiert_durch ?? []);
  }, [task]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalSprintId = sprintId || undefined;
    let finalStatus: TaskStatus = status;
    if (!finalSprintId && status === 'To Do') finalStatus = 'Backlog';
    else if (finalSprintId && status === 'Backlog') finalStatus = 'To Do';
    onSave({
      titel: titel.trim(),
      beschreibung: beschreibung.trim(),
      prioritaet,
      story_points: aufwand ? parseInt(aufwand, 10) : undefined,
      geschaetzte_stunden: geschaetzteStunden
        ? parseFloat(geschaetzteStunden)
        : undefined,
      faellig_am: faelligAm || undefined,
      akzeptanzkriterien: akzeptanzkriterien.trim() || undefined,
      status: finalStatus,
      sprint_id: finalSprintId,
      blockiert_durch: blockiertDurch.length > 0 ? blockiertDurch : undefined,
    });
    onClose();
  }

  return (
    <Modal title="Task bearbeiten" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-visible py-2 px-1 pr-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Task-Titel *
          </label>
          <input
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Beschreibung
          </label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Priorität
            </label>
            <select
              value={prioritaet}
              onChange={(e) => setPrioritaet(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {[1, 2, 3, 4, 5].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Aufwand
            </label>
            <select
              value={aufwand}
              onChange={(e) => setAufwand(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">– Keine Angabe –</option>
              {AUFWAND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Geschätzte Stunden
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={geschaetzteStunden}
              onChange={(e) => setGeschaetzteStunden(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Fällig am
          </label>
          <DateInput value={faelligAm} onChange={(e) => setFaelligAm(e.target.value)} />
        </div>

        {tasks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Blockiert durch
            </label>
            <p className="text-xs text-[var(--color-text-dim)] mb-2">
              Tasks, die erledigt sein müssen, bevor dieser Task abgeschlossen werden kann.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {blockiertDurch.map((tId) => {
                const t = tasks.find((x) => x.id === tId);
                return (
                  <span
                    key={tId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-muted)] text-[var(--color-accent)] rounded-lg text-sm"
                  >
                    {t?.titel || tId}
                    <button
                      type="button"
                      onClick={() => setBlockiertDurch((prev) => prev.filter((id) => id !== tId))}
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
                if (id && !blockiertDurch.includes(id) && id !== task.id) {
                  setBlockiertDurch((prev) => [...prev, id]);
                }
                e.target.value = '';
              }}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">– Task hinzufügen –</option>
              {tasks.filter((t) => t.id !== task.id).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titel}
                </option>
              ))}
            </select>
          </div>
        )}

        {sprints.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Sprint
            </label>
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Kein Sprint</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Akzeptanzkriterien
          </label>
          <textarea
            value={akzeptanzkriterien}
            onChange={(e) => setAkzeptanzkriterien(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            rows={3}
          />
        </div>

        {task.erstellt_am && (
          <p className="text-xs text-[var(--color-text-dim)]">
            Erstellt am {task.erstellt_am}
          </p>
        )}

        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            {onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onDuplicate();
                  onClose();
                }}
                className="px-4 py-2 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors text-sm"
              >
                Duplizieren
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                saveTaskTemplate({
                  titel: titel.trim(),
                  beschreibung: beschreibung.trim(),
                  prioritaet,
                  story_points: aufwand ? parseInt(aufwand, 10) : undefined,
                  akzeptanzkriterien: akzeptanzkriterien.trim() || undefined,
                });
                useStore.getState().showAlert('Als Vorlage gespeichert!', 'success');
              }}
              className="px-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors text-sm"
            >
              Als Vorlage speichern
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-[var(--color-danger)] hover:text-[var(--color-danger-hover)] transition-colors"
              >
                Löschen
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!titel.trim()}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Speichern
            </button>
          </div>
        </div>
      </form>

      {showDeleteConfirm && onDelete && (
        <ConfirmModal
          title="Task löschen"
          message={`Möchtest du den Task „${task.titel}" wirklich löschen?`}
          confirmLabel="Löschen"
          danger
          onConfirm={() => {
            onDelete();
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </Modal>
  );
}
