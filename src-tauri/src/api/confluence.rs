use super::credentials::{read_secret, JIRA_TOKEN_KEY};
use super::error::{sanitize_body, ApiError};
use super::jira::{jira_auth_header, status_error_code, JiraConfig};
use reqwest::header::AUTHORIZATION;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::OnceLock;
use std::time::Duration;

const TIMEOUT_SECS: u64 = 30;

static CONFLUENCE_HTTP: OnceLock<Client> = OnceLock::new();

fn shared_http_client() -> Result<&'static Client, String> {
    if let Some(client) = CONFLUENCE_HTTP.get() {
        return Ok(client);
    }
    let client = Client::builder()
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())?;
    let _ = CONFLUENCE_HTTP.set(client);
    Ok(CONFLUENCE_HTTP.get().expect("Confluence HTTP client initialized"))
}

fn normalize_base_url(url: &str) -> String {
    url.trim().trim_end_matches('/').to_string()
}

pub(crate) fn confluence_api_base(jira_base_url: &str) -> String {
    format!("{}/wiki/rest/api", normalize_base_url(jira_base_url))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfluencePageSummary {
    pub id: String,
    pub title: String,
    pub space_key: Option<String>,
    pub space_name: Option<String>,
    pub url: String,
    pub updated_at: Option<String>,
    pub excerpt: Option<String>,
}

#[tauri::command]
pub async fn confluence_test_connection(config: JiraConfig) -> Result<Value, ApiError> {
    let base = confluence_api_base(&config.base_url);
    let endpoint = format!("{}/user/current", base);
    confluence_get(&config, &endpoint).await
}

#[tauri::command]
pub async fn confluence_search_pages(
    config: JiraConfig,
    cql: String,
    limit: u32,
) -> Result<Vec<ConfluencePageSummary>, ApiError> {
    let safe_limit = limit.clamp(1, 25);
    let encoded = urlencoding::encode(cql.trim());
    let base = confluence_api_base(&config.base_url);
    let endpoint = format!(
        "{}/content/search?cql={}&limit={}&expand=space,history.lastUpdated",
        base, encoded, safe_limit
    );
    let value = confluence_get(&config, &endpoint).await?;
    let results = value
        .get("results")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let site = normalize_base_url(&config.base_url);
    let mut pages = Vec::new();
    for item in results {
        let id = item.get("id").and_then(|v| v.as_str()).unwrap_or_default();
        if id.is_empty() {
            continue;
        }
        let title = item
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled")
            .to_string();
        let space_key = item
            .pointer("/space/key")
            .and_then(|v| v.as_str())
            .map(str::to_string);
        let space_name = item
            .pointer("/space/name")
            .and_then(|v| v.as_str())
            .map(str::to_string);
        let updated_at = item
            .pointer("/history/lastUpdated/when")
            .and_then(|v| v.as_str())
            .map(str::to_string);
        let webui = item
            .pointer("/_links/webui")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let url = if webui.starts_with("http") {
            webui.to_string()
        } else {
            format!("{}{}", site, webui)
        };
        pages.push(ConfluencePageSummary {
            id: id.to_string(),
            title,
            space_key,
            space_name,
            url,
            updated_at,
            excerpt: None,
        });
    }
    Ok(pages)
}

async fn confluence_get(config: &JiraConfig, url: &str) -> Result<Value, ApiError> {
    let token = read_secret(JIRA_TOKEN_KEY).map_err(|e| ApiError::new(e.code, e.message))?;
    let client = shared_http_client().map_err(|e| ApiError::new("client_error", e))?;
    let response = client
        .get(url)
        .header(AUTHORIZATION, jira_auth_header(&config.email, &token))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| ApiError::new("network_error", e.to_string()))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| ApiError::new("read_error", e.to_string()))?;

    if status < 200 || status >= 300 {
        return Err(
            ApiError::new(status_error_code(status), sanitize_body(&text)).with_status(status),
        );
    }

    if text.trim().is_empty() {
        return Ok(Value::Object(serde_json::Map::new()));
    }

    serde_json::from_str(&text).map_err(|e| ApiError::new("parse_error", e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_confluence_api_base_from_jira_site() {
        assert_eq!(
            confluence_api_base("https://altenar.atlassian.net/"),
            "https://altenar.atlassian.net/wiki/rest/api"
        );
    }
}
