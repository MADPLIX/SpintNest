export interface Project {
  id: string;
  name: string;
  beschreibung: string;
  erstellt_am: string;
  sprint_laenge: number;
  /** Projektzeitraum: Startdatum */
  projekt_start?: string;
  /** Projektzeitraum: Enddatum */
  projekt_ende?: string;
  definition_of_done?: string;
  /** Anpassbare Board-Spalten (optional, Standard: Backlog, To Do, In Progress, Review, Done) */
  board_spalten?: string[];
  /** Archivierte Projekte werden standardmäßig ausgeblendet */
  archiviert?: boolean;
}

export interface Task {
  id: string;
  projekt_id: string;
  titel: string;
  beschreibung: string;
  prioritaet: number;
  story_points?: number;
  status: TaskStatus;
  sprint_id?: string;
  faellig_am?: string;
  geschaetzte_stunden?: number;
  erstellt_am?: string;
  akzeptanzkriterien?: string;
  /** Task-IDs, durch die dieser Task blockiert wird */
  blockiert_durch?: string[];
}

export type TaskStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';

export const TASK_STATUSES: TaskStatus[] = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

/** Deutsche Anzeige-Labels für Task-Status */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  Backlog: 'Backlog',
  'To Do': 'Zu erledigen',
  'In Progress': 'In Bearbeitung',
  Review: 'Überprüfung',
  Done: 'Erledigt',
};

export function getStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Aufwand = wie viel Arbeit steckt im Task? (1 = wenig, 5 = viel) */
export const AUFWAND_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Sehr klein' },
  { value: 2, label: 'Klein' },
  { value: 3, label: 'Mittel' },
  { value: 5, label: 'Groß' },
  { value: 8, label: 'Sehr groß' },
];

export function getAufwandLabel(points: number): string {
  return AUFWAND_OPTIONS.find((o) => o.value === points)?.label ?? String(points);
}

export interface Sprint {
  id: string;
  projekt_id: string;
  name: string;
  start_datum: string;
  end_datum: string;
  ziel: string;
  farbe?: string;
  /** Retrospektiv-Notizen */
  retro_notizen?: string;
}

/** Vordefinierte Farben für Sprints (Notion-Style) */
export const SPRINT_FARBEN = [
  { value: '#94a3b8', label: 'Grau' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Rot' },
  { value: '#3b82f6', label: 'Blau' },
  { value: '#22c55e', label: 'Grün' },
  { value: '#8b5cf6', label: 'Violett' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
];

export interface TaskTemplate {
  id: string;
  titel: string;
  beschreibung: string;
  prioritaet: number;
  story_points?: number;
  akzeptanzkriterien?: string;
}

export interface DailyLog {
  id: string;
  projekt_id: string;
  datum: string;
  eintrag: string;
  screenshot_pfade: string[];
  verknuepfte_tasks: string[];
}
