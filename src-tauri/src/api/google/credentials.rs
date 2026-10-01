use super::oauth::GoogleTokenState;
use crate::api::credentials::{
    cache_remove, read_secret, GOOGLE_ACCOUNT_EMAIL_KEY, GOOGLE_REFRESH_TOKEN_KEY,
};
use crate::api::error::ApiError;
use crate::api::local_credentials::{delete_secret, exists, set_secret};
use reqwest::header::AUTHORIZATION;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::State;

pub struct GoogleAuthState {
    pub tokens: Mutex<GoogleTokenState>,
}

pub fn store_refresh_token(token: &str) -> Result<(), String> {
    set_secret(GOOGLE_REFRESH_TOKEN_KEY, token)
}

pub fn store_account_email(email: &str) -> Result<(), String> {
    set_secret(GOOGLE_ACCOUNT_EMAIL_KEY, email)
}

pub fn read_account_email() -> Result<String, String> {
    match read_secret(GOOGLE_ACCOUNT_EMAIL_KEY) {
        Ok(email) => Ok(email),
        Err(_) => Ok(String::new()),
    }
}

pub fn delete_google_credentials() -> Result<(), String> {
    delete_secret(GOOGLE_REFRESH_TOKEN_KEY)?;
    delete_secret(GOOGLE_ACCOUNT_EMAIL_KEY)?;
    cache_remove(GOOGLE_REFRESH_TOKEN_KEY);
    cache_remove(GOOGLE_ACCOUNT_EMAIL_KEY);
    Ok(())
}

pub fn has_refresh_token() -> bool {
    exists(GOOGLE_REFRESH_TOKEN_KEY)
}

async fn refresh_access_token(client_id: &str, refresh_token: &str) -> Result<(String, u64), ApiError> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
        ])
        .send()
        .await
        .map_err(|e| ApiError::new("google_token_error", e.to_string()))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| ApiError::new("google_token_error", e.to_string()))?;

    if status < 200 || status >= 300 {
        let sanitized = crate::api::error::sanitize_body(&text);
        if sanitized.contains("invalid_grant") {
            return Err(ApiError::new(
                "google_token_revoked",
                "Google refresh token is invalid or revoked.",
            )
            .with_status(status));
        }
        return Err(ApiError::new("google_token_error", sanitized).with_status(status));
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| ApiError::new("google_token_error", e.to_string()))?;
    let access = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::new("google_token_error", "Missing access_token"))?;
    let expires_in = json.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3600);
    Ok((access.to_string(), expires_in))
}

pub async fn get_access_token(
    state: &State<'_, GoogleAuthState>,
    client_id: &str,
) -> Result<String, ApiError> {
    {
        let guard = state.tokens.lock().map_err(|_| ApiError::new("lock_error", "Google auth lock poisoned"))?;
        if let Some(token) = &guard.access_token {
            if guard.expires_at > now_secs() + 30 {
                return Ok(token.clone());
            }
        }
    }

    let refresh = read_secret(GOOGLE_REFRESH_TOKEN_KEY).map_err(|e| ApiError::new(e.code, e.message))?;
    let (access, expires_in) = refresh_access_token(client_id, &refresh).await?;
    let expires_at = now_secs() + expires_in;

    {
        let mut guard = state.tokens.lock().map_err(|_| ApiError::new("lock_error", "Google auth lock poisoned"))?;
        guard.access_token = Some(access.clone());
        guard.expires_at = expires_at;
    }

    Ok(access)
}

pub async fn google_authed_request(
    state: &State<'_, GoogleAuthState>,
    client_id: &str,
    method: reqwest::Method,
    url: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, ApiError> {
    let token = get_access_token(state, client_id).await?;
    let client = reqwest::Client::new();
    let mut req = client
        .request(method, url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("Accept", "application/json");

    if let Some(payload) = body {
        req = req.json(&payload);
    }

    let response = req
        .send()
        .await
        .map_err(|e| ApiError::new("google_api_error", e.to_string()).with_url(url.to_string()))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| ApiError::new("google_api_error", e.to_string()).with_url(url.to_string()))?;

    if status < 200 || status >= 300 {
        return Err(
            ApiError::new("google_api_error", crate::api::error::sanitize_body(&text))
                .with_status(status)
                .with_url(url.to_string()),
        );
    }

    if text.trim().is_empty() {
        return Ok(serde_json::json!({}));
    }

    serde_json::from_str(&text).map_err(|e| {
        ApiError::new("google_parse_error", e.to_string())
            .with_status(status)
            .with_url(url.to_string())
    })
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}
