use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, serde::Serialize)]
pub struct WriteUserSelectedPdfResult {
    pub path: String,
}

fn validate_user_pdf_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Empty file path".to_string());
    }
    if trimmed.contains('\0') {
        return Err("Invalid file path".to_string());
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

pub fn atomic_write_bytes(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "Invalid file path".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let tmp_path = path.with_extension("pdf.part");
    {
        let mut file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        file.write_all(bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp_path, path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn write_user_selected_pdf(path: String, bytes: Vec<u8>) -> Result<WriteUserSelectedPdfResult, String> {
    let path_buf = validate_user_pdf_path(&path)?;
    if bytes.is_empty() {
        return Err("PDF data is empty".to_string());
    }
    if bytes.len() < 5 || bytes[..4] != *b"%PDF" {
        return Err("Invalid PDF data".to_string());
    }
    atomic_write_bytes(&path_buf, &bytes)?;
    Ok(WriteUserSelectedPdfResult {
        path: path_buf.to_string_lossy().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_pdf_path(name: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("metrio-pdf-test-{}-{}.pdf", name, stamp))
    }

    #[test]
    fn rejects_non_pdf_extension() {
        let err = validate_user_pdf_path("/tmp/report.txt").expect_err("should fail");
        assert!(err.contains(".pdf"));
    }

    #[test]
    fn rejects_parent_dir_traversal() {
        assert!(validate_user_pdf_path("../evil.pdf").is_err());
    }

    #[test]
    fn writes_valid_pdf_bytes() {
        let path = temp_pdf_path("ok");
        let bytes = b"%PDF-1.4\n%test\n".to_vec();
        let result = write_user_selected_pdf(path.to_string_lossy().to_string(), bytes);
        assert!(result.is_ok());
        let written = fs::read(&path).expect("read");
        assert!(written.starts_with(b"%PDF"));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_empty_bytes() {
        let path = temp_pdf_path("empty");
        let err = write_user_selected_pdf(path.to_string_lossy().to_string(), vec![]);
        assert!(err.is_err());
    }

    #[test]
    fn writes_verified_overview_pdf_from_downloads() {
        if std::env::var("METRIO_WRITE_VERIFY_PDF").is_err() {
            return;
        }
        let source = std::env::home_dir()
            .expect("home")
            .join("Downloads")
            .join("Metrio-Packaged-Verify-Overview.pdf");
        if !source.exists() {
            return;
        }
        let bytes = fs::read(&source).expect("read overview pdf");
        let dest = source.with_file_name("Metrio-Packaged-Verify-RustWrite.pdf");
        let _ = fs::remove_file(&dest);
        write_user_selected_pdf(dest.to_string_lossy().to_string(), bytes).expect("write");
        let written = fs::read(&dest).expect("read written");
        assert!(written.starts_with(b"%PDF"));
        assert!(written.len() > 1000);
        let _ = fs::remove_file(&dest);
    }
}
