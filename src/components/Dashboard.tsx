import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project, Sprint, Task } from '../types';

const todayStr = format(new Date(), 'yyyy-MM-dd');

function isOverdue(faelligAm: string | undefined) {
  return faelligAm && faelligAm < todayStr;
}

function StatCard({
  label, value, onClick, color,
}: {
  label: string; value: number; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-xl border text-left transition-all hover:opacity-90 ${color}`}
    >
      <div className="text-3xl font-bold text-[var(--color-text)] tabular-nums">{value}</div>
      <div className="text-sm text-[var(--color-text-muted)] mt-1">{label}</div>
    </button>
  );
}

export function Dashboard() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setView = useStore((s) => s.setView);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  async function loadData() {
    try {
      const [projData, sprintData] = await Promise.all([
        api.projects.getAll(),
        api.sprints.getAll(selectedProjectId || undefined),
      ]);
      setProjects(projData);
      setSprints(sprintData);
      if (selectedProjectId) {
        const taskData = await api.tasks.getAll(selectedProjectId);
        setTasks(taskData);
      } else {
        setTasks([]);
      }
    } catch (e) {
      console.error('Fehler:', e);
    } finally {
      setLoading(false);
    }
  }

  const inProgress = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Review');
  const overdue = inProgress.filter((t) => isOverdue(t.faellig_am));
  const doneCount = tasks.filter((t) => t.status === 'Done').length;
  const backlogCount = tasks.filter((t) => t.status === 'Backlog' && !t.sprint_id).length;

  if (loading) return <div className="text-[var(--color-text-muted)] text-sm">Lade...</div>;

  if (!selectedProjectId || projects.length === 0) {
    return (
      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-[var(--color-text)] mb-1">Übersicht</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">Noch kein Projekt aktiv.</p>
        <div className="p-8 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-[var(--color-text-dim)]">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text)] mb-1">Kein Projekt ausgewählt</p>
          <p className="text-xs text-[var(--color-text-muted)] mb-6">
            Wähle ein Projekt aus der Sidebar oder erstelle ein neues.
          </p>
          <button
            onClick={() => setView('projects')}
            className="px-4 py-2 bg-[var(--color-accent)] text-white text-sm rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Zu den Projekten
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'In Bearbeitung',
      value: inProgress.length,
      onClick: () => setView('tagesaufgaben'),
      color: 'border-amber-500/40 bg-amber-500/5',
    },
    {
      label: 'Überfällig',
      value: overdue.length,
      onClick: () => setView('tagesaufgaben'),
      color: overdue.length > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-[var(--color-border)] bg-[var(--color-bg-card)]',
    },
    {
      label: 'Erledigt',
      value: doneCount,
      onClick: () => setView('board'),
      color: 'border-emerald-500/40 bg-emerald-500/5',
    },
    {
      label: 'Im Backlog',
      value: backlogCount,
      onClick: () => setView('backlog'),
      color: 'border-[var(--color-border)] bg-[var(--color-bg-card)]',
    },
  ];

  const quickLinks = [
    { label: 'Scrum Board', view: 'board' as const },
    { label: 'Tagesaufgaben', view: 'tagesaufgaben' as const },
    { label: 'Produkt-Backlog', view: 'backlog' as const },
    { label: 'Arbeitsprotokoll', view: 'daily-log' as const },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-text)] mb-0.5">Übersicht</h2>
        <p className="text-sm text-[var(--color-text-muted)]">Alle wichtigen Kennzahlen auf einen Blick.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Links */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Schnellzugriff</h3>
          </div>
          <div className="p-2">
            {quickLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => setView(link.view)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors flex items-center justify-between group"
              >
                <span>{link.label}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="opacity-0 group-hover:opacity-50 transition-opacity">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Sprints */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Aktive Sprints</h3>
          </div>
          <div className="p-4">
            {sprints.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Keine Sprints vorhanden.</p>
            ) : (
              <div className="space-y-4">
                {sprints.slice(0, 4).map((s) => {
                  const sprintTasks = tasks.filter((t) => t.sprint_id === s.id);
                  const done = sprintTasks.filter((t) => t.status === 'Done').length;
                  const total = sprintTasks.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const donePoints = sprintTasks.filter((t) => t.status === 'Done').reduce((sum, t) => sum + (t.story_points ?? 0), 0);
                  const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[var(--color-text)] truncate max-w-[60%]">{s.name}</span>
                        <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                          {done}/{total}{totalPoints > 0 && ` · ${donePoints}/${totalPoints} SP`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--color-text-dim)] mt-1">{pct}% abgeschlossen</p>
                    </div>
                  );
                })}
              </div>
            )}
            {(() => {
              const completedSprints = sprints.filter((s) => {
                const st = tasks.filter((t) => t.sprint_id === s.id);
                const dp = st.filter((t) => t.status === 'Done').reduce((sum, t) => sum + (t.story_points ?? 0), 0);
                const tp = st.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
                return tp > 0 && dp >= tp * 0.8;
              });
              const velocities = completedSprints.map((s) => {
                const st = tasks.filter((t) => t.sprint_id === s.id);
                return st.filter((t) => t.status === 'Done').reduce((sum, t) => sum + (t.story_points ?? 0), 0);
              });
              const avgVelocity = velocities.length > 0 ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length) : 0;
              if (avgVelocity === 0) return null;
              return (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--color-text-dim)]">Ø Velocity</p>
                    <p className="text-lg font-bold text-[var(--color-text)]">{avgVelocity} <span className="text-sm font-normal text-[var(--color-text-muted)]">SP</span></p>
                  </div>
                  <p className="text-xs text-[var(--color-text-dim)]">aus {velocities.length} Sprint(s)</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-[var(--color-text-dim)] flex gap-3 flex-wrap">
        <span><kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] rounded text-[var(--color-text-muted)] font-mono">Strg+K</kbd> Suche</span>
        <span><kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] rounded text-[var(--color-text-muted)] font-mono">Strg+N</kbd> Neuer Task</span>
        <span><kbd className="px-1.5 py-0.5 bg-[var(--color-surface)] rounded text-[var(--color-text-muted)] font-mono">Strg+E</kbd> Export</span>
      </p>
    </div>
  );
}
