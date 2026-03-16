import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Sprint } from '../types';
import { SPRINT_FARBEN } from '../types';

type SortableSprintCardProps = {
  sprint: Sprint;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onColorChange: (farbe: string) => void;
  headerStats: React.ReactNode;
  expandedContent: React.ReactNode;
};

export function SortableSprintCard({
  sprint,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onColorChange,
  headerStats,
  expandedContent,
}: SortableSprintCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sprint.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `4px solid ${sprint.farbe || SPRINT_FARBEN[1].value}`,
      }}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-2 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-[var(--color-bg-hover)] shrink-0 touch-none"
          title="Reihenfolge ändern"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--color-text-muted)]"
          >
            <circle cx="9" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="15" cy="5" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="15" cy="19" r="1.5" />
          </svg>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: sprint.farbe || SPRINT_FARBEN[1].value }}
        />
        <h3 className="font-semibold text-[var(--color-text)] flex-1">
          {sprint.name}
        </h3>
        {headerStats}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-xs px-2 py-1 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded shrink-0"
          title="Sprint bearbeiten"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-xs px-2 py-1 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded shrink-0"
          title="Sprint löschen"
        >
          Löschen
        </button>
        <select
          value={sprint.farbe || ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            const farbe = e.target.value;
            if (farbe) onColorChange(farbe);
          }}
          className="text-xs px-2 py-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] shrink-0"
        >
          {SPRINT_FARBEN.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </button>
      {expandedContent}
    </div>
  );
}
