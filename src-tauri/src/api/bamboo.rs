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

const BAMBOO_API_VERSIONS: &[&str] = &["v1", "v1_1", "v1_2"];

fn bamboo_base_url_version(subdomain: &str, version: &str) -> String {
    format!(
        "https://api.bamboohr.com/api/gateway.php/{}/{}",
        urlencoding::encode(subdomain.trim()),
        version
    )
}

fn normalize_bamboo_api_version(version: Option<&str>) -> Result<&'static str, ApiError> {
    let raw = version.unwrap_or("v1").trim();
    BAMBOO_API_VERSIONS
        .iter()
        .copied()
        .find(|v| *v == raw)
        .ok_or_else(|| {
            ApiError::new(
                "bamboo_config_error",
                format!("Unsupported Bamboo API version: {raw}"),
            )
        })
}

/// Only allow relative Bamboo paths or absolute URLs on the expected gateway host.
pub fn validate_bamboo_request_url(subdomain: &str, path: &str) -> Result<String, ApiError> {
    validate_bamboo_request_url_version(subdomain, "v1", path)
}

pub fn validate_bamboo_request_url_version(
    subdomain: &str,
    version: &str,
    path: &str,
) -> Result<String, ApiError> {
    let trimmed_subdomain = subdomain.trim();
    if trimmed_subdomain.is_empty() {
        return Err(ApiError::new("bamboo_config_error", "Bamboo subdomain is required"));
    }
    let api_version = normalize_bamboo_api_version(Some(version))?;

    if path.starts_with("http://") || path.starts_with("https://") {
        let gateway_root = format!(
            "https://api.bamboohr.com/api/gateway.php/{}",
            urlencoding::encode(trimmed_subdomain)
        );
        if !path.starts_with(&gateway_root) {
            return Err(ApiError::new(
                "bamboo_security_error",
                "Rejected unexpected Bamboo pagination URL host",
            )
            .with_url(path.to_string()));
        }
        let allowed = BAMBOO_API_VERSIONS.iter().any(|v| {
            path.starts_with(&format!("{gateway_root}/{v}/"))
                || path.starts_with(&format!("{gateway_root}/{v}?"))
                || path == format!("{gateway_root}/{v}")
        });
        if !allowed {
            return Err(ApiError::new(
                "bamboo_security_error",
                "Rejected unexpected Bamboo API version in URL",
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

    Ok(format!(
        "{}{}",
        bamboo_base_url_version(trimmed_subdomain, api_version),
        path
    ))
}

async fn bamboo_request(config: &BambooConfig, path: &str) -> Result<Value, ApiError> {
    bamboo_request_with(config, "v1", "GET", path, None).await
}

async fn bamboo_request_with(
    config: &BambooConfig,
    version: &str,
    method: &str,
    path: &str,
    body: Option<&Value>,
) -> Result<Value, ApiError> {
    let token = read_secret(BAMBOO_TOKEN_KEY).map_err(|e| ApiError::new(e.code, e.message))?;
    let normalized = validate_bamboo_request_url_version(&config.subdomain, version, path)?;
    let client = http_client().map_err(|e| ApiError::new("client_error", e))?;

    let mut request = match method {
        "GET" => client.get(&normalized),
        "POST" => client.post(&normalized),
        "PUT" => client.put(&normalized),
        "DELETE" => client.delete(&normalized),
        other => {
            return Err(ApiError::new(
                "bamboo_config_error",
                format!("Unsupported Bamboo HTTP method: {other}"),
            ));
        }
    };
    request = request
        .header(AUTHORIZATION, bamboo_auth_header(&token))
        .header("Accept", "application/json");
    if let Some(payload) = body {
        request = request
            .header("Content-Type", "application/json")
            .json(payload);
    }

    let response = request
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

async fn bamboo_binary_request(
    config: &BambooConfig,
    path: &str,
) -> Result<(String, Vec<u8>), ApiError> {
    use reqwest::header::CONTENT_TYPE;

    let token = read_secret(BAMBOO_TOKEN_KEY).map_err(|e| ApiError::new(e.code, e.message))?;
    let normalized = validate_bamboo_request_url(&config.subdomain, path)?;
    let client = http_client().map_err(|e| ApiError::new("client_error", e))?;

    let response = client
        .get(&normalized)
        .header(AUTHORIZATION, bamboo_auth_header(&token))
        .send()
        .await
        .map_err(|e| ApiError::new("network_error", e.to_string()).with_url(normalized.clone()))?;

    let status = response.status().as_u16();
    if status < 200 || status >= 300 {
        let text = response.text().await.unwrap_or_default();
        return Err(
            ApiError::new("bamboo_api_error", sanitize_body(&text))
                .with_status(status)
                .with_url(normalized),
        );
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();
    let bytes = response
        .bytes()
        .await
        .map_err(|e| ApiError::new("read_error", e.to_string()).with_url(normalized.clone()))?
        .to_vec();

    Ok((content_type, bytes))
}

#[derive(Debug, Serialize)]
pub struct BambooPhotoPayload {
    pub content_type: String,
    pub data_base64: String,
}

#[tauri::command]
pub async fn bamboo_get_employee_photo(
    config: BambooConfig,
    employee_id: String,
    photo_size: Option<String>,
) -> Result<BambooPhotoPayload, ApiError> {
    use base64::Engine;
    let size = photo_size.as_deref().unwrap_or("small");
    if size != "small" && size != "medium" {
        return Err(ApiError::new(
            "bamboo_config_error",
            "photo_size must be small or medium",
        ));
    }
    let path = format!(
        "/employees/{}/photo/{}",
        urlencoding::encode(employee_id.trim()),
        size
    );
    let (content_type, bytes) = bamboo_binary_request(&config, &path).await?;
    Ok(BambooPhotoPayload {
        content_type,
        data_base64: base64::engine::general_purpose::STANDARD.encode(bytes),
    })
}

fn goals_employee_path(employee_id: &str, suffix: &str) -> String {
    format!(
        "/performance/employees/{}{}",
        urlencoding::encode(employee_id.trim()),
        suffix
    )
}

fn normalize_goals_filter(filter: Option<&str>) -> &'static str {
    match filter.unwrap_or("status-inProgress") {
        "status-completed" => "status-completed",
        "status-closed" => "status-closed",
        "status-all" => "status-all",
        _ => "status-inProgress",
    }
}

#[derive(Debug, Deserialize)]
pub struct BambooGoalsListParams {
    pub employee_id: String,
    #[serde(default)]
    pub filter: Option<String>,
}

#[tauri::command]
pub async fn bamboo_list_goals(
    config: BambooConfig,
    params: BambooGoalsListParams,
) -> Result<Value, ApiError> {
    let filter = normalize_goals_filter(params.filter.as_deref());
    // Prefer Goals Aggregate v1_2 for list reads — includes milestone-based goals.
    let path = format!(
        "{}?filter={}",
        goals_employee_path(&params.employee_id, "/goals/aggregate"),
        urlencoding::encode(filter)
    );
    bamboo_request_with(&config, "v1_2", "GET", &path, None).await
}

#[derive(Debug, Deserialize)]
pub struct BambooGoalsEmployeeParams {
    pub employee_id: String,
}

#[tauri::command]
pub async fn bamboo_can_create_goals(
    config: BambooConfig,
    params: BambooGoalsEmployeeParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "GET",
        &goals_employee_path(&params.employee_id, "/goals/canCreateGoals"),
        None,
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct BambooGoalIdParams {
    pub employee_id: String,
    pub goal_id: String,
}

#[tauri::command]
pub async fn bamboo_get_goal_aggregate(
    config: BambooConfig,
    params: BambooGoalIdParams,
) -> Result<Value, ApiError> {
    // Singular goal aggregate: GET .../goals/{goalId}/aggregate
    bamboo_request_with(
        &config,
        "v1",
        "GET",
        &goals_employee_path(
            &params.employee_id,
            &format!(
                "/goals/{}/aggregate",
                urlencoding::encode(params.goal_id.trim())
            ),
        ),
        None,
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct BambooCreateGoalParams {
    pub employee_id: String,
    pub body: Value,
}

#[tauri::command]
pub async fn bamboo_create_goal(
    config: BambooConfig,
    params: BambooCreateGoalParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "POST",
        &goals_employee_path(&params.employee_id, "/goals"),
        Some(&params.body),
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct BambooUpdateGoalParams {
    pub employee_id: String,
    pub goal_id: String,
    pub body: Value,
}

#[tauri::command]
pub async fn bamboo_update_goal(
    config: BambooConfig,
    params: BambooUpdateGoalParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1_1",
        "PUT",
        &goals_employee_path(
            &params.employee_id,
            &format!(
                "/goals/{}",
                urlencoding::encode(params.goal_id.trim())
            ),
        ),
        Some(&params.body),
    )
    .await
}

#[tauri::command]
pub async fn bamboo_update_goal_progress(
    config: BambooConfig,
    params: BambooUpdateGoalParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "PUT",
        &goals_employee_path(
            &params.employee_id,
            &format!(
                "/goals/{}/progress",
                urlencoding::encode(params.goal_id.trim())
            ),
        ),
        Some(&params.body),
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct BambooUpdateMilestoneProgressParams {
    pub employee_id: String,
    pub goal_id: String,
    pub milestone_id: String,
    pub body: Value,
}

#[tauri::command]
pub async fn bamboo_update_goal_milestone_progress(
    config: BambooConfig,
    params: BambooUpdateMilestoneProgressParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "PUT",
        &goals_employee_path(
            &params.employee_id,
            &format!(
                "/goals/{}/milestones/{}",
                urlencoding::encode(params.goal_id.trim()),
                urlencoding::encode(params.milestone_id.trim())
            ),
        ),
        Some(&params.body),
    )
    .await
}

#[tauri::command]
pub async fn bamboo_goal_share_options(
    config: BambooConfig,
    params: BambooGoalsEmployeeParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "GET",
        &goals_employee_path(&params.employee_id, "/goals/shareOptions"),
        None,
    )
    .await
}

#[tauri::command]
pub async fn bamboo_goal_alignment_options(
    config: BambooConfig,
    params: BambooGoalsEmployeeParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "GET",
        &goals_employee_path(&params.employee_id, "/goals/alignmentOptions"),
        None,
    )
    .await
}

/// Optional delete for QA cleanup only when Bamboo permits.
#[tauri::command]
pub async fn bamboo_delete_goal(
    config: BambooConfig,
    params: BambooGoalIdParams,
) -> Result<Value, ApiError> {
    bamboo_request_with(
        &config,
        "v1",
        "DELETE",
        &goals_employee_path(
            &params.employee_id,
            &format!(
                "/goals/{}",
                urlencoding::encode(params.goal_id.trim())
            ),
        ),
        None,
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
    fn allows_versioned_relative_goals_paths() {
        let url = validate_bamboo_request_url_version(
            "acme",
            "v1_2",
            "/performance/employees/42/goals/7",
        )
        .expect("v1_2 path");
        assert!(url.contains("/acme/v1_2/performance/employees/42/goals/7"));
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
