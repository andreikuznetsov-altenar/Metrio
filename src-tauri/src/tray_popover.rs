use tauri::{AppHandle, Emitter, LogicalPosition, Manager, PhysicalPosition, Position, Rect, WebviewUrl, WebviewWindowBuilder};

const POPOVER_WIDTH: f64 = 280.0;
const POPOVER_HEIGHT: f64 = 332.0;
const ARROW_GAP: f64 = 6.0;

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
    .transparent(false)
    .skip_taskbar(true)
    .always_on_top(true)
    .visible(false)
    .resizable(false)
    .inner_size(POPOVER_WIDTH, POPOVER_HEIGHT)
    .build()
    .map_err(|e| e.to_string())?;
    Ok(window)
}

fn clamp_popover_x(center_x: f64, monitor_x: f64, monitor_width: f64) -> f64 {
    let half = POPOVER_WIDTH / 2.0;
    let min_x = monitor_x + 8.0;
    let max_x = monitor_x + monitor_width - POPOVER_WIDTH - 8.0;
    let x = center_x - half;
    x.clamp(min_x, max_x.max(min_x))
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
            let monitor_pos = pos.to_logical::<f64>(scale);
            let monitor_size = size.to_logical::<f64>(scale);
            let x = clamp_popover_x(tray_center_x, monitor_pos.x, monitor_size.width);
            let y = tray_bottom_y;
            window
                .set_position(Position::Logical(LogicalPosition { x, y }))
                .map_err(|e| e.to_string())?;
        }
        (Some(monitor), None) => {
            let scale = monitor.scale_factor();
            let size = monitor.size();
            let x = (size.width as f64 / scale) - POPOVER_WIDTH - 12.0;
            let y = 28.0;
            window
                .set_position(Position::Logical(LogicalPosition { x, y }))
                .map_err(|e| e.to_string())?;
        }
        (None, _) => {
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
