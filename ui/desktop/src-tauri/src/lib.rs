use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(updater) = handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = handle.emit(
                            "update-available",
                            serde_json::json!({
                                "version": update.version,
                                "body": update.body.unwrap_or_default()
                            }),
                        );
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
