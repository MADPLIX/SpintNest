import { create } from 'zustand';
import type { Task } from '../types';

type View = 'projects' | 'dashboard' | 'board' | 'backlog' | 'sprints' | 'tagesaufgaben' | 'daily-log' | 'export' | 'settings' | 'about';

type Theme = 'dark' | 'light';

type AlertType = 'info' | 'error' | 'success';

interface AppState {
  currentView: View;
  selectedProjectId: string | null;
  selectedSprintId: string | null;
  openProjectIds: string[];
  projectsRefreshTrigger: number;
  searchOpen: boolean;
  globalTaskToEdit: Task | null;
  sidebarCollapsed: boolean;
  theme: Theme;
  showTaskModal: boolean;
  alertState: { open: boolean; message: string; type: AlertType };
  updateAvailable: boolean;
  updateVersion: string | null;
  updateNotes: string | null;
  updateInstalling: boolean;
  setUpdateAvailable: (version: string, notes: string | null) => void;
  clearUpdate: () => void;
  setUpdateInstalling: (installing: boolean) => void;
  reminderOverdue: string[];
  reminderToday: string[];
  setReminder: (overdue: string[], today: string[]) => void;
  clearReminder: () => void;
  setView: (view: View) => void;
  showAlert: (message: string, type?: AlertType) => void;
  closeAlert: () => void;
  triggerProjectsRefresh: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: Theme) => void;
  setShowTaskModal: (show: boolean) => void;
  setSelectedProject: (id: string | null) => void;
  setSelectedSprint: (id: string | null) => void;
  addOpenProject: (id: string) => void;
  removeOpenProject: (id: string) => void;
  setSearchOpen: (open: boolean) => void;
  setGlobalTaskToEdit: (task: Task | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentView: 'projects',
  selectedProjectId: null,
  selectedSprintId: null,
  openProjectIds: [],
  projectsRefreshTrigger: 0,
  searchOpen: false,
  globalTaskToEdit: null,
  sidebarCollapsed: false,
  theme: (typeof localStorage !== 'undefined' ? (localStorage.getItem('sprintnest_theme') as Theme) : null) || 'dark',
  showTaskModal: false,
  alertState: { open: false, message: '', type: 'info' as AlertType },
  updateAvailable: false,
  updateVersion: null,
  updateNotes: null,
  updateInstalling: false,
  setUpdateAvailable: (version, notes) =>
    set({ updateAvailable: true, updateVersion: version, updateNotes: notes }),
  clearUpdate: () =>
    set({ updateAvailable: false, updateVersion: null, updateNotes: null, updateInstalling: false }),
  setUpdateInstalling: (installing) => set({ updateInstalling: installing }),
  reminderOverdue: [],
  reminderToday: [],
  setReminder: (overdue, today) => set({ reminderOverdue: overdue, reminderToday: today }),
  clearReminder: () => set({ reminderOverdue: [], reminderToday: [] }),
  setView: (view) => set({ currentView: view }),
  showAlert: (message, type = 'info') =>
    set({ alertState: { open: true, message, type: type || 'info' } }),
  closeAlert: () => set({ alertState: { open: false, message: '', type: 'info' } }),
  triggerProjectsRefresh: () =>
    set((s) => ({ projectsRefreshTrigger: s.projectsRefreshTrigger + 1 })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => {
    localStorage.setItem('sprintnest_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setShowTaskModal: (show) => set({ showTaskModal: show }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setGlobalTaskToEdit: (task) => set({ globalTaskToEdit: task }),
  setSelectedSprint: (id) => set({ selectedSprintId: id }),
  setSelectedProject: (id) =>
    set((state) => ({
      selectedProjectId: id,
      openProjectIds:
        id && !state.openProjectIds.includes(id)
          ? [...state.openProjectIds, id]
          : state.openProjectIds,
    })),
  addOpenProject: (id) =>
    set((state) => ({
      openProjectIds: state.openProjectIds.includes(id) ? state.openProjectIds : [...state.openProjectIds, id],
      selectedProjectId: id,
    })),
  removeOpenProject: (id) =>
    set((state) => {
      const next = state.openProjectIds.filter((x) => x !== id);
      return {
        openProjectIds: next,
        selectedProjectId: state.selectedProjectId === id ? (next[0] ?? null) : state.selectedProjectId,
      };
    }),
}));
