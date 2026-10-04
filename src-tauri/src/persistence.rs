use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const PREFERENCES_SCHEMA_VERSION: u32 = 1;
pub const SURVEY_DATA_SCHEMA_VERSION: u32 = 1;
pub const GOALS_DATA_SCHEMA_VERSION: u32 = 1;
pub const DASHBOARD_CACHE_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JsonLoadSource {
    File,
    Default,
}

pub struct LoadedJson {
    pub value: Value,
    pub warning: Option<String>,
    pub source: JsonLoadSource,
}

fn backup_corrupt_file(path: &Path) -> Option<PathBuf> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let backup = path.with_extension(format!("corrupt.{}.json", timestamp));
    if fs::rename(path, &backup).is_ok() {
        return Some(backup);
    }
    None
}

pub fn load_json_file(path: &Path, default: Value) -> LoadedJson {
    if !path.exists() {
        return LoadedJson {
            value: default,
            warning: None,
            source: JsonLoadSource::Default,
        };
    }

    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(e) => {
            return LoadedJson {
                value: default,
                warning: Some(format!("Failed to read {}: {}", path.display(), e)),
                source: JsonLoadSource::Default,
            };
        }
    };

    match serde_json::from_str::<Value>(&text) {
        Ok(value) => LoadedJson {
            value,
            warning: None,
            source: JsonLoadSource::File,
        },
        Err(e) => {
            let backup = backup_corrupt_file(path);
            let warning = match backup {
                Some(path) => format!(
                    "Corrupt JSON at {} backed up to {}: {}",
                    path.parent()
                        .and_then(|_| path.file_name())
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "data".to_string()),
                    path.display(),
                    e
                ),
                None => format!("Corrupt JSON at {}: {}", path.display(), e),
            };
            LoadedJson {
                value: default,
                warning: Some(warning),
                source: JsonLoadSource::Default,
            }
        }
    }
}

pub fn atomic_write_json(path: &Path, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    let tmp_path = path.with_extension("json.tmp");

    {
        let mut file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        file.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }

    fs::rename(&tmp_path, path).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(name: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("aiva-persist-{}-{}", name, stamp))
    }

    #[test]
    fn atomic_write_roundtrip() {
        let path = temp_path("roundtrip");
        let value = serde_json::json!({ "schemaVersion": 1, "ok": true });
        atomic_write_json(&path, &value).expect("write");
        let loaded = load_json_file(&path, serde_json::json!({}));
        assert_eq!(loaded.value.get("ok"), Some(&serde_json::json!(true)));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn corrupt_file_is_backed_up_and_defaults_used() {
        let path = temp_path("corrupt");
        fs::write(&path, "{not-json").expect("seed corrupt");
        let loaded = load_json_file(&path, serde_json::json!({ "safe": true }));
        assert_eq!(loaded.value.get("safe"), Some(&serde_json::json!(true)));
        assert!(loaded.warning.is_some());
        assert!(!path.exists());
        let parent = path.parent().unwrap();
        for entry in fs::read_dir(parent).unwrap() {
            let entry_path = entry.unwrap().path();
            if entry_path.file_name().and_then(|n| n.to_str()).unwrap_or("").contains("corrupt") {
                let _ = fs::remove_file(entry_path);
            }
        }
    }
}
