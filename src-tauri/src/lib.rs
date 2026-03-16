mod commands;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let handle = app.handle().clone();
            db::init(&handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::reset_app_data,
            commands::get_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_sprints,
            commands::create_sprint,
            commands::update_sprint,
            commands::delete_sprint,
            commands::reorder_sprints,
            commands::get_daily_logs,
            commands::create_daily_log,
            commands::update_daily_log,
            commands::delete_daily_log,
            commands::import_backup,
            commands::get_screenshots_dir,
            commands::read_file_text,
            commands::read_file_base64,
            commands::save_file_dialog,
            commands::write_file_bytes,
            commands::check_for_update,
            commands::install_update,
            commands::save_gdrive_tokens,
            commands::load_gdrive_tokens,
            commands::clear_gdrive_tokens,
            commands::get_full_data_json,
            commands::replace_full_data,
            commands::get_sync_bundle,
            commands::apply_sync_bundle,
            commands::start_oauth_listener,
            commands::open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
