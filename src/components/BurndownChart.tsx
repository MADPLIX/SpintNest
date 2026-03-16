import { format, parseISO, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Sprint, Task } from '../types';

type BurndownChartProps = {
  sprint: Sprint;
  tasks: Task[];
};

export function BurndownChart({ sprint, tasks }: BurndownChartProps) {
  const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
  const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const donePoints = sprintTasks
    .filter((t) => t.status === 'Done')
    .reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const remaining = totalPoints - donePoints;

  if (totalPoints === 0) return null;

  const start = parseISO(sprint.start_datum);
  const end = parseISO(sprint.end_datum);
  const today = new Date();
  const totalDays = Math.max(1, differenceInDays(end, start) + 1);
  const elapsedDays = Math.max(0, differenceInDays(today, start) + 1);
  const idealRemaining = Math.max(0, totalPoints - (totalPoints / totalDays) * elapsedDays);

  const maxVal = totalPoints;
  const height = 100;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Burndown</h4>
      <div className="h-[100px] flex items-end gap-1">
        <div className="flex-1 flex flex-col justify-end">
          <div
            className="w-full bg-[var(--color-accent)]/30 rounded-t"
            style={{ height: `${(idealRemaining / maxVal) * height}px` }}
            title={`Ideal verbleibend: ${idealRemaining.toFixed(0)} SP`}
          />
          <div className="text-[10px] text-[var(--color-text-dim)] mt-1">Ideal</div>
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <div
            className="w-full bg-[var(--color-accent)] rounded-t"
            style={{ height: `${(remaining / maxVal) * height}px` }}
            title={`Tatsächlich verbleibend: ${remaining} SP`}
          />
          <div className="text-[10px] text-[var(--color-text-dim)] mt-1">Aktuell</div>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-dim)] mt-2">
        {remaining} / {totalPoints} SP verbleibend · Sprint bis {format(end, 'd.MM.yyyy', { locale: de })}
      </p>
    </div>
  );
}
