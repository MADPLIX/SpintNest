import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project } from '../types';
import { SearchModal } from './SearchModal';
import { GlobalTaskModal } from './GlobalTaskModal';
import { AlertDialog } from './AlertDialog';
import { UpdateNotification } from './UpdateNotification';
import { ReminderNotification } from './ReminderNotification';
import { WhatsNewModal } from './WhatsNewModal';
import { hasSeenTour, startTour } from '../lib/tour';
import { runReminderCheck } from '../lib/reminderCheck';

const navItems = [
  { id: 'projects' as const, label: 'Projekte', icon: 'folder', shortcut: undefined },
  { id: 'dashboard' as const, label: 'Übersicht', icon: 'chart', shortcut: undefined },
  { id: 'board' as const, label: 'Scrum Board', icon: 'columns', shortcut: 'Strg+N' },
  { id: 'backlog' as const, label: 'Backlog', icon: 'list', shortcut: 'Strg+B' },
  { id: 'sprints' as const, label: 'Sprints', icon: 'calendar', shortcut: undefined },
  { id: 'tagesaufgaben' as const, label: 'Tagesaufgaben', icon: 'check-square', shortcut: undefined },
  { id: 'daily-log' as const, label: 'Arbeitsprotokoll', icon: 'file-text', shortcut: undefined },
  { id: 'export' as const, label: 'PDF-Export', icon: 'download', shortcut: 'Strg+E' },
  { id: 'settings' as const, label: 'Einstellungen', icon: 'settings', shortcut: undefined },
];

function NavIcon({ name }: { name: string }) {
  const cls = 'w-[18px] h-[18px] shrink-0';
  switch (name) {
    case 'folder':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
    case 'chart':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'columns':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>;
    case 'list':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case 'calendar':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case 'check-square':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case 'file-text':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
    case 'download':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case 'info':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
    case 'chevron-left':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="15 18 9 12 15 6"/></svg>;
    case 'chevron-right':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="9 18 15 12 9 6"/></svg>;
    case 'sun':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
    case 'moon':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case 'settings':
      return <svg className={cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    default:
      return null;
  }
}

function NavButton({
  label, icon, shortcut, active, collapsed, dataTour, onClick,
}: {
  id: string; label: string; icon: string; shortcut?: string;
  active: boolean; collapsed: boolean; dataTour?: string; onClick: () => void;
}) {
  return (
    <button
      data-tour={dataTour}
      onClick={onClick}
      title={collapsed ? label : (shortcut ? `${label} (${shortcut})` : undefined)}
      aria-label={shortcut ? `${label}, Shortcut: ${shortcut}` : label}
      className={`relative w-full flex items-center gap-3 text-[13px] font-medium transition-colors rounded-lg
        ${collapsed ? 'justify-center p-3' : 'px-3 py-[9px] border-l-2'}
        ${active
          ? collapsed
            ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
            : 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
          : collapsed
            ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
            : 'border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
        }`}
    >
      <NavIcon name={icon} />
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && shortcut && (
        <kbd className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)]">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentView, setView, selectedProjectId, setSelectedProject, openProjectIds, addOpenProject, removeOpenProject, projectsRefreshTrigger, setSearchOpen, setGlobalTaskToEdit, sidebarCollapsed, setSidebarCollapsed, theme, setTheme } = useStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showArchivedInSidebar, setShowArchivedInSidebar] = useState(false);

  useEffect(() => {
    runReminderCheck();
  }, []);

  useEffect(() => {
    if (!hasSeenTour()) {
      const t = setTimeout(() => {
        startTour(() => setSidebarCollapsed(false));
      }, 800);
      return () => clearTimeout(t);
    }
  }, [setSidebarCollapsed]);

  useEffect(() => {
    api.projects.getAll(showArchivedInSidebar).then(setProjects).catch(console.error);
  }, [projectsRefreshTrigger, showArchivedInSidebar]);

  useEffect(() => {
    const handler = () => {
      api.projects.getAll(showArchivedInSidebar).then(setProjects).catch(console.error);
    };
    window.addEventListener('sprintnest:projectsChanged', handler);
    return () => window.removeEventListener('sprintnest:projectsChanged', handler);
  }, [showArchivedInSidebar]);

  const projectIds = new Set(projects.map((p) => p.id));
  const validOpenProjectIds = openProjectIds.filter((id) => projectIds.has(id));

  useEffect(() => {
    const ids = new Set(projects.map((p) => p.id));
    const invalidIds = openProjectIds.filter((id) => !ids.has(id));
    invalidIds.forEach((id) => removeOpenProject(id));
  }, [projects, openProjectIds, removeOpenProject]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setView('board');
        useStore.getState().setShowTaskModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setView('export');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setView('backlog');
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setGlobalTaskToEdit(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen, setGlobalTaskToEdit, setView]);

  function handleProjectSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value || null;
    if (id) addOpenProject(id);
    else setSelectedProject(null);
  }

  async function handleWindowMinimize() {
    try { await getCurrentWindow().minimize(); } catch { /* nicht in Tauri */ }
  }
  async function handleWindowMaximize() {
    try { await getCurrentWindow().toggleMaximize(); } catch { /* nicht in Tauri */ }
  }
  async function handleWindowClose() {
    try { await getCurrentWindow().close(); } catch { /* nicht in Tauri */ }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const currentNavItem = navItems.find((i) => i.id === currentView);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--color-bg)]">
      {/* Title Bar */}
      <div
        data-tauri-drag-region
        className="h-9 flex items-center justify-between px-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] shrink-0 select-none"
      >
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <img src="/icon.png" alt="" className="w-4 h-4 object-contain shrink-0" />
          <span className="text-xs font-medium text-[var(--color-text-muted)]">SprintNest</span>
          {selectedProject && (
            <>
              <span className="text-xs text-[var(--color-text-dim)]">›</span>
              <span className="text-xs font-medium text-[var(--color-text)] truncate max-w-[160px]">{selectedProject.name}</span>
            </>
          )}
          {currentNavItem && (
            <>
              <span className="text-xs text-[var(--color-text-dim)]">›</span>
              <span className="text-xs text-[var(--color-text-dim)]">{currentNavItem.label}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 pointer-events-auto">
          <button
            onClick={handleWindowMinimize}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
            title="Minimieren"
            aria-label="Fenster minimieren"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={handleWindowMaximize}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
            title="Maximieren"
            aria-label="Fenster maximieren"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="1.5" />
            </svg>
          </button>
          <button
            onClick={handleWindowClose}
            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-dim)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
            title="Schließen"
            aria-label="Fenster schließen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={`shrink-0 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)] flex flex-col transition-[width] duration-200 ${
            sidebarCollapsed ? 'w-14' : 'w-[240px]'
          }`}
        >
          {/* Sidebar Header */}
          <div className={`h-12 border-b border-[var(--color-border)] flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center px-2' : 'px-4 gap-2'}`}>
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                title="Sidebar einblenden"
              >
                <NavIcon name="chevron-right" />
              </button>
            ) : (
              <>
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  <img src="/icon.png" alt="SprintNest" className="w-6 h-6 object-contain" />
                </div>
                <span className="flex-1 text-sm font-semibold tracking-tight text-[var(--color-text)]">SprintNest</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                    title="Suchen (Strg+K)"
                    aria-label="Suchen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                    title={theme === 'dark' ? 'Hellmodus' : 'Dunkelmodus'}
                    aria-label={theme === 'dark' ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln'}
                  >
                    <NavIcon name={theme === 'dark' ? 'sun' : 'moon'} />
                  </button>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                    title="Sidebar ausblenden"
                    aria-label="Sidebar ausblenden"
                  >
                    <NavIcon name="chevron-left" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Project Selector */}
          {!sidebarCollapsed && (
            <div className="px-4 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)] cursor-pointer ml-auto">
                  <input
                    type="checkbox"
                    checked={showArchivedInSidebar}
                    onChange={(e) => setShowArchivedInSidebar(e.target.checked)}
                    className="rounded border-[var(--color-border)]"
                    aria-label="Archivierte Projekte anzeigen"
                  />
                  Archiv
                </label>
              </div>
              <select
                value={projectIds.has(selectedProjectId || '') ? selectedProjectId || '' : ''}
                onChange={handleProjectSelect}
                className="w-full px-2.5 py-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-md text-xs text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-shadow"
                aria-label="Projekt auswählen"
              >
                <option value="">– Projekt öffnen –</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.archiviert ? `${p.name} (archiviert)` : p.name}
                  </option>
                ))}
              </select>
              {/* Open project pills */}
              {validOpenProjectIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {validOpenProjectIds.map((id) => {
                    const p = projects.find((x) => x.id === id);
                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs cursor-pointer group transition-colors ${
                          selectedProjectId === id
                            ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        <span onClick={() => setSelectedProject(id)} className="truncate max-w-[90px]">
                          {p?.name ?? 'Projekt'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeOpenProject(id); }}
                          className="opacity-0 group-hover:opacity-100 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] leading-none"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 py-3 overflow-y-auto flex flex-col gap-0.5 ${sidebarCollapsed ? 'items-center px-1.5' : 'px-3'}`}>
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                {...item}
                active={currentView === item.id}
                collapsed={sidebarCollapsed}
                dataTour={`nav-${item.id}`}
                onClick={() => setView(item.id)}
              />
            ))}

            {/* Bottom: About */}
            <div className={`mt-auto pt-3 border-t border-[var(--color-border)] flex flex-col gap-0.5 ${sidebarCollapsed ? 'w-full items-center' : ''}`}>
              <NavButton
                id="about"
                label="Über SprintNest"
                icon="info"
                active={currentView === 'about'}
                collapsed={sidebarCollapsed}
                onClick={() => setView('about')}
              />
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <main className="flex-1 overflow-auto p-6 text-[var(--color-text)]">{children}</main>
        </div>
      </div>

      <SearchModal />
      <GlobalTaskModal />
      <AlertDialog />
      <UpdateNotification />
      <ReminderNotification />
      <WhatsNewModal />
    </div>
  );
}
