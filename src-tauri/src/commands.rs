use crate::db::{self, DailyLog, Project, Sprint, Task};
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub fn reset_app_data(app: tauri::AppHandle) -> Result<(), String> {
    db::reset(&app).map_err(|e| e.to_string())
}
use serde::Deserialize;

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    format!(
        "{:x}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    )
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub beschreibung: String,
    #[serde(default)]
    pub sprint_laenge: Option<u32>,
    #[serde(default)]
    pub projekt_start: Option<String>,
    #[serde(default)]
    pub projekt_ende: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectInput {
    pub id: String,
    pub name: Option<String>,
    pub beschreibung: Option<String>,
    pub sprint_laenge: Option<u32>,
    pub projekt_start: Option<String>,
    pub projekt_ende: Option<String>,
    pub definition_of_done: Option<String>,
    pub board_spalten: Option<Vec<String>>,
    pub archiviert: Option<bool>,
}

#[tauri::command]
pub fn get_projects(app: tauri::AppHandle, include_archived: Option<bool>) -> Result<Vec<Project>, String> {
    let include = include_archived.unwrap_or(false);
    Ok(db::with_data(&app, |data| {
        data.projects
            .values()
            .filter(|p| include || !p.archiviert)
            .cloned()
            .collect()
    }))
}

#[tauri::command]
pub fn create_project(app: tauri::AppHandle, input: CreateProjectInput) -> Result<Project, String> {
    let id = generate_id();
    let sprint_laenge = input.sprint_laenge.unwrap_or(14);
    let project = Project {
        id: id.clone(),
        name: input.name,
        beschreibung: input.beschreibung,
        erstellt_am: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        sprint_laenge,
        projekt_start: input.projekt_start,
        projekt_ende: input.projekt_ende,
        definition_of_done: None,
        board_spalten: None,
        archiviert: false,
        sprint_reihenfolge: None,
    };
    db::with_data(&app, |data| {
        data.projects.insert(id.clone(), project.clone());
    });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub fn update_project(app: tauri::AppHandle, input: UpdateProjectInput) -> Result<Project, String> {
    let result = db::with_data(&app, |data| {
        let project = data
            .projects
            .get_mut(&input.id)
            .ok_or("Projekt nicht gefunden")?;
        if let Some(name) = input.name {
            project.name = name;
        }
        if let Some(beschreibung) = input.beschreibung {
            project.beschreibung = beschreibung;
        }
        if let Some(sprint_laenge) = input.sprint_laenge {
            project.sprint_laenge = sprint_laenge;
        }
        if let Some(ps) = input.projekt_start {
            project.projekt_start = if ps.trim().is_empty() { None } else { Some(ps) };
        }
        if let Some(pe) = input.projekt_ende {
            project.projekt_ende = if pe.trim().is_empty() { None } else { Some(pe) };
        }
        if let Some(dod) = input.definition_of_done {
            project.definition_of_done = if dod.trim().is_empty() { None } else { Some(dod) };
        }
        if let Some(cols) = input.board_spalten {
            project.board_spalten = if cols.is_empty() { None } else { Some(cols) };
        }
        if let Some(arch) = input.archiviert {
            project.archiviert = arch;
        }
        Ok::<_, String>(project.clone())
    })?;
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn delete_project(app: tauri::AppHandle, id: String) -> Result<(), String> {
    db::with_data(&app, |data| {
        data.projects.remove(&id);
        // Cascade: Tasks, Sprints und DailyLogs des Projekts löschen
        data.tasks.retain(|_, t| t.projekt_id != id);
        data.sprints.retain(|_, s| s.projekt_id != id);
        data.daily_logs.retain(|_, l| l.projekt_id != id);
    });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub projekt_id: String,
    pub titel: String,
    pub beschreibung: String,
    pub prioritaet: u32,
    pub story_points: Option<u32>,
    pub status: String,
    pub sprint_id: Option<String>,
    pub faellig_am: Option<String>,
    pub geschaetzte_stunden: Option<f64>,
    pub akzeptanzkriterien: Option<String>,
    pub blockiert_durch: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub id: String,
    pub titel: Option<String>,
    pub beschreibung: Option<String>,
    pub prioritaet: Option<u32>,
    pub story_points: Option<u32>,
    pub status: Option<String>,
    pub sprint_id: Option<String>,
    pub faellig_am: Option<String>,
    pub geschaetzte_stunden: Option<f64>,
    pub akzeptanzkriterien: Option<String>,
    pub blockiert_durch: Option<Vec<String>>,
}

#[tauri::command]
pub fn get_tasks(app: tauri::AppHandle, projekt_id: Option<String>) -> Result<Vec<Task>, String> {
    Ok(db::with_data(&app, |data| {
        data.tasks
            .values()
            .filter(|t| projekt_id.as_ref().map_or(true, |id| &t.projekt_id == id))
            .cloned()
            .collect::<Vec<_>>()
    }))
}

#[tauri::command]
pub fn create_task(app: tauri::AppHandle, input: CreateTaskInput) -> Result<Task, String> {
    let id = generate_id();
    let erstellt_am = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let task = Task {
        id: id.clone(),
        projekt_id: input.projekt_id,
        titel: input.titel,
        beschreibung: input.beschreibung,
        prioritaet: input.prioritaet,
        story_points: input.story_points,
        status: input.status,
        sprint_id: input.sprint_id,
        faellig_am: input.faellig_am,
        geschaetzte_stunden: input.geschaetzte_stunden,
        erstellt_am: Some(erstellt_am),
        akzeptanzkriterien: input.akzeptanzkriterien,
        blockiert_durch: input.blockiert_durch,
    };
    db::with_data(&app, |data| data.tasks.insert(id.clone(), task.clone()));
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub fn update_task(app: tauri::AppHandle, input: UpdateTaskInput) -> Result<Task, String> {
    let result = db::with_data(&app, |data| {
        let task = data.tasks.get_mut(&input.id).ok_or("Task nicht gefunden")?;
        if let Some(titel) = input.titel {
            task.titel = titel;
        }
        if let Some(beschreibung) = input.beschreibung {
            task.beschreibung = beschreibung;
        }
        if let Some(prioritaet) = input.prioritaet {
            task.prioritaet = prioritaet;
        }
        if let Some(story_points) = input.story_points {
            task.story_points = Some(story_points);
        }
        if let Some(status) = input.status {
            task.status = status;
        }
        if let Some(sprint_id) = input.sprint_id {
            task.sprint_id = if sprint_id.is_empty() {
                None
            } else {
                Some(sprint_id)
            };
        }
        if let Some(faellig_am) = input.faellig_am {
            task.faellig_am = if faellig_am.is_empty() {
                None
            } else {
                Some(faellig_am)
            };
        }
        if let Some(geschaetzte_stunden) = input.geschaetzte_stunden {
            task.geschaetzte_stunden = Some(geschaetzte_stunden);
        }
        if let Some(akzeptanzkriterien) = input.akzeptanzkriterien {
            task.akzeptanzkriterien = if akzeptanzkriterien.is_empty() {
                None
            } else {
                Some(akzeptanzkriterien)
            };
        }
        if let Some(bd) = input.blockiert_durch {
            task.blockiert_durch = if bd.is_empty() { None } else { Some(bd) };
        }
        Ok::<_, String>(task.clone())
    })?;
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn delete_task(app: tauri::AppHandle, id: String) -> Result<(), String> {
    db::with_data(&app, |data| data.tasks.remove(&id));
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct CreateSprintInput {
    pub projekt_id: String,
    pub name: String,
    pub start_datum: String,
    pub end_datum: String,
    pub ziel: String,
    pub farbe: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSprintInput {
    pub id: String,
    pub name: Option<String>,
    pub start_datum: Option<String>,
    pub end_datum: Option<String>,
    pub ziel: Option<String>,
    pub farbe: Option<String>,
    pub retro_notizen: Option<String>,
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_sprints(
    app: tauri::AppHandle,
    projekt_id: Option<String>,
) -> Result<Vec<Sprint>, String> {
    Ok(db::with_data(&app, |data| {
        let mut sprints: Vec<Sprint> = data
            .sprints
            .values()
            .filter(|s| projekt_id.as_ref().map_or(true, |id| &s.projekt_id == id))
            .cloned()
            .collect();

        if let Some(pid) = &projekt_id {
            if let Some(project) = data.projects.get(pid) {
                if let Some(ref order) = project.sprint_reihenfolge {
                    sprints.sort_by(|a, b| {
                        let a_idx = order.iter().position(|id| id == &a.id);
                        let b_idx = order.iter().position(|id| id == &b.id);
                        match (a_idx, b_idx) {
                            (Some(ai), Some(bi)) => ai.cmp(&bi),
                            (Some(_), None) => std::cmp::Ordering::Less,
                            (None, Some(_)) => std::cmp::Ordering::Greater,
                            (None, None) => a.start_datum.cmp(&b.start_datum),
                        }
                    });
                } else {
                    sprints.sort_by(|a, b| a.start_datum.cmp(&b.start_datum));
                }
            } else {
                sprints.sort_by(|a, b| a.start_datum.cmp(&b.start_datum));
            }
        } else {
            sprints.sort_by(|a, b| a.start_datum.cmp(&b.start_datum));
        }

        sprints
    }))
}

#[tauri::command]
pub fn create_sprint(app: tauri::AppHandle, input: CreateSprintInput) -> Result<Sprint, String> {
    if input.start_datum >= input.end_datum {
        return Err("Das Startdatum muss vor dem Enddatum liegen.".to_string());
    }
    let id = generate_id();
    let projekt_id = input.projekt_id.clone();
    let sprint = Sprint {
        id: id.clone(),
        projekt_id: input.projekt_id,
        name: input.name,
        start_datum: input.start_datum,
        end_datum: input.end_datum,
        ziel: input.ziel,
        farbe: input.farbe,
        retro_notizen: None,
    };
    db::with_data(&app, |data| {
        data.sprints.insert(id.clone(), sprint.clone());
        if let Some(project) = data.projects.get_mut(&projekt_id) {
            let order = project.sprint_reihenfolge.get_or_insert_with(Vec::new);
            order.push(id.clone());
        }
    });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(sprint)
}

#[tauri::command]
pub fn update_sprint(app: tauri::AppHandle, input: UpdateSprintInput) -> Result<Sprint, String> {
    let result = db::with_data(&app, |data| {
        let sprint = data
            .sprints
            .get_mut(&input.id)
            .ok_or("Sprint nicht gefunden")?;
        if let Some(name) = input.name {
            sprint.name = name;
        }
        if let Some(start_datum) = input.start_datum {
            sprint.start_datum = start_datum;
        }
        if let Some(end_datum) = input.end_datum {
            sprint.end_datum = end_datum;
        }
        if sprint.start_datum >= sprint.end_datum {
            return Err("Das Startdatum muss vor dem Enddatum liegen.".to_string());
        }
        if let Some(ziel) = input.ziel {
            sprint.ziel = ziel;
        }
        if let Some(farbe) = input.farbe {
            sprint.farbe = if farbe.is_empty() { None } else { Some(farbe) };
        }
        if let Some(rn) = input.retro_notizen {
            sprint.retro_notizen = if rn.trim().is_empty() { None } else { Some(rn) };
        }
        Ok::<_, String>(sprint.clone())
    })?;
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command(rename_all = "snake_case")]
pub fn reorder_sprints(app: tauri::AppHandle, projekt_id: String, sprint_ids: Vec<String>) -> Result<(), String> {
    db::with_data(&app, |data| {
        if let Some(project) = data.projects.get_mut(&projekt_id) {
            project.sprint_reihenfolge = Some(sprint_ids);
        }
    });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_sprint(app: tauri::AppHandle, id: String) -> Result<(), String> {
    db::with_data(&app, |data| {
        let projekt_id = data.sprints.get(&id).map(|s| s.projekt_id.clone());
        data.sprints.remove(&id);
        for (_, task) in data.tasks.iter_mut() {
            if task.sprint_id.as_deref() == Some(&id) {
                task.sprint_id = None;
            }
        }
        if let Some(pid) = projekt_id {
            if let Some(project) = data.projects.get_mut(&pid) {
                if let Some(ref mut order) = project.sprint_reihenfolge {
                    order.retain(|x| x != &id);
                }
            }
        }
    });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct CreateDailyLogInput {
    pub projekt_id: String,
    pub datum: String,
    pub eintrag: String,
    pub screenshot_pfade: Vec<String>,
    pub verknuepfte_tasks: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDailyLogInput {
    pub id: String,
    pub eintrag: Option<String>,
    pub screenshot_pfade: Option<Vec<String>>,
    pub verknuepfte_tasks: Option<Vec<String>>,
}

#[tauri::command]
pub fn get_daily_logs(
    app: tauri::AppHandle,
    projekt_id: Option<String>,
    von: Option<String>,
    bis: Option<String>,
) -> Result<Vec<DailyLog>, String> {
    Ok(db::with_data(&app, |data| {
        data.daily_logs
            .values()
            .filter(|l| data.projects.contains_key(&l.projekt_id))
            .filter(|l| {
                projekt_id.as_ref().map_or(true, |id| &l.projekt_id == id)
                    && von.as_ref().map_or(true, |v| &l.datum >= v)
                    && bis.as_ref().map_or(true, |b| &l.datum <= b)
            })
            .cloned()
            .collect::<Vec<_>>()
    }))
}

#[tauri::command]
pub fn create_daily_log(
    app: tauri::AppHandle,
    input: CreateDailyLogInput,
) -> Result<DailyLog, String> {
    let id = generate_id();
    let log = DailyLog {
        id: id.clone(),
        projekt_id: input.projekt_id,
        datum: input.datum,
        eintrag: input.eintrag,
        screenshot_pfade: input.screenshot_pfade,
        verknuepfte_tasks: input.verknuepfte_tasks,
    };
    db::with_data(&app, |data| data.daily_logs.insert(id.clone(), log.clone()));
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(log)
}

#[tauri::command]
pub fn update_daily_log(
    app: tauri::AppHandle,
    input: UpdateDailyLogInput,
) -> Result<DailyLog, String> {
    let result = db::with_data(&app, |data| {
        let log = data
            .daily_logs
            .get_mut(&input.id)
            .ok_or("Protokoll-Eintrag nicht gefunden")?;
        if let Some(eintrag) = input.eintrag {
            log.eintrag = eintrag;
        }
        if let Some(screenshot_pfade) = input.screenshot_pfade {
            log.screenshot_pfade = screenshot_pfade;
        }
        if let Some(verknuepfte_tasks) = input.verknuepfte_tasks {
            log.verknuepfte_tasks = verknuepfte_tasks;
        }
        Ok::<_, String>(log.clone())
    })?;
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    default_name: Option<String>,
    filters: Option<Vec<(String, Vec<String>)>>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let dialog = app.dialog();
    let mut file_builder = dialog.file();
    if let Some(name) = default_name {
        file_builder = file_builder.set_file_name(&name);
    }
    if let Some(f) = filters {
        for (name, exts) in f {
            let ext_refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
            file_builder = file_builder.add_filter(name, &ext_refs);
        }
    }
    let path = file_builder.blocking_save_file();
    Ok(path.map(|p| p.to_string()))
}

fn validate_path_no_traversal(path: &str) -> Result<(), String> {
    if path.contains("..") {
        return Err("Ungültiger Pfad".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn write_file_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    validate_path_no_traversal(&path)?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_screenshots_dir(_app: tauri::AppHandle) -> Result<String, String> {
    let dir = db::screenshots_dir().map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_file_text(path: String) -> Result<String, String> {
    validate_path_no_traversal(&path)?;
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_base64(path: String) -> Result<String, String> {
    validate_path_no_traversal(&path)?;
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
pub fn delete_daily_log(app: tauri::AppHandle, id: String) -> Result<(), String> {
    db::with_data(&app, |data| data.daily_logs.remove(&id));
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct ImportBackupInput {
    pub project: Option<Project>,
    pub tasks: Option<Vec<Task>>,
    pub sprints: Option<Vec<Sprint>>,
    #[serde(alias = "dailyLogs")]
    pub daily_logs: Option<Vec<DailyLog>>,
}

#[tauri::command]
pub fn import_backup(app: tauri::AppHandle, input: ImportBackupInput) -> Result<Project, String> {
    let project = input.project.ok_or("Kein Projekt in Backup")?;
    let tasks = input.tasks.unwrap_or_default();
    let sprints = input.sprints.unwrap_or_default();
    let logs = input.daily_logs.unwrap_or_default();

    let new_project_id = generate_id();
    let mut sprint_id_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut task_id_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    let new_project = Project {
        id: new_project_id.clone(),
        name: format!("{} (Import)", project.name),
        archiviert: false,
        sprint_reihenfolge: None,
        ..project
    };

    db::with_data(&app, |data| {
        data.projects
            .insert(new_project_id.clone(), new_project.clone());

        for sprint in sprints {
            let new_id = generate_id();
            sprint_id_map.insert(sprint.id.clone(), new_id.clone());
            let mut s = sprint.clone();
            s.id = new_id;
            s.projekt_id = new_project_id.clone();
            data.sprints.insert(s.id.clone(), s);
        }

        for task in tasks {
            let new_id = generate_id();
            task_id_map.insert(task.id.clone(), new_id.clone());
            let mut t = task.clone();
            t.id = new_id.clone();
            t.projekt_id = new_project_id.clone();
            t.sprint_id = task
                .sprint_id
                .as_ref()
                .and_then(|old| sprint_id_map.get(old).cloned());
            data.tasks.insert(new_id, t);
        }

        for log in logs {
            let new_id = generate_id();
            let mut l = log.clone();
            l.id = new_id;
            l.projekt_id = new_project_id.clone();
            l.verknuepfte_tasks = log
                .verknuepfte_tasks
                .iter()
                .filter_map(|old| task_id_map.get(old).cloned())
                .collect();
            data.daily_logs.insert(l.id.clone(), l);
        }
    });

    db::save(&app).map_err(|e| e.to_string())?;
    Ok(new_project)
}

fn gdrive_tokens_path(_app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(db::app_data_dir().map_err(|e| e.to_string())?.join("gdrive_tokens.json"))
}

#[tauri::command]
pub fn save_gdrive_tokens(app: tauri::AppHandle, tokens: String) -> Result<(), String> {
    let path = gdrive_tokens_path(&app)?;
    std::fs::write(path, tokens.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_gdrive_tokens(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = gdrive_tokens_path(&app)?;
    if !path.exists() { return Ok(None); }
    std::fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_gdrive_tokens(app: tauri::AppHandle) -> Result<(), String> {
    let path = gdrive_tokens_path(&app)?;
    if path.exists() { std::fs::remove_file(path).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
pub fn get_full_data_json(app: tauri::AppHandle) -> Result<String, String> {
    let json = db::with_data(&app, |data| serde_json::to_string(&*data).unwrap_or_default());
    Ok(json)
}

#[tauri::command]
pub fn replace_full_data(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let new_data: db::AppData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    db::with_data(&app, |data| {
        *data = new_data;
    });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

/// Erstellt ein Sync-Bundle: AppData + alle referenzierten Screenshot-Dateien als Base64.
#[tauri::command]
pub fn get_sync_bundle(app: tauri::AppHandle) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let data_json = db::with_data(&app, |data| serde_json::to_string(&*data).unwrap_or_default());
    let app_data: serde_json::Value = serde_json::from_str(&data_json).map_err(|e| e.to_string())?;

    let mut screenshots = serde_json::Map::new();
    if let Some(logs) = app_data.get("daily_logs").and_then(|v| v.as_object()) {
        for log in logs.values() {
            if let Some(pfade) = log.get("screenshot_pfade").and_then(|v| v.as_array()) {
                for path_val in pfade {
                    if let Some(path_str) = path_val.as_str() {
                        let path = std::path::Path::new(path_str);
                        if let (Some(filename), Ok(bytes)) = (path.file_name(), std::fs::read(path)) {
                            screenshots.insert(
                                filename.to_string_lossy().to_string(),
                                serde_json::Value::String(STANDARD.encode(&bytes)),
                            );
                        }
                    }
                }
            }
        }
    }

    let bundle = serde_json::json!({ "data": app_data, "screenshots": screenshots });
    serde_json::to_string(&bundle).map_err(|e| e.to_string())
}

/// Wendet ein Sync-Bundle an: schreibt Screenshots lokal, passt Pfade an, speichert Daten.
#[tauri::command]
pub fn apply_sync_bundle(app: tauri::AppHandle, bundle: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let bundle_val: serde_json::Value = serde_json::from_str(&bundle).map_err(|e| e.to_string())?;
    let screenshots = bundle_val.get("screenshots").and_then(|v| v.as_object()).cloned().unwrap_or_default();
    let mut app_data: db::AppData = serde_json::from_value(
        bundle_val.get("data").cloned().ok_or("Bundle enthält kein 'data'-Feld")?
    ).map_err(|e| e.to_string())?;

    let screenshots_dir = db::screenshots_dir().map_err(|e| e.to_string())?;

    // Schreibe Screenshot-Dateien und baue eine Map: filename -> lokaler Pfad
    let mut path_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for (filename, b64_val) in &screenshots {
        if let Some(b64) = b64_val.as_str() {
            if let Ok(bytes) = STANDARD.decode(b64) {
                let local_path = screenshots_dir.join(filename);
                std::fs::write(&local_path, bytes).ok();
                path_map.insert(filename.clone(), local_path.to_string_lossy().to_string());
            }
        }
    }

    // Aktualisiere screenshot_pfade in allen DailyLogs auf lokale Pfade
    for log in app_data.daily_logs.values_mut() {
        log.screenshot_pfade = log.screenshot_pfade.iter().map(|p| {
            let filename = std::path::Path::new(p)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_default();
            path_map.get(&filename).cloned().unwrap_or_else(|| p.clone())
        }).collect();
    }

    db::with_data(&app, |data| { *data = app_data; });
    db::save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn start_oauth_listener(app: tauri::AppHandle) -> Result<u16, String> {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    use tauri::Emitter;

    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut code: Option<String> = None;
            {
                let reader = BufReader::new(&stream);
                if let Some(Ok(request_line)) = reader.lines().next() {
                    if let Some(path) = request_line.split(' ').nth(1) {
                        code = path.split('?').nth(1).and_then(|params| {
                            params
                                .split('&')
                                .find(|p| p.starts_with("code="))
                                .map(|p| p.trim_start_matches("code=").to_string())
                        });
                    }
                }
            }
            let html = if code.is_some() {
                "<html><body style='font-family:sans-serif;text-align:center;padding:2rem'><h2>&#10003; Erfolgreich verbunden!</h2><p>Du kannst dieses Fenster schlie&szlig;en.</p></body></html>"
            } else {
                "<html><body><p>Fehler bei der Authentifizierung.</p></body></html>"
            };
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                html.len(),
                html
            );
            let _ = stream.write_all(response.as_bytes());
            if let Some(c) = code {
                let _ = app.emit("oauth-code", c);
            }
        }
    });

    Ok(port)
}

#[tauri::command]
pub fn open_url(url: String) {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("rundll32").args(["url.dll,FileProtocolHandler", &url]).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&url).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
}

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;
    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        notes: u.body.clone(),
    }))
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;
    if let Some(u) = update {
        u.download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
