import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task } from '../types';
import { TaskCard } from './TaskCard';

type SprintBoardColumnProps = {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  onOpenTaskDetail?: (task: Task) => void;
};

export function SprintBoardColumn({
  id,
  title,
  color,
  tasks,
  onOpenTaskDetail,
}: SprintBoardColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-w-[280px] w-[280px] shrink-0 rounded-xl border-2 p-5 transition-all
        ${isOver ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]' : ''}
      `}
      style={{
        borderColor: color,
        backgroundColor: 'var(--color-bg-card)',
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 mb-3 w-full text-left hover:opacity-80 transition-opacity"
      >
        <span
          className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}
          style={{ fontSize: '0.6rem' }}
        >
          ▶
        </span>
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3
          className="font-semibold truncate flex-1"
          style={{ color }}
        >
          {title}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {tasks.length}
        </span>
      </button>
      {!collapsed && (
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpenDetail={onOpenTaskDetail}
                accentColor={color}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
