use super::credentials::{google_authed_request, GoogleAuthState};
use super::oauth::resolve_oauth_client_id;
use crate::api::error::ApiError;
use reqwest::Method;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

#[derive(Debug, Serialize, Clone)]
pub struct CalendarAttendeeDto {
    pub email: String,
    pub display_name: Option<String>,
    pub self_: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct CalendarEventDto {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub html_link: Option<String>,
    pub hangout_link: Option<String>,
    pub attendees: Vec<CalendarAttendeeDto>,
}

#[derive(Debug, Deserialize)]
pub struct GoogleCalendarListParams {
    pub client_id: Option<String>,
    pub time_min: String,
    pub time_max: String,
}

#[tauri::command]
pub async fn google_calendar_list_events(
    state: State<'_, GoogleAuthState>,
    params: GoogleCalendarListParams,
) -> Result<Vec<CalendarEventDto>, ApiError> {
    let client_id = resolve_oauth_client_id(params.client_id);
    if client_id.trim().is_empty() {
        return Err(ApiError::new(
            "calendar_error",
            "Google OAuth Client ID is not configured.",
        ));
    }
    if params.time_min.trim().is_empty() || params.time_max.trim().is_empty() {
        return Err(ApiError::new(
            "calendar_error",
            "time_min and time_max are required.",
        ));
    }

    let time_min = urlencoding::encode(params.time_min.trim());
    let time_max = urlencoding::encode(params.time_max.trim());
    let fields = urlencoding::encode(
        "items(id,summary,htmlLink,start,end,attendees(email,displayName,self),hangoutLink,conferenceData(entryPoints))",
    );
    let url = format!(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=40&timeMin={}&timeMax={}&fields={}",
        time_min,
        time_max,
        fields,
    );

    let json = google_authed_request(&state, &client_id, Method::GET, &url, None).await?;
    parse_calendar_list(&json)
}

fn parse_calendar_list(json: &Value) -> Result<Vec<CalendarEventDto>, ApiError> {
    let items = json
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut out = Vec::new();
    for item in items {
        let id = item
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        let title = item
            .get("summary")
            .and_then(|v| v.as_str())
            .unwrap_or("(No title)")
            .to_string();
        let start = event_time(item.get("start"));
        let end = event_time(item.get("end"));
        let html_link = item
            .get("htmlLink")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let hangout_link = item
            .get("hangoutLink")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .or_else(|| conference_join_url(item.get("conferenceData")));

        let attendees = item
            .get("attendees")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|a| {
                        let email = a.get("email")?.as_str()?;
                        Some(CalendarAttendeeDto {
                            email: email.to_string(),
                            display_name: a
                                .get("displayName")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            self_: a.get("self").and_then(|v| v.as_bool()).unwrap_or(false),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        out.push(CalendarEventDto {
            id,
            title,
            start,
            end,
            html_link,
            hangout_link,
            attendees,
        });
    }
    Ok(out)
}

fn event_time(node: Option<&Value>) -> String {
    node.and_then(|n| {
        n.get("dateTime")
            .and_then(|v| v.as_str())
            .or_else(|| n.get("date").and_then(|v| v.as_str()))
    })
    .unwrap_or("")
    .to_string()
}

fn conference_join_url(node: Option<&Value>) -> Option<String> {
    let entries = node
        .and_then(|n| n.get("entryPoints"))
        .and_then(|v| v.as_array())?;
    for entry in entries {
        if entry.get("entryPointType").and_then(|v| v.as_str()) == Some("video") {
            if let Some(uri) = entry.get("uri").and_then(|v| v.as_str()) {
                return Some(uri.to_string());
            }
        }
    }
    None
}
