import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Task } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

export function GlobalTaskModal() {
  const globalTaskToEdit = useStore((s) => s.globalTaskToEdit);
  const setGlobalTaskToEdit = useStore((s) => s.setGlobalTaskToEdit);
  const [sprints, setSprints] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (globalTaskToEdit?.projekt_id) {
      api.sprints.getAll(globalTaskToEdit.projekt_id).then((data) =>
        setSprints(data.map((s) => ({ id: s.id, name: s.name })))
      );
    } else {
      setSprints([]);
    }
  }, [globalTaskToEdit?.projekt_id]);

  async function handleSave(updates: Partial<Task>) {
    if (!globalTaskToEdit) return;
    try {
      await api.tasks.update({ id: globalTaskToEdit.id, ...updates });
      setGlobalTaskToEdit(null);
    } catch (e) {
      console.error('Fehler:', e);
    }
  }

  if (!globalTaskToEdit) return null;

  return (
    <TaskDetailModal
      task={globalTaskToEdit}
      sprints={sprints}
      onSave={handleSave}
      onClose={() => setGlobalTaskToEdit(null)}
    />
  );
}
