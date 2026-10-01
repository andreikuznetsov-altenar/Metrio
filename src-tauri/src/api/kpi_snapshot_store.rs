use crate::persistence::{atomic_write_json, load_json_file};
use serde_json::{json, Value};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const KPI_SNAPSHOT_SCHEMA_VERSION: u32 = 1;

fn kpi_snapshot_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("kpi_snapshots.json"))
}

#[tauri::command]
pub fn kpi_snapshot_load(app: AppHandle) -> Result<Value, String> {
    let path = kpi_snapshot_path(&app)?;
    let loaded = load_json_file(
        &path,
        json!({
            "schemaVersion": KPI_SNAPSHOT_SCHEMA_VERSION,
            "personSnapshots": [],
            "teamSnapshots": []
        }),
    );
    if let Some(warning) = loaded.warning {
        eprintln!("kpi_snapshot_load warning: {}", warning);
    }
    Ok(loaded.value)
}

#[tauri::command]
pub fn kpi_snapshot_save(app: AppHandle, data: Value) -> Result<(), String> {
    let path = kpi_snapshot_path(&app)?;
    let mut payload = data;
    if payload.get("schemaVersion").is_none() {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert(
                "schemaVersion".to_string(),
                json!(KPI_SNAPSHOT_SCHEMA_VERSION),
            );
        }
    }
    atomic_write_json(&path, &payload)
}
