use super::credentials::{google_authed_request, GoogleAuthState};
use crate::api::error::ApiError;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct GoogleFormsCreateParams {
    pub client_id: String,
    pub title: String,
}

#[tauri::command]
pub async fn google_forms_create(
    state: State<'_, GoogleAuthState>,
    params: GoogleFormsCreateParams,
) -> Result<Value, ApiError> {
    let body = json!({
        "info": {
            "title": params.title
        }
    });
    google_authed_request(
        &state,
        &params.client_id,
        Method::POST,
        "https://forms.googleapis.com/v1/forms",
        Some(body),
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct GoogleFormsUpdateParams {
    pub client_id: String,
    pub form_id: String,
    pub requests: Value,
}

#[tauri::command]
pub async fn google_forms_update(
    state: State<'_, GoogleAuthState>,
    params: GoogleFormsUpdateParams,
) -> Result<Value, ApiError> {
    let url = format!(
        "https://forms.googleapis.com/v1/forms/{}:batchUpdate",
        urlencoding::encode(&params.form_id)
    );
    google_authed_request(
        &state,
        &params.client_id,
        Method::POST,
        &url,
        Some(json!({ "requests": params.requests })),
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct GoogleFormsPublishParams {
    pub client_id: String,
    pub form_id: String,
    pub email_collection_type: String,
    pub accept_responses: bool,
}

/// Build the request body for Forms API setPublishSettings.
pub fn build_publish_settings_body(is_published: bool, is_accepting_responses: bool) -> Value {
    json!({
        "publishSettings": {
            "publishState": {
                "isPublished": is_published,
                "isAcceptingResponses": is_accepting_responses
            }
        },
        "updateMask": "publishState"
    })
}

#[tauri::command]
pub async fn google_forms_publish(
    state: State<'_, GoogleAuthState>,
    params: GoogleFormsPublishParams,
) -> Result<Value, ApiError> {
    let url = format!(
        "https://forms.googleapis.com/v1/forms/{}:batchUpdate",
        urlencoding::encode(&params.form_id)
    );
    let requests = json!([{
        "updateSettings": {
            "settings": {
                "quizSettings": { "isQuiz": false }
            },
            "updateMask": "quizSettings.isQuiz"
        }
    }]);

    let _ = google_authed_request(
        &state,
        &params.client_id,
        Method::POST,
        &url,
        Some(json!({ "requests": requests })),
    )
    .await?;

    let publish_url = format!(
        "https://forms.googleapis.com/v1/forms/{}:setPublishSettings",
        urlencoding::encode(&params.form_id)
    );
    let publish_body = build_publish_settings_body(true, params.accept_responses);
    google_authed_request(
        &state,
        &params.client_id,
        Method::POST,
        &publish_url,
        Some(publish_body),
    )
    .await?;

    let email_url = format!(
        "https://forms.googleapis.com/v1/forms/{}:batchUpdate",
        urlencoding::encode(&params.form_id)
    );
    google_authed_request(
        &state,
        &params.client_id,
        Method::POST,
        &email_url,
        Some(json!({
            "requests": [{
                "updateSettings": {
                    "settings": {
                        "emailCollectionType": params.email_collection_type
                    },
                    "updateMask": "emailCollectionType"
                }
            }]
        })),
    )
    .await
}

#[derive(Debug, Deserialize)]
pub struct GoogleFormsListResponsesParams {
    pub client_id: String,
    pub form_id: String,
    pub filter: Option<String>,
    pub page_token: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GoogleFormsListResponsesResult {
    pub responses: Value,
    pub next_page_token: Option<String>,
}

#[tauri::command]
pub async fn google_forms_list_responses(
    state: State<'_, GoogleAuthState>,
    params: GoogleFormsListResponsesParams,
) -> Result<GoogleFormsListResponsesResult, ApiError> {
    let mut url = format!(
        "https://forms.googleapis.com/v1/forms/{}/responses",
        urlencoding::encode(&params.form_id)
    );
    let mut query = Vec::new();
    if let Some(filter) = &params.filter {
        query.push(format!("filter={}", urlencoding::encode(filter)));
    }
    if let Some(token) = &params.page_token {
        query.push(format!("pageToken={}", urlencoding::encode(token)));
    }
    if !query.is_empty() {
        url.push('?');
        url.push_str(&query.join("&"));
    }

    let page = google_authed_request(&state, &params.client_id, Method::GET, &url, None).await?;
    Ok(GoogleFormsListResponsesResult {
        responses: page.get("responses").cloned().unwrap_or(Value::Array(vec![])),
        next_page_token: page
            .get("nextPageToken")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn publish_settings_body_uses_publish_state_and_mask() {
        let body = build_publish_settings_body(true, true);
        assert_eq!(
            body.get("updateMask").and_then(|v| v.as_str()),
            Some("publishState")
        );
        let publish_state = body
            .pointer("/publishSettings/publishState")
            .expect("publishState");
        assert_eq!(publish_state.get("isPublished"), Some(&json!(true)));
        assert_eq!(publish_state.get("isAcceptingResponses"), Some(&json!(true)));
        assert!(body.pointer("/publishSettings/isPublished").is_none());
    }

    #[test]
    fn publish_settings_close_requires_both_fields() {
        let body = build_publish_settings_body(true, false);
        let publish_state = body
            .pointer("/publishSettings/publishState")
            .expect("publishState");
        assert_eq!(publish_state.get("isPublished"), Some(&json!(true)));
        assert_eq!(publish_state.get("isAcceptingResponses"), Some(&json!(false)));
    }

    #[test]
    fn publish_settings_does_not_erase_description() {
        let body = build_publish_settings_body(true, true);
        assert!(body.get("info").is_none());
        assert!(body.pointer("/publishSettings/description").is_none());
    }
}
