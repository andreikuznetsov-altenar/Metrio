use super::credentials::{google_authed_request, GoogleAuthState};
use super::mime::build_raw_message;
use crate::api::error::ApiError;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct GoogleGmailSendParams {
    pub client_id: String,
    pub to: String,
    pub subject: String,
    pub html_body: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleGmailSendResult {
    pub message_id: String,
}

#[tauri::command]
pub async fn google_gmail_send(
    state: State<'_, GoogleAuthState>,
    params: GoogleGmailSendParams,
) -> Result<GoogleGmailSendResult, ApiError> {
    let raw = build_raw_message(&params.to, &params.subject, &params.html_body);
    let body = serde_json::json!({ "raw": raw });
    let result: Value = google_authed_request(
        &state,
        &params.client_id,
        Method::POST,
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        Some(body),
    )
    .await?;

    let message_id = result
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    Ok(GoogleGmailSendResult { message_id })
}
