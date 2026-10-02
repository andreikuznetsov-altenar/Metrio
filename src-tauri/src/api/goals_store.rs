use crate::persistence::{atomic_write_json, load_json_file, GOALS_DATA_SCHEMA_VERSION};
use serde_json::{json, Value};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn goals_data_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("goals_data.json"))
}

#[tauri::command]
pub fn goals_data_load(app: AppHandle) -> Result<Value, String> {
    let path = goals_data_path(&app)?;
    let loaded = load_json_file(&path, json!({ "schemaVersion": GOALS_DATA_SCHEMA_VERSION }));
    if let Some(warning) = loaded.warning {
        eprintln!("goals_data_load warning: {}", warning);
    }
    Ok(loaded.value)
}

#[tauri::command]
pub fn goals_data_save(app: AppHandle, data: Value) -> Result<(), String> {
    let path = goals_data_path(&app)?;
    let mut payload = data;
    if payload.get("schemaVersion").is_none() {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert(
                "schemaVersion".to_string(),
                json!(GOALS_DATA_SCHEMA_VERSION),
            );
        }
    }
    atomic_write_json(&path, &payload)
}
