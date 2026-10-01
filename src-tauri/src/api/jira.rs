use super::credentials::{read_secret, JIRA_TOKEN_KEY};
use super::error::{sanitize_body, ApiError};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, RETRY_AFTER};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::time::sleep;

const TIMEOUT_SECS: u64 = 30;
const MAX_ATTEMPTS: usize = 3;
const RETRY_BACKOFF_MS: [u64; 3] = [0, 250, 750];
const MAX_RETRY_AFTER_SECS: u64 = 5;

static JIRA_HTTP: OnceLock<Client> = OnceLock::new();

fn shared_http_client() -> Result<&'static Client, String> {
    if let Some(client) = JIRA_HTTP.get() {
        return Ok(client);
    }
    let client = Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())?;
    let _ = JIRA_HTTP.set(client);
    Ok(JIRA_HTTP.get().expect("Jira HTTP client initialized"))
}

#[derive(Debug, Deserialize, Clone)]
pub struct JiraConfig {
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub email: String,
}

pub(crate) fn jira_auth_header(email: &str, token: &str) -> String {
    use base64::Engine;
    let raw = format!("{}:{}", email.trim(), token);
    format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(raw))
}

fn normalize_base_url(url: &str) -> String {
    url.trim().trim_end_matches('/').to_string()
}

pub(crate) fn status_error_code(status: u16) -> &'static str {
    match status {
        401 => "jira_auth_invalid",
        403 => "jira_access_denied",
        404 => "jira_endpoint_error",
        408 => "timeout_error",
        429 => "rate_limited",
        500 | 502 | 503 | 504 => "jira_server_error",
        _ => "jira_api_error",
    }
}

pub(crate) fn is_retryable_status(status: u16) -> bool {
    matches!(status, 408 | 429 | 500 | 502 | 503 | 504)
}

pub(crate) fn is_retryable_transport_code(code: &str) -> bool {
    matches!(code, "network_error" | "timeout_error")
}

pub(crate) fn parse_retry_after_secs(headers: &reqwest::header::HeaderMap) -> Option<u64> {
    let value = headers.get(RETRY_AFTER)?.to_str().ok()?;
    let trimmed = value.trim();
    if let Ok(seconds) = trimmed.parse::<u64>() {
        return Some(seconds.min(MAX_RETRY_AFTER_SECS));
    }
    None
}

fn transport_error_code(error: &reqwest::Error) -> (&'static str, String) {
    if error.is_timeout() {
        return ("timeout_error", "Jira request timed out.".to_string());
    }
    let diagnostic = error.to_string();
    let code = if diagnostic.contains("certificate")
        || diagnostic.contains("Certificate")
        || diagnostic.contains("TLS")
        || diagnostic.contains("ssl")
        || diagnostic.contains("SSL")
    {
        "tls_error"
    } else {
        "network_error"
    };
    let message = if code == "tls_error" {
        "Metrio could not establish a secure connection to Jira."
    } else {
        "Metrio could not reach Jira."
    };
    (code, message.to_string())
}

async fn jira_request(
    config: &JiraConfig,
    endpoint: &str,
    method: reqwest::Method,
    body: Option<Value>,
) -> Result<Value, ApiError> {
    if method != reqwest::Method::GET {
        return jira_request_once(config, endpoint, method, body, 1).await;
    }

    for attempt in 0..MAX_ATTEMPTS {
        if attempt > 0 {
            let delay = RETRY_BACKOFF_MS[attempt];
            if delay > 0 {
                sleep(Duration::from_millis(delay)).await;
            }
        }

        match jira_request_once(config, endpoint, method.clone(), body.clone(), attempt + 1).await {
            Ok(value) => return Ok(value),
            Err(err) => {
                let retryable = err
                    .status
                    .map(is_retryable_status)
                    .unwrap_or_else(|| is_retryable_transport_code(&err.code));
                if !retryable || attempt + 1 >= MAX_ATTEMPTS {
                    return Err(err);
                }
            }
        }
    }

    Err(ApiError::new("network_error", "Jira request failed."))
}

async fn jira_request_once(
    config: &JiraConfig,
    endpoint: &str,
    method: reqwest::Method,
    body: Option<Value>,
    attempt: usize,
) -> Result<Value, ApiError> {
    let token = read_secret(JIRA_TOKEN_KEY).map_err(|e| ApiError::new(e.code, e.message))?;
    let base = normalize_base_url(&config.base_url);
    let url = format!("{}{}", base, endpoint);
    let client = shared_http_client().map_err(|e| ApiError::new("client_error", e))?;

    let mut req = client
        .request(method, &url)
        .header(AUTHORIZATION, jira_auth_header(&config.email, &token))
        .header("Accept", "application/json");

    if let Some(payload) = body {
        req = req
            .header(CONTENT_TYPE, "application/json")
            .json(&payload);
    }

    let response = match req.send().await {
        Ok(response) => response,
        Err(error) => {
            let (code, message) = transport_error_code(&error);
            return Err(
                ApiError::new(code, message)
                    .with_url(endpoint)
                    .with_status(if code == "timeout_error" { 408 } else { 0 }),
            );
        }
    };

    let status = response.status().as_u16();
    if is_retryable_status(status) && attempt < MAX_ATTEMPTS {
        if let Some(wait_secs) = parse_retry_after_secs(response.headers()) {
            sleep(Duration::from_secs(wait_secs)).await;
        }
    }

    let text = response
        .text()
        .await
        .map_err(|e| ApiError::new("read_error", e.to_string()).with_url(endpoint))?;

    if status < 200 || status >= 300 {
        let code = status_error_code(status);
        return Err(
            ApiError::new(code, sanitize_body(&text))
                .with_status(status)
                .with_url(endpoint),
        );
    }

    if text.trim().is_empty() {
        return Ok(Value::Object(serde_json::Map::new()));
    }

    serde_json::from_str(&text).map_err(|e| {
        ApiError::new("parse_error", e.to_string())
            .with_status(status)
            .with_url(endpoint)
    })
}

#[tauri::command]
pub async fn jira_test_connection(config: JiraConfig) -> Result<Value, ApiError> {
    jira_request(&config, "/rest/api/3/myself", reqwest::Method::GET, None).await
}

#[derive(Debug, Deserialize)]
pub struct JiraSearchParams {
    pub jql: String,
    pub fields: String,
    #[serde(rename = "maxResults")]
    pub max_results: u32,
    #[serde(rename = "nextPageToken", default)]
    pub next_page_token: Option<String>,
}

#[tauri::command]
pub async fn jira_search_issues(
    config: JiraConfig,
    params: JiraSearchParams,
) -> Result<Value, ApiError> {
    let mut query = format!(
        "jql={}&maxResults={}&fields={}",
        urlencoding::encode(&params.jql),
        params.max_results,
        urlencoding::encode(&params.fields),
    );
    if let Some(token) = &params.next_page_token {
        query.push_str(&format!("&nextPageToken={}", urlencoding::encode(token)));
    }
    jira_request(
        &config,
        &format!("/rest/api/3/search/jql?{}", query),
        reqwest::Method::GET,
        None,
    )
    .await
}

#[tauri::command]
pub async fn jira_fetch_changelog(
    config: JiraConfig,
    issue_key: String,
    start_at: u32,
    max_results: u32,
) -> Result<Value, ApiError> {
    let endpoint = format!(
        "/rest/api/3/issue/{}/changelog?startAt={}&maxResults={}",
        urlencoding::encode(&issue_key),
        start_at,
        max_results
    );
    jira_request(&config, &endpoint, reqwest::Method::GET, None).await
}

#[tauri::command]
pub async fn jira_get_issue(config: JiraConfig, issue_key: String, fields: String) -> Result<Value, ApiError> {
    let endpoint = format!(
        "/rest/api/3/issue/{}?fields={}",
        urlencoding::encode(&issue_key),
        urlencoding::encode(&fields)
    );
    jira_request(&config, &endpoint, reqwest::Method::GET, None).await
}

#[tauri::command]
pub async fn jira_search_users(config: JiraConfig, query: String) -> Result<Value, ApiError> {
    let endpoint = format!(
        "/rest/api/3/user/search?query={}",
        urlencoding::encode(&query)
    );
    jira_request(&config, &endpoint, reqwest::Method::GET, None).await
}

#[derive(Debug, Deserialize)]
pub struct JiraChangelogBatchParams {
    pub issue_keys: Vec<String>,
    #[serde(default = "default_concurrency")]
    pub concurrency: usize,
    pub max_results: u32,
}

fn default_concurrency() -> usize {
    4
}

#[derive(Debug, Serialize)]
pub struct ChangelogBatchItem {
    pub issue_key: String,
    pub values: Value,
    pub error: Option<ApiError>,
}

#[tauri::command]
pub async fn jira_fetch_changelogs_batch(
    config: JiraConfig,
    params: JiraChangelogBatchParams,
) -> Result<Vec<ChangelogBatchItem>, ApiError> {
    use futures_util::stream::{self, StreamExt};

    let concurrency = params.concurrency.clamp(1, 8);
    let config = config.clone();

    let results = stream::iter(params.issue_keys.into_iter())
        .map(|issue_key| {
            let cfg = config.clone();
            let max = params.max_results;
            async move {
                let mut all_values: Vec<Value> = Vec::new();
                let mut start_at = 0u32;
                loop {
                    match jira_fetch_changelog(cfg.clone(), issue_key.clone(), start_at, max).await {
                        Ok(page) => {
                            let values = page
                                .get("values")
                                .and_then(|v| v.as_array())
                                .cloned()
                                .unwrap_or_default();
                            let count = values.len();
                            all_values.extend(values);
                            start_at += count as u32;
                            let is_last = page.get("isLast").and_then(|v| v.as_bool()).unwrap_or(false);
                            let total = page.get("total").and_then(|v| v.as_u64());
                            if count == 0 || is_last {
                                break;
                            }
                            if let Some(t) = total {
                                if start_at as u64 >= t {
                                    break;
                                }
                            }
                        }
                        Err(err) => {
                            return ChangelogBatchItem {
                                issue_key,
                                values: Value::Array(vec![]),
                                error: Some(err),
                            };
                        }
                    }
                }
                ChangelogBatchItem {
                    issue_key,
                    values: Value::Array(all_values),
                    error: None,
                }
            }
        })
        .buffer_unordered(concurrency)
        .collect::<Vec<_>>()
        .await;

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;

    fn decode_basic_header(header: &str) -> String {
        let encoded = header.strip_prefix("Basic ").expect("basic prefix");
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .expect("valid base64");
        String::from_utf8(bytes).expect("utf8 credentials")
    }

    #[test]
    fn basic_auth_header_matches_email_colon_token() {
        let header = jira_auth_header("user@example.com", "abc123");
        assert_eq!(decode_basic_header(&header), "user@example.com:abc123");
    }

    #[test]
    fn basic_auth_preserves_special_token_characters() {
        let token = "ATATT3xFfGF0_ab-CD.EF+GH/IJ==";
        let header = jira_auth_header("user@example.com", token);
        assert_eq!(decode_basic_header(&header), format!("user@example.com:{}", token));
    }

    #[test]
    fn basic_auth_trims_email_whitespace() {
        let header = jira_auth_header("  user@example.com  ", "abc123");
        assert_eq!(decode_basic_header(&header), "user@example.com:abc123");
    }

    #[test]
    fn normalize_base_url_strips_trailing_slash() {
        assert_eq!(
            normalize_base_url("https://altenar.atlassian.net/"),
            "https://altenar.atlassian.net"
        );
    }

    #[test]
    fn classifies_retryable_status_codes() {
        assert!(is_retryable_status(429));
        assert!(is_retryable_status(503));
        assert!(!is_retryable_status(401));
        assert!(!is_retryable_status(404));
    }

    #[test]
    fn maps_status_to_error_codes() {
        assert_eq!(status_error_code(401), "jira_auth_invalid");
        assert_eq!(status_error_code(429), "rate_limited");
        assert_eq!(status_error_code(503), "jira_server_error");
    }

    #[test]
    fn caps_retry_after_header() {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(RETRY_AFTER, "120".parse().unwrap());
        assert_eq!(parse_retry_after_secs(&headers), Some(5));
        headers.insert(RETRY_AFTER, "2".parse().unwrap());
        assert_eq!(parse_retry_after_secs(&headers), Some(2));
    }
}
