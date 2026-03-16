import { useEffect, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store/useStore';
import type { Project } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { DateInput } from './DateInput';
import { Modal } from './Modal';

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({ name: '', beschreibung: '', projekt_start: '', projekt_ende: '' });
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ name: '', beschreibung: '', projekt_start: '', projekt_ende: '', definition_of_done: '' });
  const addOpenProject = useStore((s) => s.addOpenProject);
  const removeOpenProject = useStore((s) => s.removeOpenProject);
  const setView = useStore((s) => s.setView);
  const triggerProjectsRefresh = useStore((s) => s.triggerProjectsRefresh);
  const showAlert = useStore((s) => s.showAlert);

  useEffect(() => {
    loadProjects();
  }, [showArchived]);

  async function loadProjects() {
    try {
      const data = await api.projects.getAll(showArchived);
      setProjects(data);
    } catch (e) {
      console.error('Fehler beim Laden:', e);
      showAlert('Fehler beim Laden der Projekte: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.projects.create({
        name: formData.name,
        beschreibung: formData.beschreibung,
        projekt_start: formData.projekt_start || undefined,
        projekt_ende: formData.projekt_ende || undefined,
      });
      setFormData({ name: '', beschreibung: '', projekt_start: '', projekt_ende: '' });
      setShowForm(false);
      loadProjects();
      triggerProjectsRefresh();
      window.dispatchEvent(new CustomEvent('sprintnest:projectsChanged'));
    } catch (e) {
      console.error('Fehler beim Erstellen:', e);
      showAlert('Fehler beim Erstellen: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleDelete(id: string) {
    const p = projects.find((x) => x.id === id);
    if (p) setProjectToDelete(p);
  }

  async function confirmDelete() {
    if (!projectToDelete) return;
    try {
      await api.projects.delete(projectToDelete.id);
      removeOpenProject(projectToDelete.id);
      setProjectToDelete(null);
      loadProjects();
      triggerProjectsRefresh();
      window.dispatchEvent(new CustomEvent('sprintnest:projectsChanged'));
    } catch (e) {
      console.error('Fehler beim Löschen:', e);
      showAlert('Fehler beim Löschen: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleArchive(p: Project) {
    try {
      await api.projects.update({ id: p.id, archiviert: true });
      loadProjects();
      triggerProjectsRefresh();
      window.dispatchEvent(new CustomEvent('sprintnest:projectsChanged'));
      showAlert('Projekt archiviert.', 'success');
    } catch (e) {
      console.error('Fehler beim Archivieren:', e);
      showAlert('Fehler beim Archivieren: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  async function handleRestore(p: Project) {
    try {
      await api.projects.update({ id: p.id, archiviert: false });
      loadProjects();
      triggerProjectsRefresh();
      window.dispatchEvent(new CustomEvent('sprintnest:projectsChanged'));
      showAlert('Projekt wiederhergestellt.', 'success');
    } catch (e) {
      console.error('Fehler beim Wiederherstellen:', e);
      showAlert('Fehler beim Wiederherstellen: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  function openEdit(p: Project) {
    setProjectToEdit(p);
    setEditForm({
      name: p.name,
      beschreibung: p.beschreibung,
      projekt_start: p.projekt_start || '',
      projekt_ende: p.projekt_ende || '',
      definition_of_done: p.definition_of_done || '',
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectToEdit) return;
    try {
      await api.projects.update({
        id: projectToEdit.id,
        name: editForm.name,
        beschreibung: editForm.beschreibung,
        projekt_start: editForm.projekt_start || undefined,
        projekt_ende: editForm.projekt_ende || undefined,
        definition_of_done: editForm.definition_of_done || undefined,
      });
      setProjectToEdit(null);
      loadProjects();
      triggerProjectsRefresh();
      window.dispatchEvent(new CustomEvent('sprintnest:projectsChanged'));
    } catch (e) {
      console.error('Fehler beim Speichern:', e);
      showAlert('Fehler beim Speichern: ' + (e instanceof Error ? e.message : String(e)), 'error');
    }
  }

  function handleSelect(project: Project) {
    addOpenProject(project.id);
    setView('dashboard');
  }

  if (loading) return <div className="text-[var(--color-text-muted)]">Lade...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-[var(--color-text)]">Projekte</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-[var(--color-border)]"
            />
            Archivierte anzeigen
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            {showForm ? 'Abbrechen' : 'Neues Projekt'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Projektname"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
            <textarea
              placeholder="Beschreibung"
              value={formData.beschreibung}
              onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Projektzeitraum: Von</label>
                <DateInput
                  value={formData.projekt_start}
                  onChange={(e) => setFormData({ ...formData, projekt_start: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Bis</label>
                <DateInput
                  value={formData.projekt_ende}
                  onChange={(e) => setFormData({ ...formData, projekt_ende: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]">
              Erstellen
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="py-16 px-6 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)] mb-4">
            {showArchived ? 'Keine archivierten Projekte.' : 'Noch keine Projekte.'}
          </p>
          <p className="text-sm text-[var(--color-text-dim)] mb-6">
            {showArchived
              ? 'Archivierte Projekte erscheinen hier, wenn du welche archivierst.'
              : 'Erstelle dein erstes Projekt, um mit der Sprint-Planung zu starten.'}
          </p>
          {!showArchived && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Neues Projekt erstellen
            </button>
          )}
        </div>
      ) : (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
        {projects.map((p) => (
          <div
            key={p.id}
            className={`p-4 sm:p-5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-border-light)] hover:shadow-[var(--shadow-card)] transition-all cursor-pointer min-w-0 ${p.archiviert ? 'opacity-75' : ''}`}
            onClick={() => !p.archiviert && handleSelect(p)}
          >
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex justify-between items-start gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[var(--color-text)] truncate">{p.name}</h3>
                  {p.archiviert && (
                    <span className="text-xs text-[var(--color-text-dim)]">Archiviert</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    title="Einstellungen"
                  >
                    ⚙
                  </button>
                  {p.archiviert ? (
                    <button
                      onClick={() => handleRestore(p)}
                      className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] text-sm transition-colors px-1.5 py-1 whitespace-nowrap"
                    >
                      Wiederherstellen
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(p)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm transition-colors px-1.5 py-1 whitespace-nowrap"
                    >
                      Archivieren
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-[var(--color-danger)] hover:text-[var(--color-danger-hover)] text-sm transition-colors px-1.5 py-1 whitespace-nowrap"
                  >
                    Löschen
                  </button>
                </div>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 min-w-0">{p.beschreibung}</p>
              <p className="text-xs text-[var(--color-text-dim)]">
                {p.projekt_start && p.projekt_ende
                  ? `${p.projekt_start} – ${p.projekt_ende}`
                  : p.sprint_laenge
                    ? `${p.sprint_laenge} Tage Sprint`
                    : '–'}
              </p>
            </div>
          </div>
        ))}
      </div>
      )}

      {projectToEdit && (
        <Modal title="Projekt bearbeiten" onClose={() => setProjectToEdit(null)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Projektname</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Beschreibung</label>
              <textarea
                value={editForm.beschreibung}
                onChange={(e) => setEditForm({ ...editForm, beschreibung: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)]"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Projektzeitraum: Von</label>
                <DateInput
                  value={editForm.projekt_start}
                  onChange={(e) => setEditForm({ ...editForm, projekt_start: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Bis</label>
                <DateInput
                  value={editForm.projekt_ende}
                  onChange={(e) => setEditForm({ ...editForm, projekt_ende: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Definition of Done (Fertigstellungskriterien)</label>
              <textarea
                value={editForm.definition_of_done}
                onChange={(e) => setEditForm({ ...editForm, definition_of_done: e.target.value })}
                placeholder="Eine Checkliste pro Zeile, z.B.:&#10;Code ist getestet&#10;Dokumentation aktualisiert"
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)]"
                rows={4}
              />
              <p className="text-xs text-[var(--color-text-dim)] mt-1">Wird beim Abschließen eines Tasks angezeigt</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)]">
                Speichern
              </button>
              <button type="button" onClick={() => setProjectToEdit(null)} className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg">
                Abbrechen
              </button>
            </div>
          </form>
        </Modal>
      )}

      {projectToDelete && (
        <ConfirmModal
          title="Projekt löschen"
          message={`Möchtest du das Projekt „${projectToDelete.name}" wirklich löschen? Alle zugehörigen Tasks, Sprints und Protokolle werden entfernt.`}
          confirmLabel="Löschen"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
    </div>
  );
}
