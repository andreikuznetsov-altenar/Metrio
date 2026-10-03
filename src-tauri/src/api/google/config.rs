/// Google OAuth client ID from build-time configuration.
/// Set GOOGLE_OAUTH_CLIENT_ID when building the desktop app.
pub fn google_oauth_client_id() -> String {
    option_env!("GOOGLE_OAUTH_CLIENT_ID")
        .map(|s| s.to_string())
        .unwrap_or_default()
}

/// Documented OAuth scopes — keep minimum practical set:
/// - openid + email: identify connected Google account
/// - forms.body: create/update Google Forms for surveys
/// - forms.responses.readonly: sync survey responses
/// - gmail.send: deliver survey and reminder emails
/// - drive.file: manage responder access on Forms the app creates (permissions API)
pub const GOOGLE_OAUTH_SCOPES: &str =
    "openid email https://www.googleapis.com/auth/forms.body https://www.googleapis.com/auth/forms.responses.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.file";

/// Read-only upcoming events — granted only via explicit `google_oauth_enable_calendar`.
pub const GOOGLE_CALENDAR_READONLY_SCOPE: &str =
    "https://www.googleapis.com/auth/calendar.events.readonly";

pub fn google_oauth_scopes_with_calendar() -> String {
    format!("{} {}", GOOGLE_OAUTH_SCOPES, GOOGLE_CALENDAR_READONLY_SCOPE)
}
