import type { TaskTemplate } from '../types';

const KEY = 'sprintnest_task_templates';

export function getTaskTemplates(): TaskTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTaskTemplate(template: Omit<TaskTemplate, 'id'>): void {
  const templates = getTaskTemplates();
  const newOne: TaskTemplate = {
    ...template,
    id: crypto.randomUUID(),
  };
  templates.unshift(newOne);
  if (templates.length > 20) templates.pop();
  localStorage.setItem(KEY, JSON.stringify(templates));
}

export function deleteTaskTemplate(id: string): void {
  const templates = getTaskTemplates().filter((t) => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(templates));
}
