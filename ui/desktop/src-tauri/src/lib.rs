use std::sync::Mutex;
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;

#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandChild, ShellExt};

#[cfg(not(debug_assertions))]
struct SidecarHandle(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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

            #[cfg(not(debug_assertions))]
            {
                let (_rx, child) = app
                    .shell()
                    .sidecar("api")?
                    .env("ASPNETCORE_ENVIRONMENT", "Production")
                    .env("ASPNETCORE_URLS", "http://localhost:5535")
                    .spawn()?;
                app.manage(SidecarHandle(Mutex::new(Some(child))));
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
        .on_window_event(|_window, _event| {
            #[cfg(not(debug_assertions))]
            if let tauri::WindowEvent::Destroyed = _event {
                if let Some(sidecar) = _window.app_handle().try_state::<SidecarHandle>() {
                    if let Ok(mut lock) = sidecar.0.lock() {
                        if let Some(child) = lock.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
