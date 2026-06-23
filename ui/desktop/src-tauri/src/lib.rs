use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandChild, ShellExt};

#[cfg(not(debug_assertions))]
struct SidecarHandle(Mutex<Option<CommandChild>>);

// ── Sync ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SyncSettings {
    url: String,
    api_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_upload_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_upload_mtime: Option<u64>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncVersionResult {
    has_newer: bool,
    server_timestamp: Option<String>,
}

fn settings_path() -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("sem directório pai")?.to_path_buf();
    Ok(dir.join("sync_settings.json"))
}

async fn db_path() -> Result<std::path::PathBuf, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get("http://localhost:5535/system/db-path")
        .send()
        .await
        .map_err(|e| format!("API inacessível — reinicia a aplicação: {e}"))?;

    if !res.status().is_success() {
        return Err(format!(
            "API retornou {} em /db-path — reinicia a aplicação",
            res.status()
        ));
    }

    let body: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Resposta inválida do API: {e}"))?;

    let path = body["path"]
        .as_str()
        .ok_or("Campo 'path' em falta na resposta do API")?;

    Ok(std::path::PathBuf::from(path))
}

fn load_settings() -> SyncSettings {
    settings_path()
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn persist_settings(settings: &SyncSettings) -> Result<(), String> {
    let path = settings_path()?;
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sync_settings() -> SyncSettings {
    load_settings()
}

#[tauri::command]
fn save_sync_settings(settings: SyncSettings) -> Result<(), String> {
    persist_settings(&settings)
}

#[tauri::command]
async fn check_sync_version() -> Result<SyncVersionResult, String> {
    let settings = load_settings();

    if settings.url.is_empty() || settings.api_key.is_empty() {
        return Ok(SyncVersionResult { has_newer: false, server_timestamp: None });
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(format!("{}/version", settings.url.trim_end_matches('/')))
        .header("X-Api-Key", &settings.api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Erro do servidor: {}", res.status()));
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let server_ts = body["timestamp"].as_str().map(|s| s.to_string());

    // ISO 8601 UTC strings são comparáveis lexicograficamente
    let has_newer = match (&server_ts, &settings.last_upload_time) {
        (Some(srv), Some(local)) => srv.as_str() > local.as_str(),
        (Some(_), None) => true,
        _ => false,
    };

    Ok(SyncVersionResult { has_newer, server_timestamp: server_ts })
}

#[tauri::command]
async fn upload_db() -> Result<String, String> {
    let settings = load_settings();

    if settings.url.is_empty() || settings.api_key.is_empty() {
        return Err("Servidor de sync não configurado.".into());
    }

    let db = db_path().await?;
    if !db.exists() {
        return Err("Base de dados não encontrada.".into());
    }

    let bytes = tokio::fs::read(&db).await.map_err(|e| e.to_string())?;

    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name("database.db")
        .mime_str("application/octet-stream")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new().part("database", part);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post(format!("{}/upload", settings.url.trim_end_matches('/')))
        .header("X-Api-Key", &settings.api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Erro {}: {}", status, body));
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let timestamp = body["timestamp"].as_str().unwrap_or("").to_string();

    // guardar mtime actual da DB como referência para deteção de alterações futuras
    let mtime = std::fs::metadata(db_path().await?)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs());

    let mut updated = settings;
    updated.last_upload_time = Some(timestamp.clone());
    updated.last_upload_mtime = mtime;
    persist_settings(&updated)?;

    Ok(timestamp)
}

#[tauri::command]
async fn download_db(app: tauri::AppHandle) -> Result<(), String> {
    let settings = load_settings();

    if settings.url.is_empty() || settings.api_key.is_empty() {
        return Err("Servidor de sync não configurado.".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(format!("{}/download", settings.url.trim_end_matches('/')))
        .header("X-Api-Key", &settings.api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Erro do servidor: {}", res.status()));
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    let db = db_path().await?;
    let tmp = db.with_extension("db.tmp");

    #[cfg(not(debug_assertions))]
    {
        if let Some(sidecar) = app.try_state::<SidecarHandle>() {
            if let Ok(mut lock) = sidecar.0.lock() {
                if let Some(child) = lock.take() {
                    let _ = child.kill();
                }
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }
    #[cfg(debug_assertions)]
    let _ = app;

    tokio::fs::write(&tmp, &bytes).await.map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &db).map_err(|e| e.to_string())?;

    #[cfg(not(debug_assertions))]
    {
        use tauri_plugin_shell::ShellExt;
        if let Some(sidecar) = app.try_state::<SidecarHandle>() {
            let (_rx, child) = app
                .shell()
                .sidecar("api")
                .map_err(|e| e.to_string())?
                .env("ASPNETCORE_ENVIRONMENT", "Production")
                .env("ASPNETCORE_URLS", "http://localhost:5535")
                .spawn()
                .map_err(|e| e.to_string())?;
            if let Ok(mut lock) = sidecar.0.lock() {
                *lock = Some(child);
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn has_unsynced_changes() -> bool {
    let settings = load_settings();

    if settings.url.is_empty() || settings.api_key.is_empty() {
        return false;
    }

    let db = match db_path().await {
        Ok(p) => p,
        Err(_) => return false,
    };

    if !db.exists() {
        return false;
    }

    let current_mtime = std::fs::metadata(&db)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    match settings.last_upload_mtime {
        None => true,
        Some(stored) => current_mtime > stored,
    }
}

// ── App setup ─────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            get_sync_settings,
            save_sync_settings,
            check_sync_version,
            upload_db,
            download_db,
            has_unsynced_changes,
        ])
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
