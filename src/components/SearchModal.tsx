import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project, Task } from '../types';
import { getStatusLabel } from '../types';

export function SearchModal() {
  const searchOpen = useStore((s) => s.searchOpen);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const setView = useStore((s) => s.setView);
  const setSelectedProject = useStore((s) => s.setSelectedProject);
  const setGlobalTaskToEdit = useStore((s) => s.setGlobalTaskToEdit);

  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const searchableText = (t: Task) =>
    [t.titel, t.beschreibung, t.akzeptanzkriterien].filter(Boolean).join(' ').toLowerCase();

  const results = useMemo(() => {
    if (!query.trim()) return tasks.slice(0, 20);
    const q = query.toLowerCase().trim();
    return tasks.filter((t) => searchableText(t).includes(q)).slice(0, 20);
  }, [tasks, query]);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
      loadTasks();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen && results.length > 0) {
      setSelectedIndex((i) => Math.min(i, results.length - 1));
    }
  }, [searchOpen, results.length]);

  async function loadTasks() {
    setLoading(true);
    try {
      const [projData, taskData] = await Promise.all([
        api.projects.getAll(),
        api.tasks.getAll(undefined),
      ]);
      setProjects(projData);
      setTasks(taskData);
    } catch (e) {
      console.error('Fehler:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }

  function handleSelect(task: Task) {
    const proj = projects.find((p) => p.id === task.projekt_id);
    if (proj) {
      setSelectedProject(task.projekt_id);
      setView('board');
    }
    setGlobalTaskToEdit(task);
    setSearchOpen(false);
  }

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-[var(--color-border)]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tasks durchsuchen (Titel, Beschreibung…)"
            className="w-full px-4 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <p className="mt-2 text-xs text-[var(--color-text-dim)]">
            ↑↓ Navigation · Enter öffnen · Esc schließen
          </p>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <p className="py-8 text-center text-[var(--color-text-muted)]">Lade…</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-[var(--color-text-muted)]">
              {query.trim() ? 'Keine Treffer' : 'Keine Tasks'}
            </p>
          ) : (
            results.map((task, i) => {
              const proj = projects.find((p) => p.id === task.projekt_id);
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    isSelected ? 'bg-[var(--color-accent-muted)]' : 'hover:bg-[var(--color-bg-hover)]'
                  }`}
                >
                  <div className="font-medium text-[var(--color-text)]">{task.titel}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {proj?.name} · {getStatusLabel(task.status)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
