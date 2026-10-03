use serde::Deserialize;
use tauri::menu::{Menu, MenuItem};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Deserialize)]
pub struct TrayMenuItemDto {
    pub id: String,
    pub label: String,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TrayActionSnapshotDto {
    pub tray_title: Option<String>,
    pub menu_items: Vec<TrayMenuItemDto>,
}

pub struct TrayActionState {
    pub tray_title: Option<String>,
    pub menu_items: Vec<TrayMenuItemDto>,
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
                },
                TrayMenuItemDto {
                    id: "quit".to_string(),
                    label: "Quit".to_string(),
                    enabled: Some(true),
                },
            ],
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
}

pub fn build_tray_menu(
    app: &AppHandle,
    items: &[TrayMenuItemDto],
) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let mut menu_items: Vec<MenuItem<tauri::Wry>> = Vec::new();
    for item in items {
        let enabled = item.enabled.unwrap_or(true);
        let menu_item =
            MenuItem::with_id(app, &item.id, &item.label, enabled, None::<&str>)?;
        menu_items.push(menu_item);
    }
    let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = menu_items
        .iter()
        .map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
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
        _ => {}
    }
}
