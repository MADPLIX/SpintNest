use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub beschreibung: String,
    pub erstellt_am: String,
    pub sprint_laenge: u32,
    #[serde(default)]
    pub projekt_start: Option<String>,
    #[serde(default)]
    pub projekt_ende: Option<String>,
    #[serde(default)]
    pub definition_of_done: Option<String>,
    #[serde(default)]
    pub board_spalten: Option<Vec<String>>,
    #[serde(default)]
    pub archiviert: bool,
    /// Reihenfolge der Sprint-IDs für Board und Sprints-Ansicht
    #[serde(default)]
    pub sprint_reihenfolge: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub projekt_id: String,
    pub titel: String,
    pub beschreibung: String,
    pub prioritaet: u32,
    pub story_points: Option<u32>,
    pub status: String,
    pub sprint_id: Option<String>,
    #[serde(default)]
    pub faellig_am: Option<String>,
    #[serde(default)]
    pub geschaetzte_stunden: Option<f64>,
    #[serde(default)]
    pub erstellt_am: Option<String>,
    #[serde(default)]
    pub akzeptanzkriterien: Option<String>,
    #[serde(default)]
    pub blockiert_durch: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sprint {
    pub id: String,
    pub projekt_id: String,
    pub name: String,
    pub start_datum: String,
    pub end_datum: String,
    pub ziel: String,
    #[serde(default)]
    pub farbe: Option<String>,
    #[serde(default)]
    pub retro_notizen: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyLog {
    pub id: String,
    pub projekt_id: String,
    pub datum: String,
    #[serde(default)]
    pub eintrag: String,
    #[serde(default)]
    pub screenshot_pfade: Vec<String>,
    #[serde(default)]
    pub verknuepfte_tasks: Vec<String>,
}

const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,
    #[serde(default)]
    pub projects: HashMap<String, Project>,
    #[serde(default)]
    pub tasks: HashMap<String, Task>,
    #[serde(default)]
    pub sprints: HashMap<String, Sprint>,
    #[serde(default)]
    pub daily_logs: HashMap<String, DailyLog>,
}

fn default_schema_version() -> u32 {
    SCHEMA_VERSION
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            projects: HashMap::new(),
            tasks: HashMap::new(),
            sprints: HashMap::new(),
            daily_logs: HashMap::new(),
        }
    }
}

pub struct DbState(pub Mutex<AppData>);

pub fn app_data_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // Behalte alte Pfade für Abwärtskompatibilität (Scrum Planner → SprintNest)
    let dirs = directories::ProjectDirs::from("com", "scrum-planner", "Scrum Planner")
        .ok_or("App-Datenverzeichnis nicht ermittelbar")?;
    Ok(dirs.data_dir().to_path_buf())
}

pub fn screenshots_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let dir = app_data_dir()?.join("screenshots");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn load_json_from_path(path: &std::path::Path) -> Result<AppData, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    let mut data: AppData = serde_json::from_str(&content)?;
    data.schema_version = data.schema_version.max(1);
    Ok(data)
}

fn sanitize_data(data: &mut AppData) {
    let project_ids: std::collections::HashSet<_> = data.projects.keys().cloned().collect();
    let sprint_ids: std::collections::HashSet<_> = data.sprints.keys().cloned().collect();

    data.tasks.retain(|_, t| project_ids.contains(&t.projekt_id));
    data.sprints.retain(|_, s| project_ids.contains(&s.projekt_id));
    data.daily_logs.retain(|_, l| project_ids.contains(&l.projekt_id));

    for task in data.tasks.values_mut() {
        if let Some(ref sid) = task.sprint_id {
            if !sprint_ids.contains(sid) {
                task.sprint_id = None;
            }
        }
    }

    let task_ids: std::collections::HashSet<_> = data.tasks.keys().cloned().collect();
    for log in data.daily_logs.values_mut() {
        log.verknuepfte_tasks.retain(|id| task_ids.contains(id));
    }
}

pub fn init(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app_data_dir()?;
    std::fs::create_dir_all(&app_data_dir)?;
    let data_path = app_data_dir.join("data.json");
    let backups_dir = app_data_dir.join("backups");

    let mut data = if data_path.exists() {
        match load_json_from_path(&data_path) {
            Ok(d) => d,
            Err(_) => {
                let mut loaded = false;
                let mut result = AppData::default();
                if backups_dir.exists() {
                    if let Ok(entries) = std::fs::read_dir(&backups_dir) {
                        let mut files: Vec<_> = entries
                            .filter_map(|e| e.ok())
                            .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
                            .map(|e| (e.path(), e.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH)))
                            .collect();
                        files.sort_by(|a, b| b.1.cmp(&a.1));
                        for (path, _) in files {
                            if let Ok(d) = load_json_from_path(&path) {
                                result = d;
                                loaded = true;
                                let _ = std::fs::copy(&path, &data_path);
                                break;
                            }
                        }
                    }
                }
                if !loaded {
                    result = AppData::default();
                }
                result
            }
        }
    } else {
        AppData::default()
    };

    sanitize_data(&mut data);

    app.manage(DbState(Mutex::new(data)));
    Ok(())
}

const MAX_BACKUPS: usize = 7;

pub fn save(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<DbState>();
    let data = state.0.lock().unwrap().clone();
    let app_data_dir = app_data_dir()?;
    let data_path = app_data_dir.join("data.json");
    let temp_path = app_data_dir.join("data.json.tmp");
    let content = serde_json::to_string_pretty(&data)?;
    std::fs::write(&temp_path, &content)?;
    std::fs::rename(&temp_path, &data_path)?;

    // Tägliches Backup erstellen
    let backups_dir = app_data_dir.join("backups");
    if backups_dir.exists() || std::fs::create_dir_all(&backups_dir).is_ok() {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let backup_path = backups_dir.join(format!("data-{}.json", today));
        let _ = std::fs::copy(&data_path, backup_path);

        // Alte Backups auf MAX_BACKUPS begrenzen
        if let Ok(entries) = std::fs::read_dir(&backups_dir) {
            let mut files: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
                .map(|e| (e.path(), e.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH)))
                .collect();
            files.sort_by(|a, b| b.1.cmp(&a.1));
            for (path, _) in files.into_iter().skip(MAX_BACKUPS) {
                let _ = std::fs::remove_file(path);
            }
        }
    }

    Ok(())
}

pub fn with_data<F, R>(app: &AppHandle, f: F) -> R
where
    F: FnOnce(&mut AppData) -> R,
{
    let state = app.try_state::<DbState>().expect("DbState not initialized");
    let mut guard = state.0.lock().unwrap();
    f(&mut *guard)
}

pub fn reset(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app_data_dir()?;
    let data_path = app_data_dir.join("data.json");
    let backups_dir = app_data_dir.join("backups");
    let screenshots_dir = app_data_dir.join("screenshots");

    if data_path.exists() {
        std::fs::remove_file(&data_path)?;
    }
    if backups_dir.exists() {
        std::fs::remove_dir_all(&backups_dir).ok();
    }
    if screenshots_dir.exists() {
        std::fs::remove_dir_all(&screenshots_dir).ok();
    }

    with_data(app, |data| {
        *data = AppData::default();
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_data_default_has_schema_version() {
        let data = AppData::default();
        assert_eq!(data.schema_version, 1);
    }

    #[test]
    fn app_data_deserialize_old_format_without_schema_version() {
        let json = r#"{"projects":{},"tasks":{},"sprints":{},"daily_logs":{}}"#;
        let data: AppData = serde_json::from_str(json).unwrap();
        assert_eq!(data.schema_version, 1);
    }

    #[test]
    fn app_data_roundtrip() {
        let data = AppData::default();
        let json = serde_json::to_string(&data).unwrap();
        let loaded: AppData = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded.schema_version, data.schema_version);
    }
}
