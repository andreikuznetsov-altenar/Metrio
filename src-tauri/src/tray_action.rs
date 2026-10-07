use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TrayMenuItemDto {
    pub id: String,
    pub label: String,
    pub enabled: Option<bool>,
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct TraySummaryDto {
    pub role: String,
    pub open_task_count: u32,
    pub problem_task_count: u32,
    pub index_label: String,
    pub index_value: String,
    pub index_available: bool,
    pub unread_notification_count: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TrayActionSnapshotDto {
    pub tray_title: Option<String>,
    pub menu_items: Vec<TrayMenuItemDto>,
    pub summary: Option<TraySummaryDto>,
}

pub struct TrayActionState {
    pub tray_title: Option<String>,
    pub menu_items: Vec<TrayMenuItemDto>,
    pub summary: Option<TraySummaryDto>,
}

impl Default for TrayActionState {
    fn default() -> Self {
        Self {
            tray_title: None,
            menu_items: vec![
                TrayMenuItemDto {
                    id: "open".to_string(),
                    label: "Open Metrio".to_string(),
                    enabled: Some(true),
                    kind: None,
                },
                TrayMenuItemDto {
                    id: "quit".to_string(),
                    label: "Quit".to_string(),
                    enabled: Some(true),
                    kind: None,
                },
            ],
            summary: None,
        }
    }
}

pub fn apply_tray_action_snapshot(state: &mut TrayActionState, snapshot: TrayActionSnapshotDto) {
    let title = snapshot
        .tray_title
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty() && t != "0");
    state.tray_title = title;
    if snapshot.menu_items.is_empty() {
        return;
    }
    state.menu_items = snapshot.menu_items;
    if snapshot.summary.is_some() {
        state.summary = snapshot.summary;
    }
}

enum TrayMenuEntry {
    Item(MenuItem<tauri::Wry>),
    Sep(PredefinedMenuItem<tauri::Wry>),
}

pub fn build_tray_menu(
    app: &AppHandle,
    items: &[TrayMenuItemDto],
) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let mut entries: Vec<TrayMenuEntry> = Vec::new();
    for item in items {
        if item.kind.as_deref() == Some("separator") || item.id.starts_with("sep:") {
            entries.push(TrayMenuEntry::Sep(PredefinedMenuItem::separator(app)?));
            continue;
        }
        let enabled = item.enabled.unwrap_or(true);
        entries.push(TrayMenuEntry::Item(
            MenuItem::with_id(app, &item.id, &item.label, enabled, None::<&str>)?,
        ));
    }
    let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = entries
        .iter()
        .map(|entry| match entry {
            TrayMenuEntry::Item(item) => item as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
            TrayMenuEntry::Sep(sep) => sep as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
        })
        .collect();
    Ok(Menu::with_items(app, &refs)?)
}

pub fn apply_tray_title(app: &AppHandle, title: &Option<String>) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        #[cfg(target_os = "macos")]
        {
            tray.set_title(title.clone())
                .map_err(|e| e.to_string())?;
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = title;
        }
    }
    Ok(())
}

pub fn handle_tray_menu_event(app: &AppHandle, menu_id: &str) {
    match menu_id {
        "open" => {
            crate::show_main_window(app);
            let _ = app.emit("tray-open", ());
        }
        "quit" => {
            if let Some(state) = app.try_state::<crate::AppState>() {
                if let Ok(mut q) = state.quitting.lock() {
                    *q = true;
                }
            }
            app.exit(0);
        }
        "refresh" => {
            let _ = app.emit("tray-refresh", ());
        }
        "settings" => {
            crate::show_main_window(app);
            let _ = app.emit("tray-settings", ());
        }
        "notifications" => {
            crate::show_main_window(app);
            let _ = app.emit("tray-notifications", ());
        }
        "logout" => {
            let _ = app.emit("tray-logout", ());
        }
        "update-available" => {
            let _ = app.emit("tray-update-available", ());
        }
        "view-all-work" | "active-work" => {
            let _ = app.emit("tray-view-all-work", ());
        }
        id if id.starts_with("jira:") => {
            let issue_key = id.trim_start_matches("jira:");
            let _ = app.emit(
                "tray-open-jira",
                serde_json::json!({ "issueKey": issue_key }),
            );
        }
        id if id.starts_with("bamboo-action:") => {
            let action_id = id.trim_start_matches("bamboo-action:");
            let _ = app.emit("tray-bamboo-action", action_id);
        }
        id if id.starts_with("vacation:") => {
            let vacation_id = id.trim_start_matches("vacation:");
            let _ = app.emit("tray-vacation", vacation_id);
        }
        id if id.starts_with("one-on-one-prep:") => {
            let person_id = id.trim_start_matches("one-on-one-prep:");
            let _ = app.emit(
                "tray-one-on-one-prep",
                serde_json::json!({ "personId": person_id }),
            );
        }
        id if id.starts_with("summary:") || id.starts_with("info:") => {}
        _ => {}
    }
}
