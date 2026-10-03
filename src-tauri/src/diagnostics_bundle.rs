use serde::Deserialize;
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize)]
pub struct BundleFileDto {
    pub name: String,
    pub content: String,
}

#[tauri::command]
pub fn support_bundle_export(
    app: AppHandle,
    bundle_id: String,
    files: Vec<BundleFileDto>,
) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("exports");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe_id = bundle_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
        .collect::<String>();
    let path = dir.join(format!("support-{}.zip", safe_id));

    let file = fs::File::create(&path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in files {
        let name = entry.name.replace('\\', "/");
        zip.start_file(name, options)
            .map_err(|e| e.to_string())?;
        zip.write_all(entry.content.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn logs_read_tail(app: AppHandle, max_bytes: Option<u64>) -> Result<String, String> {
    let cap = max_bytes.unwrap_or(64 * 1024);
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("logs")
        .join("app.log");
    if !path.exists() {
        return Ok(String::new());
    }
    let data = fs::read(&path).map_err(|e| e.to_string())?;
    if data.len() as u64 <= cap {
        return Ok(String::from_utf8_lossy(&data).to_string());
    }
    let slice = &data[data.len() - cap as usize..];
    Ok(String::from_utf8_lossy(slice).to_string())
}
