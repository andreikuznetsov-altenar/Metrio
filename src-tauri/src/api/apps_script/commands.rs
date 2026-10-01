use super::client::{invoke_action, timeout_for_action};
use super::security::validate_web_app_url;
use crate::api::credentials::{read_secret, APPS_SCRIPT_BRIDGE_SECRET_KEY};
use crate::api::error::ApiError;
use crate::api::google::credentials::GoogleAuthState;
use crate::api::local_credentials::{delete_secret, exists, set_secret};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct AppsScriptConnectParams {
    pub web_app_url: String,
    pub bridge_secret: String,
}

#[derive(Debug, Serialize)]
pub struct AppsScriptStatus {
    pub connected: bool,
    pub account_email: String,
    pub forms_connected: bool,
    pub gmail_connected: bool,
    pub bridge_configured: bool,
}

#[derive(Debug, Deserialize)]
pub struct AppsScriptStatusParams {
    pub web_app_url: String,
}

#[derive(Debug, Deserialize)]
pub struct AppsScriptInvokeParams {
    pub web_app_url: String,
    pub action: String,
    pub payload: Value,
}

fn read_bridge_secret() -> Result<String, ApiError> {
    read_secret(APPS_SCRIPT_BRIDGE_SECRET_KEY).map_err(|e| ApiError::new(e.code, e.message))
}

async fn ping_status(web_app_url: &str, bridge_secret: &str) -> Result<AppsScriptStatus, ApiError> {
    let data = invoke_action(
        web_app_url,
        bridge_secret,
        "ping",
        Value::Object(Default::default()),
        timeout_for_action("ping"),
    )
    .await?;

    let account_email = data
        .get("accountEmail")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let capabilities = data.get("capabilities");
    let forms_connected = capabilities
        .and_then(|v| v.get("forms"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let gmail_connected = capabilities
        .and_then(|v| v.get("mail"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let connected = !account_email.is_empty() && forms_connected && gmail_connected;

    Ok(AppsScriptStatus {
        connected,
        account_email,
        forms_connected,
        gmail_connected,
        bridge_configured: true,
    })
}

#[tauri::command]
pub async fn apps_script_connect(params: AppsScriptConnectParams) -> Result<AppsScriptStatus, ApiError> {
    let web_app_url = validate_web_app_url(&params.web_app_url)
        .map_err(|message| ApiError::new("apps_script_config_error", message))?;
    let bridge_secret = params.bridge_secret.trim();
    if bridge_secret.len() < 16 {
        return Err(ApiError::new(
            "apps_script_config_error",
            "Connection key is too short.",
        ));
    }

    let status = ping_status(&web_app_url, bridge_secret).await?;
    set_secret(APPS_SCRIPT_BRIDGE_SECRET_KEY, bridge_secret)
        .map_err(|e| ApiError::new("apps_script_config_error", e))?;
    Ok(status)
}

#[tauri::command]
pub fn apps_script_disconnect(_state: State<GoogleAuthState>) -> Result<(), ApiError> {
    delete_secret(APPS_SCRIPT_BRIDGE_SECRET_KEY)
        .map_err(|e| ApiError::new("apps_script_error", e))?;
    Ok(())
}

#[tauri::command]
pub async fn apps_script_get_status(
    params: AppsScriptStatusParams,
) -> Result<AppsScriptStatus, ApiError> {
    let web_app_url = validate_web_app_url(&params.web_app_url)
        .map_err(|message| ApiError::new("apps_script_config_error", message))?;

    if !exists(APPS_SCRIPT_BRIDGE_SECRET_KEY) {
        return Ok(AppsScriptStatus {
            connected: false,
            account_email: String::new(),
            forms_connected: false,
            gmail_connected: false,
            bridge_configured: false,
        });
    }

    let bridge_secret = read_bridge_secret()?;
    match ping_status(&web_app_url, &bridge_secret).await {
        Ok(status) => Ok(status),
        Err(_) => Ok(AppsScriptStatus {
            connected: false,
            account_email: String::new(),
            forms_connected: false,
            gmail_connected: false,
            bridge_configured: true,
        }),
    }
}

#[tauri::command]
pub fn apps_script_is_configured(params: AppsScriptStatusParams) -> Result<bool, ApiError> {
    let has_url = !params.web_app_url.trim().is_empty()
        && validate_web_app_url(&params.web_app_url).is_ok();
    Ok(has_url && exists(APPS_SCRIPT_BRIDGE_SECRET_KEY))
}

#[tauri::command]
pub async fn apps_script_invoke(params: AppsScriptInvokeParams) -> Result<Value, ApiError> {
    let web_app_url = validate_web_app_url(&params.web_app_url)
        .map_err(|message| ApiError::new("apps_script_config_error", message))?;
    let bridge_secret = read_bridge_secret()?;
    let action = params.action.trim();
    if action.is_empty() {
        return Err(ApiError::new(
            "apps_script_request_error",
            "Apps Script action is required.",
        ));
    }
    invoke_action(
        &web_app_url,
        &bridge_secret,
        action,
        params.payload,
        timeout_for_action(action),
    )
    .await
}
