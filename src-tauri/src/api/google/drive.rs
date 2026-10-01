use super::credentials::{google_authed_request, GoogleAuthState};
use crate::api::error::ApiError;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct GoogleDriveResponderAccessParams {
    pub client_id: String,
    pub file_id: String,
    pub mode: String,
}

#[derive(Debug, Serialize)]
pub struct GoogleDriveResponderAccessResult {
    pub applied: bool,
    pub permission_id: Option<String>,
}

fn find_anyone_published_permission(permissions: &[Value]) -> Option<String> {
    for perm in permissions {
        let perm_type = perm.get("type").and_then(|v| v.as_str());
        let role = perm.get("role").and_then(|v| v.as_str());
        let view = perm.get("view").and_then(|v| v.as_str());
        if perm_type == Some("anyone") && role == Some("reader") && view == Some("published") {
            return perm
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
    }
    None
}

#[tauri::command]
pub async fn google_drive_set_responder_access(
    state: State<'_, GoogleAuthState>,
    params: GoogleDriveResponderAccessParams,
) -> Result<GoogleDriveResponderAccessResult, ApiError> {
    let list_url = format!(
        "https://www.googleapis.com/drive/v3/files/{}/permissions?fields=permissions(id,type,role,view)&includePermissionsForView=published",
        urlencoding::encode(&params.file_id)
    );
    let listed = google_authed_request(
        &state,
        &params.client_id,
        Method::GET,
        &list_url,
        None,
    )
    .await?;

    let permissions = listed
        .get("permissions")
        .and_then(|v| v.as_array())
        .map(|a| a.as_slice())
        .unwrap_or(&[]);

    let existing = find_anyone_published_permission(permissions);

    if params.mode == "anyone_with_link" {
        if let Some(id) = existing {
            return Ok(GoogleDriveResponderAccessResult {
                applied: false,
                permission_id: Some(id),
            });
        }

        let create_url = format!(
            "https://www.googleapis.com/drive/v3/files/{}/permissions",
            urlencoding::encode(&params.file_id)
        );
        let created = google_authed_request(
            &state,
            &params.client_id,
            Method::POST,
            &create_url,
            Some(json!({
                "type": "anyone",
                "role": "reader",
                "view": "published"
            })),
        )
        .await?;

        let permission_id = created
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        return Ok(GoogleDriveResponderAccessResult {
            applied: true,
            permission_id,
        });
    }

    if params.mode == "restricted" {
        if let Some(id) = existing {
            let delete_url = format!(
                "https://www.googleapis.com/drive/v3/files/{}/permissions/{}",
                urlencoding::encode(&params.file_id),
                urlencoding::encode(&id)
            );
            let _ = google_authed_request(
                &state,
                &params.client_id,
                Method::DELETE,
                &delete_url,
                None,
            )
            .await?;
            return Ok(GoogleDriveResponderAccessResult {
                applied: true,
                permission_id: None,
            });
        }
        return Ok(GoogleDriveResponderAccessResult {
            applied: false,
            permission_id: None,
        });
    }

    Err(ApiError::new(
        "drive_error",
        format!("Unknown responder access mode: {}", params.mode),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_existing_anyone_published_permission() {
        let permissions = vec![json!({
            "id": "perm123",
            "type": "anyone",
            "role": "reader",
            "view": "published"
        })];
        assert_eq!(
            find_anyone_published_permission(&permissions),
            Some("perm123".to_string())
        );
    }

    #[test]
    fn ignores_writer_permissions() {
        let permissions = vec![json!({
            "id": "perm456",
            "type": "anyone",
            "role": "writer",
            "view": "published"
        })];
        assert_eq!(find_anyone_published_permission(&permissions), None);
    }
}
