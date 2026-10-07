use std::sync::Mutex;

use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, PhysicalPosition, Position, Rect,
    Size, WebviewUrl, WebviewWindowBuilder,
};

const POPOVER_FALLBACK_WIDTH: f64 = 284.0;
const POPOVER_FALLBACK_HEIGHT: f64 = 300.0;
const ARROW_GAP: f64 = 6.0;

static TRAY_ANCHOR_CENTER_X: Mutex<Option<f64>> = Mutex::new(None);
static POPOVER_LOGICAL_WIDTH: Mutex<f64> = Mutex::new(POPOVER_FALLBACK_WIDTH);

pub fn ensure_tray_popover(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    if let Some(window) = app.get_webview_window("tray-popover") {
        return Ok(window);
    }
    let window = WebviewWindowBuilder::new(
        app,
        "tray-popover",
        WebviewUrl::App("tray-popover.html".into()),
    )
    .title("")
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .always_on_top(true)
    .visible(false)
    .resizable(false)
    .inner_size(POPOVER_FALLBACK_WIDTH, POPOVER_FALLBACK_HEIGHT)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(window)
}

fn popover_width() -> f64 {
    POPOVER_LOGICAL_WIDTH
        .lock()
        .map(|v| *v)
        .unwrap_or(POPOVER_FALLBACK_WIDTH)
}

fn clamp_popover_x(center_x: f64, monitor_x: f64, monitor_width: f64, width: f64) -> f64 {
    let half = width / 2.0;
    let min_x = monitor_x + 8.0;
    let max_x = monitor_x + monitor_width - width - 8.0;
    let x = center_x - half;
    x.clamp(min_x, max_x.max(min_x))
}

fn reposition_under_tray(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    let anchor = TRAY_ANCHOR_CENTER_X
        .lock()
        .map_err(|_| "tray anchor lock poisoned".to_string())?;
    let Some(center_x) = *anchor else {
        return Ok(());
    };

    let monitor = app
        .primary_monitor()
        .ok()
        .flatten()
        .or_else(|| app.available_monitors().ok().and_then(|m| m.into_iter().next()));
    let Some(monitor) = monitor else {
        return Ok(());
    };

    let scale = monitor.scale_factor();
    let size = monitor.size();
    let pos = monitor.position();
    let monitor_pos = pos.to_logical::<f64>(scale);
    let monitor_size = size.to_logical::<f64>(scale);
    let width = popover_width();
    let x = clamp_popover_x(center_x, monitor_pos.x, monitor_size.width, width);
    let current_y = window
        .outer_position()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(scale)
        .y;
    window
        .set_position(Position::Logical(LogicalPosition { x, y: current_y }))
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn tray_popover_resize(app: &AppHandle, width: f64, height: f64) -> Result<(), String> {
    let width = width.max(220.0).min(360.0);
    let height = height.max(180.0).min(480.0);
    if let Ok(mut stored) = POPOVER_LOGICAL_WIDTH.lock() {
        *stored = width;
    }
    let window = ensure_tray_popover(app)?;
    window
        .set_size(Size::Logical(LogicalSize { width, height }))
        .map_err(|e| e.to_string())?;
    reposition_under_tray(app, &window)?;
    Ok(())
}

pub fn toggle_tray_popover(app: &AppHandle, tray_rect: Option<Rect>) -> Result<(), String> {
    let window = ensure_tray_popover(app)?;
    if window.is_visible().unwrap_or(false) {
        window.hide().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let monitor = app
        .primary_monitor()
        .ok()
        .flatten()
        .or_else(|| app.available_monitors().ok().and_then(|m| m.into_iter().next()));

    match (monitor, tray_rect) {
        (Some(monitor), Some(rect)) => {
            let scale = monitor.scale_factor();
            let size = monitor.size();
            let pos = monitor.position();
            let tray_pos = rect.position.to_logical::<f64>(scale);
            let tray_size = rect.size.to_logical::<f64>(scale);
            let tray_center_x = tray_pos.x + tray_size.width / 2.0;
            let tray_bottom_y = tray_pos.y + tray_size.height + ARROW_GAP;
            if let Ok(mut anchor) = TRAY_ANCHOR_CENTER_X.lock() {
                *anchor = Some(tray_center_x);
            }
            let monitor_pos = pos.to_logical::<f64>(scale);
            let monitor_size = size.to_logical::<f64>(scale);
            let width = popover_width();
            let x = clamp_popover_x(tray_center_x, monitor_pos.x, monitor_size.width, width);
            let y = tray_bottom_y;
            window
                .set_position(Position::Logical(LogicalPosition { x, y }))
                .map_err(|e| e.to_string())?;
        }
        (Some(monitor), None) => {
            if let Ok(mut anchor) = TRAY_ANCHOR_CENTER_X.lock() {
                *anchor = None;
            }
            let scale = monitor.scale_factor();
            let size = monitor.size();
            let width = popover_width();
            let x = (size.width as f64 / scale) - width - 12.0;
            let y = 28.0;
            window
                .set_position(Position::Logical(LogicalPosition { x, y }))
                .map_err(|e| e.to_string())?;
        }
        (None, _) => {
            if let Ok(mut anchor) = TRAY_ANCHOR_CENTER_X.lock() {
                *anchor = None;
            }
            window
                .set_position(Position::Physical(PhysicalPosition { x: 0, y: 28 }))
                .map_err(|e| e.to_string())?;
        }
    }

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    let _ = app.emit("tray-popover-shown", ());
    Ok(())
}

pub fn hide_tray_popover(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("tray-popover") {
        let _ = window.hide();
    }
}
