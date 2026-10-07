use crate::api::pdf_export::atomic_write_bytes;
use crate::persistence::{atomic_write_json, load_json_file, REPORT_HISTORY_SCHEMA_VERSION};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};
use rand::Rng;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReportHistoryEntry {
    pub id: String,
    pub created_at: String,
    pub filename: String,
    pub storage_name: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReportHistoryFile {
    schema_version: u32,
    reports: Vec<ReportHistoryEntry>,
}

fn reports_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let reports = dir.join("reports");
    fs::create_dir_all(&reports).map_err(|e| e.to_string())?;
    Ok(reports)
}

fn history_index_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("report_history.json"))
}

fn default_history_file() -> serde_json::Value {
    json!({
        "schemaVersion": REPORT_HISTORY_SCHEMA_VERSION,
        "reports": []
    })
}

fn load_history_file(app: &AppHandle) -> Result<ReportHistoryFile, String> {
    let path = history_index_path(app)?;
    let loaded = load_json_file(&path, default_history_file());
    let mut file: ReportHistoryFile = serde_json::from_value(loaded.value)
        .map_err(|e| format!("Invalid report history file: {}", e))?;
    if file.schema_version == 0 {
        file.schema_version = REPORT_HISTORY_SCHEMA_VERSION;
    }
    Ok(file)
}

fn save_history_file(app: &AppHandle, file: &ReportHistoryFile) -> Result<(), String> {
    let path = history_index_path(app)?;
    atomic_write_json(&path, &serde_json::to_value(file).map_err(|e| e.to_string())?)
}

fn validate_archive_filename(filename: &str) -> Result<String, String> {
    let trimmed = filename.trim();
    if trimmed.is_empty() || trimmed.contains('/') || trimmed.contains('\\') {
        return Err("Invalid report filename".to_string());
    }
    if !trimmed.ends_with(".pdf") {
        return Err("Report filename must end with .pdf".to_string());
    }
    Ok(trimmed.to_string())
}

fn unique_storage_name(dir: &Path, filename: &str) -> String {
    let path = dir.join(filename);
    if !path.exists() {
        return filename.to_string();
    }
    let stem = filename.strip_suffix(".pdf").unwrap_or(filename);
    for index in 2..1000 {
        let candidate = format!("{}_{}.pdf", stem, index);
        if !dir.join(&candidate).exists() {
            return candidate;
        }
    }
    format!("{}_{}.pdf", stem, rand::thread_rng().gen::<u32>())
}

fn validate_dest_pdf_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() || trimmed.contains('\0') {
        return Err("Empty file path".to_string());
    }
    let path_buf = PathBuf::from(trimmed);
    if path_buf
        .components()
        .any(|c| matches!(c, Component::ParentDir))
    {
        return Err("Invalid file path".to_string());
    }
    let ext = path_buf
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    if !ext.eq_ignore_ascii_case("pdf") {
        return Err("File path must end with .pdf".to_string());
    }
    Ok(path_buf)
}

#[tauri::command]
pub fn report_history_list(app: AppHandle) -> Result<Vec<ReportHistoryEntry>, String> {
    let file = load_history_file(&app)?;
    let mut reports = file.reports;
    reports.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(reports)
}

#[tauri::command]
pub fn report_history_archive(
    app: AppHandle,
    bytes: Vec<u8>,
    created_at: String,
    filename: String,
) -> Result<ReportHistoryEntry, String> {
    if bytes.len() < 5 || bytes[..4] != *b"%PDF" {
        return Err("Invalid PDF data".to_string());
    }
    if created_at.trim().is_empty() {
        return Err("Missing created timestamp".to_string());
    }
    let filename = validate_archive_filename(&filename)?;
    let reports_path = reports_dir(&app)?;
    let storage_name = unique_storage_name(&reports_path, &filename);
    let storage_path = reports_path.join(&storage_name);
    atomic_write_bytes(&storage_path, &bytes)?;

    let entry = ReportHistoryEntry {
        id: format!("report-{:x}", rand::thread_rng().gen::<u128>()),
        created_at,
        filename,
        storage_name,
    };

    let mut file = load_history_file(&app)?;
    file.reports.push(entry.clone());
    save_history_file(&app, &file)?;
    Ok(entry)
}

#[tauri::command]
pub fn report_history_copy_to_path(
    app: AppHandle,
    id: String,
    path: String,
) -> Result<(), String> {
    let dest = validate_dest_pdf_path(&path)?;
    let file = load_history_file(&app)?;
    let entry = file
        .reports
        .iter()
        .find(|r| r.id == id)
        .ok_or_else(|| "Report not found".to_string())?;
    let source = reports_dir(&app)?.join(&entry.storage_name);
    if !source.exists() {
        return Err("Archived PDF is missing".to_string());
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&source, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn report_history_remove(app: AppHandle, id: String) -> Result<(), String> {
    let mut file = load_history_file(&app)?;
    let before = file.reports.len();
    file.reports.retain(|entry| entry.id != id);
    if file.reports.len() == before {
        return Err("Report not found".to_string());
    }
    save_history_file(&app, &file)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unique_storage_name_appends_suffix_on_collision() {
        let dir = std::env::temp_dir().join(format!(
            "metrio-report-history-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("dir");
        fs::write(dir.join("Metrio_Report_2026-10-07_15-02.pdf"), b"%PDF")
            .expect("seed");

        let first = unique_storage_name(&dir, "Metrio_Report_2026-10-07_15-02.pdf");
        assert_eq!(first, "Metrio_Report_2026-10-07_15-02_2.pdf");

        let _ = fs::remove_dir_all(&dir);
    }
}
