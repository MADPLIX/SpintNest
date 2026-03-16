import { format } from 'date-fns';
import { api } from '../api';
import { useStore } from '../store/useStore';

const STORAGE_KEY = 'sn_notified_tasks_v2';

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, string>;
    const today = todayStr();
    return new Set(
      Object.entries(parsed)
        .filter(([, d]) => d === today)
        .map(([id]) => id)
    );
  } catch {
    return new Set();
  }
}

function markNotified(taskIds: string[]) {
  try {
    const today = todayStr();
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: Record<string, string> = raw ? JSON.parse(raw) : {};
    const cleaned: Record<string, string> = {};
    for (const [id, d] of Object.entries(existing)) {
      if (d === today) cleaned[id] = d;
    }
    for (const id of taskIds) cleaned[id] = today;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore
  }
}

export async function runReminderCheck() {
  try {
    const { setReminder } = useStore.getState();
    const today = todayStr();
    const projects = await api.projects.getAll();
    const notified = getNotifiedSet();
    const overdueIds: string[] = [];
    const todayIds: string[] = [];
    const overdueTitles: string[] = [];
    const todayTitles: string[] = [];

    for (const project of projects) {
      const tasks = await api.tasks.getAll(project.id);
      for (const task of tasks) {
        if (task.status === 'Done' || !task.faellig_am) continue;
        if (notified.has(task.id)) continue;
        if (task.faellig_am < today) {
          overdueIds.push(task.id);
          overdueTitles.push(task.titel);
        } else if (task.faellig_am === today) {
          todayIds.push(task.id);
          todayTitles.push(task.titel);
        }
      }
    }

    if (overdueIds.length > 0 || todayIds.length > 0) {
      setReminder(overdueTitles, todayTitles);
      markNotified([...overdueIds, ...todayIds]);
    }
  } catch {
    // ignore
  }
}
