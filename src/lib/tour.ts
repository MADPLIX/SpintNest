import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_SEEN_KEY = 'sprintnest_tour_seen';

export function hasSeenTour(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(TOUR_SEEN_KEY) === '1';
}

export function markTourSeen(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TOUR_SEEN_KEY, '1');
}

export function resetTourSeen(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(TOUR_SEEN_KEY);
}

const steps: DriveStep[] = [
  {
    popover: {
      title: 'Willkommen bei SprintNest',
      description: 'Diese kurze Tour zeigt dir die wichtigsten Bereiche. Du kannst sie jederzeit überspringen.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    element: '[data-tour="nav-projects"]',
    popover: {
      title: 'Projekte',
      description: 'Hier legst du Projekte an, bearbeitest und archivierst sie. Starte mit deinem ersten Projekt!',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-board"]',
    popover: {
      title: 'Scrum Board',
      description: 'Dein Kanban-Board mit Drag & Drop. Ziehe Tasks zwischen Backlog, Sprints und den Status-Spalten.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-backlog"]',
    popover: {
      title: 'Backlog',
      description: 'Alle offenen Tasks an einem Ort. Ordne sie Sprints zu oder priorisiere sie.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-sprints"]',
    popover: {
      title: 'Sprints',
      description: 'Planung und Übersicht deiner Sprints. Erstelle Sprints, verfolge den Fortschritt und nutze Burndown-Charts.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-tagesaufgaben"]',
    popover: {
      title: 'Tagesaufgaben',
      description: 'Deine Aufgaben für heute. Fokussiere dich auf das, was jetzt ansteht.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-daily-log"]',
    popover: {
      title: 'Arbeitsprotokoll',
      description: 'Tägliche Einträge mit Screenshots. Dokumentiere deine Arbeit und verknüpfe sie mit Tasks.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-export"]',
    popover: {
      title: 'Export',
      description: 'Exportiere Projektplan und Arbeitsprotokoll als PDF oder sichere deine Daten als JSON/CSV.',
      side: 'right',
      align: 'start',
    },
  },
  {
    popover: {
      title: 'Bereit!',
      description: 'Viel Erfolg beim Planen deiner Sprints. Die Tour kannst du jederzeit in den Einstellungen erneut starten.',
      side: 'bottom',
      align: 'center',
    },
  },
];

export function startTour(onBeforeStart?: () => void): void {
  onBeforeStart?.();

  const driverObj = driver({
    showProgress: true,
    steps,
    nextBtnText: 'Weiter',
    prevBtnText: 'Zurück',
    doneBtnText: 'Fertig',
    progressText: '{{current}} von {{total}}',
    onDestroyed: () => markTourSeen(),
  });

  driverObj.drive();
}
