mod api;
mod diagnostics_bundle;
mod logs;
mod persistence;
mod tray_action;

use api::credentials::{
    cache_remove, cache_set, is_local_account, verify_secret_storage, SecureStoreVerify,
    BAMBOO_TOKEN_KEY, JIRA_TOKEN_KEY,
};
use api::local_credentials::{delete_secret, init_store_path, set_secret};
use api::bamboo::{
    bamboo_get_directory, bamboo_get_employee, bamboo_get_employee_photo, bamboo_get_whos_out, bamboo_list_employees,
    bamboo_list_employees_all, bamboo_test_connection,
};
use std::time::Duration;
use api::confluence::{confluence_search_pages, confluence_test_connection};
use api::jira::{
    jira_fetch_changelog, jira_fetch_changelogs_batch, jira_fetch_remotelinks_batch,
    jira_get_issue, jira_list_projects, jira_search_issues, jira_search_users,
    jira_test_connection,
};
use api::kpi_snapshot_store::{kpi_snapshot_load, kpi_snapshot_save};
use api::pdf_export::write_user_selected_pdf;
use api::apps_script::{
    apps_script_connect, apps_script_disconnect, apps_script_get_status, apps_script_invoke,
    apps_script_is_configured,
};
use api::google::{
    google_calendar_list_events, google_disconnect, google_drive_set_responder_access,
    google_get_status, google_gmail_send, google_forms_create, google_forms_list_responses,
    google_forms_publish, google_forms_update, google_oauth_connect, google_oauth_enable_calendar,
};
use api::google::credentials::GoogleAuthState;
use api::google::oauth::GoogleTokenState;
use api::survey_store::{survey_data_load, survey_data_save};
use api::goals_store::{goals_data_load, goals_data_save};
use api::onboarding_checklist_store::{
    onboarding_checklist_data_load,
    onboarding_checklist_data_save,
};
use api::company_config_store::{
    company_config_cache_load,
    company_config_cache_save,
};
use keyring::Entry;
use diagnostics_bundle::{logs_read_tail, support_bundle_export};
use logs::{log_write, logs_get_path, logs_open_folder, write_setup_log};
use persistence::{atomic_write_json, load_json_file, PREFERENCES_SCHEMA_VERSION};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, RunEvent, State, WindowEvent,
};

struct AppState {
    tray: Mutex<tray_action::TrayActionState>,
    quitting: Mutex<bool>,
    keep_running_in_tray: Mutex<bool>,
    storage_warnings: Mutex<Vec<String>>,
}

#[derive(Debug, Serialize)]
struct BuildInfoResponse {
    version: String,
    commit: String,
    channel: String,
    product_name: String,
}

fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("preferences.json"))
}

fn local_credentials_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("credentials.local.json"))
}

#[derive(Debug, Serialize)]
struct CredentialImportLegacyResult {
    jira_imported: bool,
    bamboo_imported: bool,
    google_imported: bool,
}

#[tauri::command]
fn secure_store_set(service: String, account: String, secret: String) -> Result<(), String> {
    if service != api::credentials::SERVICE {
        return Err("Unsupported secure storage service".to_string());
    }
    if is_local_account(&account) {
        return set_secret(&account, &secret);
    }
    Entry::new(&service, &account)
        .map_err(|e| e.to_string())?
        .set_password(&secret)
        .map_err(|e| e.to_string())?;
    cache_set(&account, &secret);
    Ok(())
}

#[tauri::command]
fn secure_store_delete(service: String, account: String) -> Result<(), String> {
    if service != api::credentials::SERVICE {
        return Err("Unsupported secure storage service".to_string());
    }
    if is_local_account(&account) {
        return delete_secret(&account);
    }
    match Entry::new(&service, &account)
        .map_err(|e| e.to_string())?
        .delete_credential()
    {
        Ok(_) | Err(keyring::Error::NoEntry) => {
            cache_remove(&account);
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn secure_store_has(service: String, account: String) -> Result<bool, String> {
    if service != api::credentials::SERVICE {
        return Ok(false);
    }
    if is_local_account(&account) {
        return Ok(api::local_credentials::exists(&account));
    }
    Ok(api::credentials::cache_contains(&account))
}

#[tauri::command]
fn credential_import_legacy() -> Result<CredentialImportLegacyResult, String> {
    let jira_imported = api::local_credentials::import_legacy_keychain_secret(JIRA_TOKEN_KEY)?;
    let bamboo_imported = api::local_credentials::import_legacy_keychain_secret(BAMBOO_TOKEN_KEY)?;
    let google_imported = api::local_credentials::import_legacy_google_keychain()?;
    Ok(CredentialImportLegacyResult {
        jira_imported,
        bamboo_imported,
        google_imported,
    })
}

#[tauri::command]
fn secure_store_verify(service: String, account: String) -> Result<SecureStoreVerify, String> {
    if service != api::credentials::SERVICE {
        return Err("Unsupported secure storage service".to_string());
    }
    Ok(verify_secret_storage(&account))
}

#[derive(Debug, Serialize)]
struct PreferencesLoadResponse {
    preferences: serde_json::Value,
    source: String,
    warning: Option<String>,
}

#[tauri::command]
fn preferences_load(app: AppHandle, state: State<AppState>) -> Result<PreferencesLoadResponse, String> {
    let path = preferences_path(&app)?;
    let loaded = load_json_file(
        &path,
        serde_json::json!({ "schemaVersion": PREFERENCES_SCHEMA_VERSION }),
    );
    if let Some(warning) = loaded.warning.clone() {
        if let Ok(mut warnings) = state.storage_warnings.lock() {
            warnings.push(warning);
        }
    }
    let source = match loaded.source {
        persistence::JsonLoadSource::File => "file",
        persistence::JsonLoadSource::Default => "default",
    };
    Ok(PreferencesLoadResponse {
        preferences: loaded.value,
        source: source.to_string(),
        warning: loaded.warning,
    })
}

#[tauri::command]
fn preferences_save(app: AppHandle, preferences: serde_json::Value) -> Result<(), String> {
    let path = preferences_path(&app)?;
    let mut payload = preferences;
    if payload.get("schemaVersion").is_none() {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert(
                "schemaVersion".to_string(),
                serde_json::json!(PREFERENCES_SCHEMA_VERSION),
            );
        }
    }
    atomic_write_json(&path, &payload)
}

#[tauri::command]
fn storage_get_warnings(state: State<AppState>) -> Result<Vec<String>, String> {
    Ok(state
        .storage_warnings
        .lock()
        .map_err(|_| "storage warning lock poisoned".to_string())?
        .clone())
}

#[tauri::command]
fn app_get_build_info() -> BuildInfoResponse {
    BuildInfoResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
        commit: option_env!("GIT_COMMIT")
            .unwrap_or("dev")
            .to_string(),
        channel: option_env!("BUILD_CHANNEL")
            .unwrap_or("development")
            .to_string(),
        product_name: "Metrio".to_string(),
    }
}

#[tauri::command]
fn diagnostics_export_file(app: AppHandle, content: String) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("exports");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let path = dir.join(format!("diagnostics-{}.json", timestamp));
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(Debug, Deserialize)]
struct TraySnapshotPayload {
    title: Option<String>,
    lines: Option<Vec<String>>,
    open_label: Option<String>,
    tray_title: Option<String>,
    menu_items: Option<Vec<tray_action::TrayMenuItemDto>>,
}

#[tauri::command]
fn update_tray_snapshot(
    state: State<AppState>,
    snapshot: TraySnapshotPayload,
) -> Result<(), String> {
    let mut tray = state.tray.lock().map_err(|_| "tray lock poisoned".to_string())?;
    if let Some(items) = snapshot.menu_items {
        tray_action::apply_tray_action_snapshot(
            &mut *tray,
            tray_action::TrayActionSnapshotDto {
                tray_title: snapshot.tray_title,
                menu_items: items,
            },
        );
    } else {
        let mut menu_items = vec![tray_action::TrayMenuItemDto {
            id: "open".to_string(),
            label: snapshot
                .open_label
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "Open Metrio".to_string()),
            enabled: Some(true),
        }];
        if let Some(lines) = snapshot.lines {
            for line in lines {
                if !line.is_empty() {
                    menu_items.push(tray_action::TrayMenuItemDto {
                        id: format!("info:{}", line),
                        label: line,
                        enabled: Some(false),
                    });
                }
            }
        }
        menu_items.push(tray_action::TrayMenuItemDto {
            id: "quit".to_string(),
            label: "Quit".to_string(),
            enabled: Some(true),
        });
        tray_action::apply_tray_action_snapshot(
            &mut *tray,
            tray_action::TrayActionSnapshotDto {
                tray_title: None,
                menu_items,
            },
        );
    }
    Ok(())
}

fn apply_tray_menu(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let tray_state = state
        .tray
        .lock()
        .map_err(|_| "tray lock poisoned".to_string())?;
    tray_action::apply_tray_title(app, &tray_state.tray_title)?;
    let menu = tray_action::build_tray_menu(app, &tray_state.menu_items)
        .map_err(|e| e.to_string())?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn tray_icon(app: &AppHandle) -> tauri::image::Image<'static> {
    let scale = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or(1.0);
    if scale >= 2.0 {
        tauri::include_image!("icons/tray-icon@2x.png")
    } else {
        tauri::include_image!("icons/tray-icon.png")
    }
}

#[cfg(target_os = "windows")]
fn windows_tray_icon_for_scale(scale: f64) -> tauri::image::Image<'static> {
    if scale >= 2.0 {
        tauri::include_image!("icons/tray-win-32.png")
    } else if scale >= 1.5 {
        tauri::include_image!("icons/tray-win-24.png")
    } else if scale >= 1.25 {
        tauri::include_image!("icons/tray-win-20.png")
    } else {
        tauri::include_image!("icons/tray-win-16.png")
    }
}

#[cfg(target_os = "windows")]
fn tray_icon(app: &AppHandle) -> tauri::image::Image<'static> {
    let scale = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or(1.0);
    windows_tray_icon_for_scale(scale)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn tray_icon(_app: &AppHandle) -> tauri::image::Image<'static> {
    tauri::include_image!("icons/tray-icon.png")
}

fn install_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<AppState>();
    let tray_state = state
        .tray
        .lock()
        .map_err(|_| "tray lock poisoned".to_string())?;
    let menu = tray_action::build_tray_menu(app, &tray_state.menu_items)?;

    let mut tray_builder = TrayIconBuilder::with_id("main")
        .icon(tray_icon(app))
        .menu(&menu)
        .tooltip("Metrio");

    #[cfg(target_os = "macos")]
    {
        tray_builder = tray_builder.icon_as_template(true);
    }

    #[cfg(target_os = "windows")]
    {
        tray_builder = tray_builder.icon_as_template(false);
    }

    let _tray = tray_builder
        .on_menu_event(|app, event| {
            tray_action::handle_tray_menu_event(app, event.id.as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Native background scheduling keeps tray-mode refresh reliable when the webview is hidden.
/// React timers are not used for long-lived sync; the webview only handles emitted events.
/// If the machine slept and wall-clock gap exceeds 2x the interval, emit immediately once.
fn spawn_background_emitter(app: AppHandle, event_name: &'static str, every_secs: u64) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(every_secs));
        let mut last_tick = Instant::now();
        interval.tick().await;
        loop {
            interval.tick().await;
            let elapsed = last_tick.elapsed();
            last_tick = Instant::now();
            if elapsed > Duration::from_secs(every_secs * 2) {
                let _ = app.emit("system-resumed", ());
            }
            let _ = app.emit(event_name, ());
        }
    });
}

/// Autostart passes `--minimized` via tauri-plugin-autostart (see `MacosLauncher::LaunchAgent`).
pub fn args_include_minimized<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter().any(|arg| arg.as_ref() == "--minimized")
}

pub fn startup_launched_minimized() -> bool {
    args_include_minimized(std::env::args())
}

fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    }
}

fn show_main_window(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn set_keep_running_in_tray(state: State<AppState>, enabled: bool) -> Result<(), String> {
    let mut guard = state
        .keep_running_in_tray
        .lock()
        .map_err(|_| "keep_running_in_tray lock poisoned".to_string())?;
    *guard = enabled;
    Ok(())
}

#[tauri::command]
async fn refresh_tray_menu(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    apply_tray_menu(&app, &state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            tray: Mutex::new(tray_action::TrayActionState::default()),
            quitting: Mutex::new(false),
            keep_running_in_tray: Mutex::new(true),
            storage_warnings: Mutex::new(Vec::new()),
        })
        .manage(GoogleAuthState {
            tokens: Mutex::new(GoogleTokenState::default()),
        })
        .invoke_handler(tauri::generate_handler![
            secure_store_set,
            secure_store_delete,
            secure_store_has,
            secure_store_verify,
            preferences_load,
            preferences_save,
            storage_get_warnings,
            app_get_build_info,
            diagnostics_export_file,
            support_bundle_export,
            logs_read_tail,
            log_write,
            logs_get_path,
            logs_open_folder,
            update_tray_snapshot,
            refresh_tray_menu,
            set_keep_running_in_tray,
            jira_test_connection,
            jira_search_issues,
            jira_fetch_changelog,
            jira_get_issue,
            jira_search_users,
            jira_fetch_changelogs_batch,
            jira_list_projects,
            jira_fetch_remotelinks_batch,
            confluence_test_connection,
            confluence_search_pages,
            bamboo_test_connection,
            bamboo_get_directory,
            bamboo_list_employees,
            bamboo_list_employees_all,
            bamboo_get_employee,
            bamboo_get_whos_out,
            bamboo_get_employee_photo,
            apps_script_connect,
            apps_script_disconnect,
            apps_script_get_status,
            apps_script_is_configured,
            apps_script_invoke,
            google_get_status,
            google_oauth_connect,
            google_oauth_enable_calendar,
            google_calendar_list_events,
            google_disconnect,
            google_forms_create,
            google_forms_update,
            google_forms_publish,
            google_forms_list_responses,
            google_gmail_send,
            google_drive_set_responder_access,
            survey_data_load,
            survey_data_save,
            goals_data_load,
            goals_data_save,
            onboarding_checklist_data_load,
            onboarding_checklist_data_save,
            company_config_cache_load,
            company_config_cache_save,
            kpi_snapshot_load,
            kpi_snapshot_save,
            credential_import_legacy,
            write_user_selected_pdf
        ])
        .setup(|app| {
            write_setup_log(app.handle(), "NATIVE 01 setup begin");
            let cred_path = local_credentials_path(app.handle())?;
            init_store_path(cred_path);
            write_setup_log(app.handle(), "NATIVE 02 credentials store initialized");
            install_tray(app.handle())?;
            write_setup_log(app.handle(), "NATIVE 03 tray installed");
            spawn_background_emitter(app.handle().clone(), "background-bamboo-refresh", 60 * 60);
            spawn_background_emitter(app.handle().clone(), "background-jira-refresh", 30 * 60);
            spawn_background_emitter(app.handle().clone(), "background-survey-sync", 15 * 60);
            if let Some(window) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let quitting = if let Some(state) = handle.try_state::<AppState>() {
                            let q = state.quitting.lock().map(|guard| *guard).unwrap_or(false);
                            q
                        } else {
                            false
                        };
                        if quitting {
                            return;
                        }
                        let keep_in_tray = if let Some(state) = handle.try_state::<AppState>() {
                            state
                                .keep_running_in_tray
                                .lock()
                                .map(|guard| *guard)
                                .unwrap_or(true)
                        } else {
                            true
                        };
                        if !keep_in_tray {
                            if let Some(state) = handle.try_state::<AppState>() {
                                if let Ok(mut q) = state.quitting.lock() {
                                    *q = true;
                                }
                            }
                            handle.exit(0);
                            return;
                        }
                        api.prevent_close();
                        hide_main_window(&handle);
                    }
                });
            }
            if startup_launched_minimized() {
                hide_main_window(app.handle());
                write_setup_log(app.handle(), "NATIVE 05 autostart minimized — main window hidden");
            }
            write_setup_log(app.handle(), "NATIVE 04 setup finished");
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Reopen { .. } = event {
                show_main_window(app_handle);
            }
        });
}

#[cfg(test)]
mod startup_arg_tests {
    use super::args_include_minimized;

    #[test]
    fn minimized_flag_is_detected() {
        assert!(args_include_minimized([
            "/Applications/Metrio.app/Contents/MacOS/metrio",
            "--minimized",
        ]));
        assert!(!args_include_minimized(["/Applications/Metrio.app/Contents/MacOS/metrio"]));
    }
}

#[cfg(test)]
mod tray_lock_tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    fn test_app_state() -> AppState {
        AppState {
            tray: Mutex::new(tray_action::TrayActionState::default()),
            quitting: Mutex::new(false),
            keep_running_in_tray: Mutex::new(true),
            storage_warnings: Mutex::new(Vec::new()),
        }
    }

    #[test]
    fn tray_action_state_defaults_to_open_and_quit() {
        let state = test_app_state();
        let tray = state.tray.lock().expect("lock");
        assert_eq!(tray.tray_title, None);
        assert_eq!(tray.menu_items.len(), 2);
        assert_eq!(tray.menu_items[0].id, "open");
        assert_eq!(tray.menu_items[1].id, "quit");
    }

    #[test]
    fn tray_action_state_update_does_not_overlap_locks() {
        let state = test_app_state();
        {
            let mut tray = state.tray.lock().expect("lock");
            tray_action::apply_tray_action_snapshot(
                &mut *tray,
                tray_action::TrayActionSnapshotDto {
                    tray_title: Some("2".to_string()),
                    menu_items: vec![
                        tray_action::TrayMenuItemDto {
                            id: "open".to_string(),
                            label: "Open Metrio".to_string(),
                            enabled: Some(true),
                        },
                        tray_action::TrayMenuItemDto {
                            id: "jira:UX-1".to_string(),
                            label: "UX-1 · Example".to_string(),
                            enabled: Some(true),
                        },
                    ],
                },
            );
        }
        let tray = state.tray.lock().expect("lock");
        assert_eq!(tray.tray_title.as_deref(), Some("2"));
        assert_eq!(tray.menu_items.len(), 2);
    }

    #[test]
    fn concurrent_tray_reads_and_writes_complete() {
        let state = Arc::new(test_app_state());
        let mut handles = Vec::new();
        for worker in 0..24 {
            let state = Arc::clone(&state);
            handles.push(thread::spawn(move || {
                for step in 0..200 {
                    if worker % 2 == 0 {
                        let mut tray = state.tray.lock().expect("lock");
                        tray.tray_title = Some(format!("{worker}-{step}"));
                    } else {
                        let tray = state.tray.lock().expect("lock");
                        assert!(!tray.menu_items.is_empty());
                    }
                }
            }));
        }
        for handle in handles {
            handle.join().expect("thread panicked");
        }
    }
}
