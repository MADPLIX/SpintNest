# SprintNest

Eine Desktop-Anwendung für Scrum-Projektplanung mit täglichem Arbeitsprotokoll und PDF-Export.

## Funktionen

- **Projekte** – Projekte anlegen, bearbeiten, archivieren und löschen
- **Scrum Board** – Kanban-Board mit Drag & Drop (Backlog, To Do, In Progress, Review, Done)
- **Product Backlog** – Übersicht aller Backlog-Tasks
- **Sprints** – Sprint-Planung mit Start, Ende und Ziel
- **Arbeitsprotokoll** – Tägliche Einträge mit Screenshot-Upload
- **PDF-Export** – Projektplan und Arbeitsprotokoll als PDF exportieren
- **Daten-Export** – JSON- und CSV-Export für Backup und Auswertung

## Voraussetzungen

- **Node.js** (v18+)
- **Rust** (für Tauri) – [rustup.rs](https://rustup.rs)
- **Windows:** Visual Studio Build Tools mit C++-Workload

## Installation

```bash
cd scrum-planner
npm install
```

## Entwicklung

```bash
npm run tauri:dev
```

Startet die Tauri-App mit Hot-Reload. Das Vite-Frontend und die Rust-Backend werden automatisch neu geladen.

## Build

```bash
npm run tauri:build
```

Erstellt eine installierbare Anwendung im Ordner `src-tauri/target/release/bundle/`.

## Nur Frontend (ohne Tauri)

```bash
npm run dev    # Entwicklung
npm run build  # Produktions-Build
```

Hinweis: Ohne Tauri funktionieren die Datenpersistenz und native Dialoge nicht – die App benötigt Tauri für den vollen Funktionsumfang.

## Technologie-Stack

- **Tauri 2** – Desktop-Framework
- **React 19 + TypeScript + Vite**
- **Tailwind CSS**
- **Zustand** – State Management
- **@dnd-kit** – Drag & Drop
- **jspdf + jspdf-autotable** – PDF-Export

## Datenspeicherung

Daten werden lokal in `data.json` im App-Datenordner gespeichert:
- **Windows:** `%APPDATA%/com.sprintnest.app/`
- **macOS:** `~/Library/Application Support/com.tauri.dev/`
- **Linux:** `~/.config/com.tauri.dev/`

Automatische Backups werden täglich im Unterordner `backups/` erstellt.
