pub mod calendar;
pub mod config;
pub mod credentials;
// config documents OAuth scopes; client id resolved in oauth.rs
pub mod drive;
pub mod forms;
pub mod gmail;
pub mod mime;
pub mod oauth;

pub use calendar::google_calendar_list_events;
pub use drive::google_drive_set_responder_access;
pub use forms::{google_forms_create, google_forms_list_responses, google_forms_publish, google_forms_update};
pub use gmail::google_gmail_send;
pub use oauth::{
    google_disconnect, google_get_status, google_oauth_connect, google_oauth_enable_calendar,
};
