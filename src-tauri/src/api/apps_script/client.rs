use super::security::{
    is_allowed_web_app_host, now_millis, random_nonce, sign_request, validate_web_app_url,
};
use crate::api::error::ApiError;
use reqwest::redirect::Policy;
use serde_json::Value;
use std::time::Duration;

const REQUEST_VERSION: u32 = 1;

pub async fn invoke_action(
    web_app_url: &str,
    bridge_secret: &str,
    action: &str,
    payload: Value,
    timeout: Duration,
) -> Result<Value, ApiError> {
    let url = validate_web_app_url(web_app_url)
        .map_err(|message| ApiError::new("apps_script_config_error", message))?;

    if bridge_secret.trim().is_empty() {
        return Err(ApiError::new(
            "apps_script_not_configured",
            "Apps Script connection key is not configured.",
        ));
    }

    let timestamp = now_millis();
    let nonce = random_nonce();
    let signature = sign_request(bridge_secret, timestamp, &nonce, action, &payload);

    let body = serde_json::json!({
        "version": REQUEST_VERSION,
        "action": action,
        "timestamp": timestamp,
        "nonce": nonce,
        "payload": payload,
        "signature": signature,
    });

    let client = reqwest::Client::builder()
        .redirect(Policy::custom(|attempt| {
            if attempt.previous().len() >= 5 {
                return attempt.stop();
            }
            let next = attempt.url();
            let host = next.host_str().unwrap_or("");
            if next.scheme() == "https" && is_allowed_web_app_host(host) {
                attempt.follow()
            } else {
                attempt.stop()
            }
        }))
        .timeout(timeout)
        .build()
        .map_err(|e| ApiError::new("apps_script_network_error", e.to_string()))?;

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| map_transport_error(e))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| ApiError::new("apps_script_network_error", e.to_string()))?;

    if status < 200 || status >= 300 {
        return Err(map_http_error(status, &text));
    }

    let json: Value = serde_json::from_str(&text).map_err(|_| {
        ApiError::new(
            "apps_script_parse_error",
            "Apps Script returned an unreadable response.",
        )
    })?;

    if json.get("ok").and_then(|v| v.as_bool()) != Some(true) {
        let code = json
            .get("error")
            .and_then(|e| e.get("code"))
            .and_then(|v| v.as_str())
            .unwrap_or("apps_script_error");
        let message = json
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Apps Script request failed.");
        return Err(map_script_error(code, message, status));
    }

    Ok(json.get("data").cloned().unwrap_or(Value::Null))
}

fn map_transport_error(error: reqwest::Error) -> ApiError {
    if error.is_timeout() {
        return ApiError::new(
            "apps_script_timeout",
            "Apps Script request timed out. Try again.",
        );
    }
    ApiError::new(
        "apps_script_network_error",
        "Could not reach the Apps Script Web App.",
    )
}

fn map_http_error(status: u16, text: &str) -> ApiError {
    if text.trim_start().starts_with('<') {
        return ApiError::new(
            "apps_script_unavailable",
            "Apps Script deployment is unavailable or returned HTML instead of JSON.",
        )
        .with_status(status);
    }
    ApiError::new(
        "apps_script_http_error",
        crate::api::error::sanitize_body(text),
    )
    .with_status(status)
}

fn map_script_error(code: &str, message: &str, status: u16) -> ApiError {
    let mapped_code = match code {
        "invalid_signature" | "bridge_not_configured" => "apps_script_invalid_key",
        "timestamp_expired" | "replay_detected" | "invalid_nonce" => "apps_script_auth_error",
        "mail_quota_exceeded" => "apps_script_mail_quota",
        "invalid_action" | "invalid_payload" | "invalid_email" | "batch_too_large" => {
            "apps_script_request_error"
        }
        _ => "apps_script_error",
    };
    ApiError::new(mapped_code, message).with_status(status)
}

pub fn timeout_for_action(action: &str) -> Duration {
    match action {
        "ping" => Duration::from_secs(15),
        "createForm" => Duration::from_secs(30),
        "sendBatch" => Duration::from_secs(60),
        "sendTestEmail" => Duration::from_secs(30),
        "listResponses" => Duration::from_secs(30),
        _ => Duration::from_secs(30),
    }
}

#[cfg(test)]
mod tests {
    use crate::api::apps_script::security::canonical_json;

    #[test]
    fn canonical_json_matches_security_module() {
        let payload = serde_json::json!({"title": "Metrio"});
        assert_eq!(canonical_json(&payload), r#"{"title":"Metrio"}"#);
    }
}
