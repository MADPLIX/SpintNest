export interface ChangelogEntry {
  version: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.5.5',
    items: [
      'Behebung: App ließ sich nicht schließen, wenn Google-Drive-Autosync das Fenster beim Beenden blockiert hat (Schließen wird nicht mehr abgefangen; Upload beim Beenden nur noch best-effort im Hintergrund)',
    ],
  },
  {
    version: '0.5.4',
    items: [
      'Arbeitsprotokoll: ohne gewähltes Projekt werden keine Einträge mehr aus anderen Projekten angezeigt',
      'Google Drive: optional automatisch auf Drive sichern (nach Änderungen, kurz nach Start, beim Beenden); manuelles Laden nur mit Bestätigungsdialog',
    ],
  },
  {
    version: '0.4.5',
    items: [
      'Screenshot-Farben aus Zwischenablage werden jetzt korrekt dargestellt',
      'Farben in exportierten PDFs korrekt (via JPEG-Konvertierung)',
      'Google Drive Verbindung bleibt nach App-Updates erhalten',
    ],
  },
  {
    version: '0.4.4',
    items: [
      'Screenshot-Farben aus Zwischenablage werden jetzt korrekt dargestellt',
    ],
  },
  {
    version: '0.4.3',
    items: [
      'Google Drive Verbindung bleibt nach App-Updates erhalten',
    ],
  },
  {
    version: '0.4.2',
    items: [
      'Google Drive Sync synchronisiert jetzt auch Screenshots aus dem Arbeitsprotokoll',
    ],
  },
  {
    version: '0.4.1',
    items: [
      'Google Drive Sync: Projekte mit deinem Google-Account auf mehreren Geräten synchronisieren',
      'Fälligkeits-Erinnerungen erscheinen jetzt als nicht-blockierender Toast unten rechts',
      'Sprint-Reihenfolge im Scrum Board entspricht jetzt der Sortierung in der Sprint-Ansicht',
    ],
  },
];

export function getChangelog(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find((e) => e.version === version);
}
