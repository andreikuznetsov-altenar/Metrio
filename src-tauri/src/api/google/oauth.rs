use super::config::{google_oauth_client_id, GOOGLE_OAUTH_SCOPES};
use super::credentials::{
    delete_google_credentials, get_access_token, has_refresh_token, read_account_email,
    store_account_email, store_refresh_token, GoogleAuthState,
};
use crate::api::error::ApiError;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

pub struct GoogleTokenState {
    pub access_token: Option<String>,
    pub expires_at: u64,
}

impl Default for GoogleTokenState {
    fn default() -> Self {
        Self {
            access_token: None,
            expires_at: 0,
        }
    }
}

struct PendingOAuthAttempt {
    attempt_id: u64,
    verifier: String,
}

static AUTH_ATTEMPT_COUNTER: AtomicU64 = AtomicU64::new(0);
static PENDING_OAUTH: Mutex<Option<PendingOAuthAttempt>> = Mutex::new(None);

fn pkce_pair() -> (String, String) {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let verifier = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes);
    let digest = Sha256::digest(verifier.as_bytes());
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest);
    (verifier, challenge)
}

fn random_state() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

fn parse_query_param(query: &str, key: &str) -> Option<String> {
    query
        .split('&')
        .find_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            let k = parts.next()?;
            let v = parts.next()?;
            if k == key {
                Some(
                    urlencoding::decode(v)
                        .map(|s| s.to_string())
                        .unwrap_or(v.to_string()),
                )
            } else {
                None
            }
        })
}

fn write_html_response(stream: &mut std::net::TcpStream, title: &str, message: &str) {
    let body = format!(
        "<html><body style=\"font-family:sans-serif;padding:24px\"><h1>{}</h1><p>{}</p></body></html>",
        title,
        message
    );
    let http_response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(http_response.as_bytes());
    let _ = stream.flush();
}

fn accept_oauth_callback(
    listener: TcpListener,
    expected_attempt: u64,
    expected_state: &str,
    timeout: Duration,
) -> Result<String, ApiError> {
    listener
        .set_nonblocking(true)
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;

    let deadline = Instant::now() + timeout;

    while Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buffer = [0u8; 8192];
                let read = stream
                    .read(&mut buffer)
                    .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;
                let request = String::from_utf8_lossy(&buffer[..read]);
                let path = request
                    .lines()
                    .next()
                    .and_then(|line| line.split_whitespace().nth(1))
                    .unwrap_or("");

                let query = path.split('?').nth(1).unwrap_or("");

                if let Some(error) = parse_query_param(query, "error") {
                    let description = parse_query_param(query, "error_description")
                        .unwrap_or_else(|| "Authorization was not completed.".to_string());
                    let (title, message) = if error == "access_denied" {
                        (
                            "Google connection cancelled",
                            "You can close this window and return to Metrio.",
                        )
                    } else {
                        (
                            "Google sign-in failed",
                            "You can close this window and return to Metrio.",
                        )
                    };
                    write_html_response(&mut stream, title, message);
                    if error == "access_denied" {
                        return Err(ApiError::new(
                            "oauth_cancelled",
                            "Google connection was cancelled.",
                        ));
                    }
                    return Err(ApiError::new(
                        "oauth_error",
                        format!("{}: {}", error, description),
                    ));
                }

                let returned_state = parse_query_param(query, "state");
                let pending = PENDING_OAUTH
                    .lock()
                    .map_err(|_| ApiError::new("oauth_error", "OAuth lock poisoned"))?;

                if pending.as_ref().map(|p| p.attempt_id) != Some(expected_attempt) {
                    write_html_response(
                        &mut stream,
                        "Sign-in expired",
                        "This authorization attempt is no longer active. Return to Metrio and try again.",
                    );
                    return Err(ApiError::new(
                        "oauth_error",
                        "Stale OAuth callback rejected",
                    ));
                }

                if returned_state.as_deref() != Some(expected_state) {
                    write_html_response(
                        &mut stream,
                        "Sign-in failed",
                        "Security validation failed. Return to Metrio and try again.",
                    );
                    return Err(ApiError::new(
                        "oauth_error",
                        "OAuth state validation failed",
                    ));
                }

                let code = parse_query_param(query, "code");
                write_html_response(
                    &mut stream,
                    "Google account connected",
                    "You can close this window and return to Metrio.",
                );

                return code.ok_or_else(|| {
                    ApiError::new("oauth_error", "Missing authorization code")
                });
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => return Err(ApiError::new("oauth_error", e.to_string())),
        }
    }

    Err(ApiError::new(
        "oauth_error",
        "Google authorization timed out. Try again from Metrio.",
    ))
}

#[derive(Debug, Serialize)]
pub struct GoogleAuthStatus {
    pub connected: bool,
    pub account_email: String,
    pub forms_connected: bool,
    pub gmail_connected: bool,
    pub oauth_client_configured: bool,
}

async fn probe_authed_endpoint(
    state: &State<'_, GoogleAuthState>,
    client_id: &str,
    url: &str,
    allow_not_found: bool,
) -> bool {
    match get_access_token(state, client_id).await {
        Ok(token) => {
            let response = reqwest::Client::new()
                .get(url)
                .header("Authorization", format!("Bearer {}", token))
                .header("Accept", "application/json")
                .send()
                .await;
            match response {
                Ok(res) => {
                    let status = res.status().as_u16();
                    if status >= 200 && status < 300 {
                        return true;
                    }
                    allow_not_found && status == 404
                }
                Err(_) => false,
            }
        }
        Err(_) => false,
    }
}

fn resolve_oauth_client_id(client_id: Option<String>) -> String {
    client_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(google_oauth_client_id)
}

#[derive(Debug, Deserialize)]
pub struct GoogleGetStatusParams {
    pub client_id: Option<String>,
}

#[tauri::command]
pub async fn google_get_status(
    state: State<'_, GoogleAuthState>,
    params: GoogleGetStatusParams,
) -> Result<GoogleAuthStatus, ApiError> {
    let client_id = resolve_oauth_client_id(params.client_id);
    let oauth_client_configured = !client_id.trim().is_empty();
    let linked = has_refresh_token();
    let account_email = read_account_email().unwrap_or_default();

    if !linked {
        return Ok(GoogleAuthStatus {
            connected: false,
            account_email,
            forms_connected: false,
            gmail_connected: false,
            oauth_client_configured,
        });
    }

    if client_id.trim().is_empty() {
        return Ok(GoogleAuthStatus {
            connected: false,
            account_email,
            forms_connected: false,
            gmail_connected: false,
            oauth_client_configured,
        });
    }

    let token_ok = get_access_token(&state, &client_id).await.is_ok();
    if !token_ok {
        return Ok(GoogleAuthStatus {
            connected: false,
            account_email,
            forms_connected: false,
            gmail_connected: false,
            oauth_client_configured,
        });
    }

    let gmail_connected = probe_authed_endpoint(
        &state,
        &client_id,
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        false,
    )
    .await;
    let forms_connected = probe_authed_endpoint(
        &state,
        &client_id,
        "https://forms.googleapis.com/v1/forms/metrio_capability_probe",
        true,
    )
    .await;

    Ok(GoogleAuthStatus {
        connected: true,
        account_email,
        forms_connected,
        gmail_connected,
        oauth_client_configured,
    })
}

#[derive(Debug, Deserialize)]
pub struct GoogleOAuthConnectParams {
    pub client_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GoogleOAuthConnectResult {
    pub account_email: String,
}

#[tauri::command]
pub async fn google_oauth_connect(
    state: State<'_, GoogleAuthState>,
    params: GoogleOAuthConnectParams,
) -> Result<GoogleOAuthConnectResult, ApiError> {
    let client_id = resolve_oauth_client_id(params.client_id);

    if client_id.trim().is_empty() {
        return Err(ApiError::new(
            "oauth_error",
            "Google OAuth Client ID is not configured for this build.",
        ));
    }

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;
    let port = listener
        .local_addr()
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);
    let (verifier, challenge) = pkce_pair();
    let oauth_state = random_state();
    let attempt_id = AUTH_ATTEMPT_COUNTER.fetch_add(1, Ordering::SeqCst) + 1;

    {
        let mut pending = PENDING_OAUTH
            .lock()
            .map_err(|_| ApiError::new("oauth_error", "OAuth lock poisoned"))?;
        *pending = Some(PendingOAuthAttempt {
            attempt_id,
            verifier: verifier.clone(),
        });
    }

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent&state={}",
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(GOOGLE_OAUTH_SCOPES),
        urlencoding::encode(&challenge),
        urlencoding::encode(&oauth_state),
    );

    tauri::async_runtime::spawn(async move {
        if let Err(e) = open::that(&auth_url) {
            eprintln!("Failed to open browser for Google OAuth: {}", e);
        }
    });

    let code = tauri::async_runtime::spawn_blocking(move || {
        accept_oauth_callback(listener, attempt_id, &oauth_state, Duration::from_secs(300))
    })
    .await
    .map_err(|e| ApiError::new("oauth_error", e.to_string()))??;

    let verifier = {
        let pending = PENDING_OAUTH
            .lock()
            .map_err(|_| ApiError::new("oauth_error", "OAuth lock poisoned"))?;
        pending
            .as_ref()
            .filter(|p| p.attempt_id == attempt_id)
            .map(|p| p.verifier.clone())
            .ok_or_else(|| ApiError::new("oauth_error", "OAuth attempt expired"))?
    };

    {
        let mut pending = PENDING_OAUTH
            .lock()
            .map_err(|_| ApiError::new("oauth_error", "OAuth lock poisoned"))?;
        if pending.as_ref().map(|p| p.attempt_id) == Some(attempt_id) {
            *pending = None;
        }
    }

    let client = reqwest::Client::new();
    let token_response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", client_id.as_str()),
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;

    let status = token_response.status().as_u16();
    let text = token_response
        .text()
        .await
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;

    if status < 200 || status >= 300 {
        return Err(
            ApiError::new("oauth_error", crate::api::error::sanitize_body(&text)).with_status(status),
        );
    }

    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;

    let refresh = json
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::new("oauth_error", "Google did not return a refresh token"))?;
    let access = json
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::new("oauth_error", "Missing access_token"))?;
    let expires_in = json.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3600);

    store_refresh_token(refresh).map_err(|e| ApiError::new("oauth_error", e))?;

    {
        let mut guard = state
            .tokens
            .lock()
            .map_err(|_| ApiError::new("oauth_error", "Google auth lock poisoned"))?;
        guard.access_token = Some(access.to_string());
        guard.expires_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_secs()
            + expires_in;
    }

    let userinfo = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .header("Authorization", format!("Bearer {}", access))
        .send()
        .await
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?
        .text()
        .await
        .map_err(|e| ApiError::new("oauth_error", e.to_string()))?;

    let email = serde_json::from_str::<serde_json::Value>(&userinfo)
        .ok()
        .and_then(|v| {
            v.get("email")
                .and_then(|e| e.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_default();

    if !email.is_empty() {
        store_account_email(&email).map_err(|e| ApiError::new("oauth_error", e))?;
    }

    Ok(GoogleOAuthConnectResult { account_email: email })
}

#[tauri::command]
pub fn google_disconnect(state: State<GoogleAuthState>) -> Result<(), ApiError> {
    delete_google_credentials().map_err(|e| ApiError::new("oauth_error", e))?;
    let mut guard = state
        .tokens
        .lock()
        .map_err(|_| ApiError::new("oauth_error", "Google auth lock poisoned"))?;
    guard.access_token = None;
    guard.expires_at = 0;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_query_param_decodes_values() {
        assert_eq!(
            parse_query_param("state=abc123&code=xyz", "state"),
            Some("abc123".to_string())
        );
    }

    #[test]
    fn oauth_state_is_random_each_call() {
        let a = random_state();
        let b = random_state();
        assert_ne!(a, b);
        assert!(a.len() >= 16);
    }

    #[test]
    fn resolve_oauth_client_id_prefers_non_empty_override() {
        assert_eq!(
            resolve_oauth_client_id(Some("override.apps.googleusercontent.com".to_string())),
            "override.apps.googleusercontent.com"
        );
    }

    #[test]
    fn resolve_oauth_client_id_ignores_blank_override() {
        let resolved = resolve_oauth_client_id(Some("   ".to_string()));
        assert_eq!(resolved, google_oauth_client_id());
    }
}
