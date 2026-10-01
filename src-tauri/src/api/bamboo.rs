use super::credentials::{read_secret, BAMBOO_TOKEN_KEY};
use super::error::{sanitize_body, ApiError};
use reqwest::header::AUTHORIZATION;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

const TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Deserialize, Clone)]
pub struct BambooConfig {
    pub subdomain: String,
}

fn http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())
}

fn bamboo_auth_header(token: &str) -> String {
    use base64::Engine;
    let raw = format!("{}:x", token);
    format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(raw))
}

fn bamboo_base_url(subdomain: &str) -> String {
    format!(
        "https://api.bamboohr.com/api/gateway.php/{}/v1",
        urlencoding::encode(subdomain.trim())
    )
}

/// Only allow relative Bamboo paths or absolute URLs on the expected gateway host.
pub fn validate_bamboo_request_url(subdomain: &str, path: &str) -> Result<String, ApiError> {
    let trimmed_subdomain = subdomain.trim();
    if trimmed_subdomain.is_empty() {
        return Err(ApiError::new("bamboo_config_error", "Bamboo subdomain is required"));
    }

    if path.starts_with("http://") || path.starts_with("https://") {
        let expected_prefix = format!(
            "https://api.bamboohr.com/api/gateway.php/{}/v1",
            urlencoding::encode(trimmed_subdomain)
        );
        if !path.starts_with(&expected_prefix) {
            return Err(ApiError::new(
                "bamboo_security_error",
                "Rejected unexpected Bamboo pagination URL host",
            )
            .with_url(path.to_string()));
        }
        return Ok(path.to_string());
    }

    if !path.starts_with('/') {
        return Err(ApiError::new(
            "bamboo_security_error",
            "Bamboo request path must be relative or on the expected gateway host",
        ));
    }

    Ok(format!("{}{}", bamboo_base_url(trimmed_subdomain), path))
}

async fn bamboo_request(config: &BambooConfig, path: &str) -> Result<Value, ApiError> {
    let token = read_secret(BAMBOO_TOKEN_KEY).map_err(|e| ApiError::new(e.code, e.message))?;
    let normalized = validate_bamboo_request_url(&config.subdomain, path)?;
    let client = http_client().map_err(|e| ApiError::new("client_error", e))?;

    let response = client
        .get(&normalized)
        .header(AUTHORIZATION, bamboo_auth_header(&token))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| ApiError::new("network_error", e.to_string()).with_url(normalized.clone()))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| ApiError::new("read_error", e.to_string()).with_url(normalized.clone()))?;

    if status < 200 || status >= 300 {
        return Err(
            ApiError::new("bamboo_api_error", sanitize_body(&text))
                .with_status(status)
                .with_url(normalized),
        );
    }

    if text.trim().is_empty() {
        return Ok(Value::Object(serde_json::Map::new()));
    }

    serde_json::from_str(&text).map_err(|e| {
        ApiError::new("parse_error", e.to_string())
            .with_status(status)
            .with_url(normalized)
    })
}

fn next_page_path(value: &Value, fields: &str) -> Option<String> {
    if let Some(next) = value
        .get("meta")
        .and_then(|m| m.get("nextPageUrl"))
        .and_then(|v| v.as_str())
    {
        return Some(next.to_string());
    }
    if let Some(next) = value
        .get("_links")
        .and_then(|l| l.get("next"))
        .and_then(|n| n.get("href"))
        .and_then(|v| v.as_str())
    {
        return Some(next.to_string());
    }
    if let Some(cursor) = value
        .get("meta")
        .and_then(|m| m.get("nextCursor"))
        .and_then(|v| v.as_str())
    {
        return Some(format!(
            "/employees?onlyCurrent=true&fields={}&cursor={}",
            urlencoding::encode(fields),
            urlencoding::encode(cursor)
        ));
    }
    None
}

fn merge_page_records(target: &mut Vec<Value>, page: &Value) {
    if let Some(data) = page.get("data").and_then(|v| v.as_array()) {
        target.extend(data.iter().cloned());
        return;
    }
    if let Some(employees) = page.get("employees").and_then(|v| v.as_array()) {
        target.extend(employees.iter().cloned());
    }
}

#[tauri::command]
pub async fn bamboo_test_connection(config: BambooConfig) -> Result<Value, ApiError> {
    bamboo_request(&config, "/employees/directory").await
}

#[tauri::command]
pub async fn bamboo_get_directory(config: BambooConfig) -> Result<Value, ApiError> {
    bamboo_request(&config, "/employees/directory").await
}

#[derive(Debug, Deserialize)]
pub struct BambooListEmployeesParams {
    pub fields: String,
    #[serde(default)]
    pub page_path: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BambooListEmployeesResult {
    pub page: Value,
    pub next_page_path: Option<String>,
}

/// Real Bamboo List Employees — GET /employees (not /employees/directory).
#[tauri::command]
pub async fn bamboo_list_employees(
    config: BambooConfig,
    params: BambooListEmployeesParams,
) -> Result<BambooListEmployeesResult, ApiError> {
    let path = params.page_path.unwrap_or_else(|| {
        format!(
            "/employees?onlyCurrent=true&fields={}",
            urlencoding::encode(&params.fields)
        )
    });
    let page = bamboo_request(&config, &path).await?;
    let next = next_page_path(&page, &params.fields);
    Ok(BambooListEmployeesResult {
        page,
        next_page_path: next,
    })
}

#[derive(Debug, Deserialize)]
pub struct BambooListEmployeesAllParams {
    pub fields: String,
}

#[derive(Debug, Serialize)]
pub struct BambooListEmployeesAllResult {
    pub records: Vec<Value>,
    pub pages: u32,
}

#[tauri::command]
pub async fn bamboo_list_employees_all(
    config: BambooConfig,
    params: BambooListEmployeesAllParams,
) -> Result<BambooListEmployeesAllResult, ApiError> {
    let mut records: Vec<Value> = Vec::new();
    let fields = params.fields.clone();
    let mut page_path = Some(format!(
        "/employees?onlyCurrent=true&fields={}",
        urlencoding::encode(&fields)
    ));
    let mut pages = 0u32;

    while let Some(path) = page_path {
        pages += 1;
        let page = bamboo_request(&config, &path).await?;
        merge_page_records(&mut records, &page);
        page_path = next_page_path(&page, &fields);
        if pages > 200 {
            break;
        }
    }

    Ok(BambooListEmployeesAllResult { records, pages })
}

#[tauri::command]
pub async fn bamboo_get_employee(
    config: BambooConfig,
    employee_id: String,
    fields: String,
) -> Result<Value, ApiError> {
    bamboo_request(
        &config,
        &format!(
            "/employees/{}/?fields={}",
            urlencoding::encode(&employee_id),
            urlencoding::encode(&fields)
        ),
    )
    .await
}

#[tauri::command]
pub async fn bamboo_get_whos_out(
    config: BambooConfig,
    start: String,
    end: String,
) -> Result<Value, ApiError> {
    bamboo_request(
        &config,
        &format!(
            "/time_off/whos_out/?start={}&end={}",
            urlencoding::encode(&start),
            urlencoding::encode(&end)
        ),
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_relative_bamboo_paths() {
        let url = validate_bamboo_request_url("acme", "/employees?onlyCurrent=true")
            .expect("relative path");
        assert!(url.contains("api.bamboohr.com"));
        assert!(url.contains("/acme/v1/employees"));
    }

    #[test]
    fn rejects_unexpected_absolute_hosts() {
        let err = validate_bamboo_request_url(
            "acme",
            "https://evil.example.com/api/gateway.php/acme/v1/employees",
        )
        .expect_err("should reject");
        assert_eq!(err.code, "bamboo_security_error");
    }

    #[test]
    fn allows_expected_absolute_pagination_url() {
        let url = validate_bamboo_request_url(
            "acme",
            "https://api.bamboohr.com/api/gateway.php/acme/v1/employees?cursor=abc",
        )
        .expect("expected host");
        assert!(url.contains("cursor=abc"));
    }

    #[test]
    fn cursor_pagination_preserves_requested_fields() {
        let page = serde_json::json!({
            "meta": { "nextCursor": "cursor123" }
        });
        let next = next_page_path(&page, "firstName,lastName,workEmail").expect("next page");
        assert!(next.contains("fields=firstName%2ClastName%2CworkEmail"));
        assert!(next.contains("cursor=cursor123"));
    }
}
