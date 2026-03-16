import { useState } from 'react';
import { Modal } from './Modal';
import { DateInput } from './DateInput';
import { AUFWAND_OPTIONS } from '../types';
import { getTaskTemplates } from '../lib/taskTemplates';

export type TaskFormData = {
  titel: string;
  beschreibung: string;
  prioritaet: number;
  story_points?: number;
  geschaetzte_stunden?: number;
  faellig_am?: string;
  akzeptanzkriterien?: string;
  sprint_id?: string;
};

type TaskModalProps = {
  initialData?: Partial<TaskFormData>;
  sprints?: { id: string; name: string }[];
  defaultSprintId?: string | null;
  onConfirm: (data: TaskFormData) => void;
  onCancel: () => void;
};

export function TaskModal({
  initialData = {},
  sprints = [],
  defaultSprintId = null,
  onConfirm,
  onCancel,
}: TaskModalProps) {
  const [titel, setTitel] = useState(initialData.titel ?? '');
  const [beschreibung, setBeschreibung] = useState(initialData.beschreibung ?? '');
  const [prioritaet, setPrioritaet] = useState(initialData.prioritaet ?? 1);
  const [aufwand, setAufwand] = useState(
    initialData.story_points?.toString() ?? ''
  );
  const [geschaetzteStunden, setGeschaetzteStunden] = useState(
    initialData.geschaetzte_stunden?.toString() ?? ''
  );
  const [faelligAm, setFaelligAm] = useState(initialData.faellig_am ?? '');
  const [akzeptanzkriterien, setAkzeptanzkriterien] = useState(
    initialData.akzeptanzkriterien ?? ''
  );
  const [sprintId, setSprintId] = useState(
    initialData.sprint_id ?? defaultSprintId ?? ''
  );
  const [templates] = useState(() => getTaskTemplates());

  function applyTemplate(t: import('../types').TaskTemplate) {
    setTitel(t.titel);
    setBeschreibung(t.beschreibung);
    setPrioritaet(t.prioritaet);
    setAufwand(t.story_points?.toString() ?? '');
    setAkzeptanzkriterien(t.akzeptanzkriterien ?? '');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = titel.trim();
    if (!t) return;
    onConfirm({
      titel: t,
      beschreibung: beschreibung.trim(),
      prioritaet,
      story_points: aufwand ? parseInt(aufwand, 10) : undefined,
      geschaetzte_stunden: geschaetzteStunden
        ? parseFloat(geschaetzteStunden)
        : undefined,
      faellig_am: faelligAm || undefined,
      akzeptanzkriterien: akzeptanzkriterien.trim() || undefined,
      sprint_id: sprintId || undefined,
    });
  }

  return (
    <Modal title="Task hinzufügen" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-visible py-2 px-1 pr-4">
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Aus Vorlage
            </label>
            <select
              onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  const t = templates.find((x) => x.id === id);
                  if (t) applyTemplate(t);
                }
                e.target.value = '';
              }}
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">– Vorlage wählen –</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titel}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Task-Titel *
          </label>
          <input
            type="text"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z.B. Login-Seite implementieren"
            className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            Beschreibung
          </label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Details zum Task..."
            className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
                  {p} {p === 1 ? '(niedrig)' : p === 5 ? '(hoch)' : ''}
                </option>
              ))}
            </select>
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              placeholder="z.B. 4"
              className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              Fällig am
            </label>
            <DateInput value={faelligAm} onChange={(e) => setFaelligAm(e.target.value)} />
          </div>
        </div>

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
            placeholder="Wann ist der Task erledigt? (eine pro Zeile)"
            className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!titel.trim()}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Erstellen
          </button>
        </div>
      </form>
    </Modal>
  );
}
