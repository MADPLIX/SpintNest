import { invoke } from '@tauri-apps/api/core';
import type { Project, Task, Sprint, DailyLog } from '../types';

export const api = {
  projects: {
    getAll: (includeArchived?: boolean) =>
      invoke<Project[]>('get_projects', { includeArchived }),
    create: (data: { name: string; beschreibung: string; sprint_laenge?: number; projekt_start?: string; projekt_ende?: string }) =>
      invoke<Project>('create_project', { input: data }),
    update: (data: {
      id: string;
      name?: string;
      beschreibung?: string;
      sprint_laenge?: number;
      projekt_start?: string;
      projekt_ende?: string;
      definition_of_done?: string;
      board_spalten?: string[];
      archiviert?: boolean;
    }) => invoke<Project>('update_project', { input: data }),
    delete: (id: string) => invoke<void>('delete_project', { id }),
  },
  tasks: {
    getAll: (projektId?: string) => invoke<Task[]>('get_tasks', { projektId }),
    create: (data: {
      projekt_id: string;
      titel: string;
      beschreibung: string;
      prioritaet: number;
      story_points?: number;
      status: string;
      sprint_id?: string;
      faellig_am?: string;
      geschaetzte_stunden?: number;
      akzeptanzkriterien?: string;
    }) => invoke<Task>('create_task', { input: data }),
    update: (data: {
      id: string;
      titel?: string;
      beschreibung?: string;
      prioritaet?: number;
      story_points?: number;
      status?: string;
      sprint_id?: string;
      faellig_am?: string;
      geschaetzte_stunden?: number;
      akzeptanzkriterien?: string;
      blockiert_durch?: string[];
    }) => invoke<Task>('update_task', { input: data }),
    delete: (id: string) => invoke<void>('delete_task', { id }),
  },
  sprints: {
    getAll: (projektId?: string) => invoke<Sprint[]>('get_sprints', { projekt_id: projektId }),
    create: (data: {
      projekt_id: string;
      name: string;
      start_datum: string;
      end_datum: string;
      ziel: string;
      farbe?: string;
    }) => invoke<Sprint>('create_sprint', { input: data }),
    update: (data: {
      id: string;
      name?: string;
      start_datum?: string;
      end_datum?: string;
      ziel?: string;
      farbe?: string;
      retro_notizen?: string;
    }) => invoke<Sprint>('update_sprint', { input: data }),
    delete: (id: string) => invoke<void>('delete_sprint', { id }),
    reorder: (projektId: string, sprintIds: string[]) =>
      invoke<void>('reorder_sprints', { projekt_id: projektId, sprint_ids: sprintIds }),
  },
  dailyLogs: {
    getAll: (projektId?: string, von?: string, bis?: string) =>
      invoke<DailyLog[]>('get_daily_logs', { projektId, von, bis }),
    create: (data: {
      projekt_id: string;
      datum: string;
      eintrag: string;
      screenshot_pfade: string[];
      verknuepfte_tasks: string[];
    }) => invoke<DailyLog>('create_daily_log', { input: data }),
    update: (data: {
      id: string;
      eintrag?: string;
      screenshot_pfade?: string[];
      verknuepfte_tasks?: string[];
    }) => invoke<DailyLog>('update_daily_log', { input: data }),
    delete: (id: string) => invoke<void>('delete_daily_log', { id }),
  },
  getScreenshotsDir: () => invoke<string>('get_screenshots_dir'),
  resetAppData: () => invoke<void>('reset_app_data'),
  readFileBase64: (path: string) => invoke<string>('read_file_base64', { path }),
  importBackup: (data: {
    project?: import('../types').Project;
    tasks?: import('../types').Task[];
    sprints?: import('../types').Sprint[];
    dailyLogs?: import('../types').DailyLog[];
  }) =>
    invoke<import('../types').Project>('import_backup', {
      input: {
        project: data.project,
        tasks: data.tasks,
        sprints: data.sprints,
        daily_logs: data.dailyLogs,
      },
    }),
};
