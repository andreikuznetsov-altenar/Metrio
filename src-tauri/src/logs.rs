use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const MAX_LOG_BYTES: u64 = 2 * 1024 * 1024;

static LOG_MUTEX: Mutex<()> = Mutex::new(());

#[derive(Debug, Deserialize)]
pub struct LogWriteParams {
    pub level: String,
    pub domain: String,
    pub operation: String,
    pub correlation_id: Option<String>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct LogsPathResult {
    pub path: String,
}

fn logs_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let logs = dir.join("logs");
    fs::create_dir_all(&logs).map_err(|e| e.to_string())?;
    Ok(logs)
}

fn log_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(logs_dir(app)?.join("app.log"))
}

fn rotate_if_needed(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let size = fs::metadata(path).map_err(|e| e.to_string())?.len();
    if size <= MAX_LOG_BYTES {
        return Ok(());
    }
    let rotated = path.with_extension("log.1");
    let _ = fs::remove_file(&rotated);
    fs::rename(path, rotated).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn log_write(app: AppHandle, params: LogWriteParams) -> Result<(), String> {
    let path = log_file_path(&app)?;
    let _guard = LOG_MUTEX.lock().map_err(|_| "log lock poisoned".to_string())?;
    rotate_if_needed(&path)?;

    let timestamp = chrono_like_timestamp();
    let correlation = params
        .correlation_id
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| "-".to_string());

    let line = format!(
        "{} [{}] [{}] [{}] [{}] {}\n",
        timestamp,
        params.level,
        params.domain,
        params.operation,
        correlation,
        sanitize_log_message(&params.message),
    );

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    file.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn logs_get_path(app: AppHandle) -> Result<LogsPathResult, String> {
    let path = log_file_path(&app)?;
    Ok(LogsPathResult {
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn logs_open_folder(app: AppHandle) -> Result<(), String> {
    let dir = logs_dir(&app)?;
    open::that(dir).map_err(|e| e.to_string())
}

fn sanitize_log_message(message: &str) -> String {
    let flattened = message.replace('\n', " ");
    redact_urls(&flattened)
        .replace("Bearer ", "Bearer [redacted] ")
        .replace("refresh_token", "[redacted_token]")
        .replace("access_token", "[redacted_token]")
}

fn redact_urls(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == 'h' || ch == 'H' {
            let mut probe = String::new();
            probe.push(ch);
            for _ in 0..7 {
                if let Some(next) = chars.peek() {
                    probe.push(*next);
                    chars.next();
                }
            }
            let lower = probe.to_ascii_lowercase();
            if lower.starts_with("https://") || lower.starts_with("http://") {
                out.push_str("[url_redacted]");
                while let Some(&next) = chars.peek() {
                    if next.is_whitespace() || next == ')' || next == ']' {
                        break;
                    }
                    chars.next();
                }
                continue;
            }
            out.push_str(&probe);
            continue;
        }
        out.push(ch);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{redact_urls, sanitize_log_message};

    #[test]
    fn redacts_jira_rest_urls() {
        let raw = "error sending request for url (https://altenar.atlassian.net/rest/api/3/issue/UX-4433/changelog)";
        let sanitized = sanitize_log_message(raw);
        assert!(!sanitized.contains("https://"));
        assert!(!sanitized.contains("/rest/api/"));
        assert!(sanitized.contains("[url_redacted]"));
    }

    #[test]
    fn redact_urls_leaves_non_url_text() {
        assert_eq!(redact_urls("operation=run_report issueKey=UX-1"), "operation=run_report issueKey=UX-1");
    }
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", now)
}
