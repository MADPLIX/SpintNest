import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

export function About() {
  const [version, setVersion] = useState<string>('–');

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('?'));
  }, []);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-transparent">
          <img src="/icon.png" alt="SprintNest" className="w-16 h-16 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">SprintNest</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Version {version}</p>
        </div>
      </div>
      <p className="text-[var(--color-text-muted)] leading-relaxed">
        SprintNest ist eine Scrum-Planungs-App für deine Projekte, Sprints und Aufgaben.
        Verwalte Backlogs, Boards, Tagesaufgaben und Arbeitsprotokolle an einem Ort.
      </p>
      <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
        <p><span className="font-medium text-[var(--color-text-dim)]">Entwickelt von</span> MADPLIX</p>
        <p><span className="font-medium text-[var(--color-text-dim)]">Lizenz</span> MIT-Lizenz</p>
      </div>
      <div className="pt-4 border-t border-[var(--color-border)] text-sm text-[var(--color-text-dim)]">
        © {new Date().getFullYear()} MADPLIX
      </div>
    </div>
  );
}
