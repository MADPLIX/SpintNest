import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { getAufwandLabel } from '../types';

type TaskCardProps = {
  task: Task;
  compact?: boolean;
  onOpenDetail?: (task: Task) => void;
  accentColor?: string;
};

export function TaskCard({ task, compact, onOpenDetail, accentColor }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatDate = (d: string) => {
    try {
      const [, m, day] = d.split('-');
      return `${day}.${m}.`;
    } catch {
      return d;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(accentColor ? { borderLeft: `4px solid ${accentColor}` } : {}),
      }}
      {...attributes}
      {...listeners}
      className={`
        group relative p-3 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] cursor-grab active:cursor-grabbing
        hover:border-[var(--color-border-light)] hover:shadow-[var(--shadow-card)] transition-all
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${compact ? 'text-sm' : ''}
      `}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onOpenDetail) onOpenDetail(task);
      }}
    >
      {onOpenDetail && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOpenDetail(task);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:opacity-100 bg-[var(--color-bg-hover)] hover:bg-[var(--color-accent-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-opacity"
          aria-label="Bearbeiten"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      <div className="font-medium text-[var(--color-text)] pr-8">{task.titel}</div>
      {!compact && task.beschreibung && (
        <p className="text-sm text-[var(--color-text-muted)] mt-1 line-clamp-2">{task.beschreibung}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2 text-xs">
        {task.story_points != null && (
          <span className="px-2 py-0.5 bg-[var(--color-accent-muted)] rounded text-[var(--color-accent)]">{getAufwandLabel(task.story_points)}</span>
        )}
        <span className="px-2 py-0.5 bg-[var(--color-bg-hover)] rounded text-[var(--color-text-muted)]">P{task.prioritaet}</span>
        {task.geschaetzte_stunden != null && task.geschaetzte_stunden > 0 && (
          <span className="px-2 py-0.5 bg-[var(--color-bg-hover)] rounded text-[var(--color-text-muted)]">~{task.geschaetzte_stunden}h</span>
        )}
        {task.faellig_am && (
          <span className="px-2 py-0.5 bg-[var(--color-bg-hover)] rounded text-[var(--color-text-muted)]">bis {formatDate(task.faellig_am)}</span>
        )}
      </div>
    </div>
  );
}
