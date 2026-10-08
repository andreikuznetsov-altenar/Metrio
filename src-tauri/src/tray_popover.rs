use std::sync::Mutex;

use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, PhysicalPosition, Position, Rect,
    Size, WebviewUrl, WebviewWindowBuilder,
};

// Keep in sync with src/tray/trayPopoverGeometry.ts (TRAY_POPOVER_GAP_PX)
const POPOVER_FALLBACK_WIDTH: f64 = 312.0;
const POPOVER_FALLBACK_HEIGHT: f64 = 360.0;
const TRAY_POPOVER_GAP: f64 = 3.0;

struct TrayAnchor {
    center_x: f64,
    tray_bottom_y: f64,
}

static TRAY_ANCHOR: Mutex<Option<TrayAnchor>> = Mutex::new(None);
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

fn clamp_host_x(center_x: f64, monitor_x: f64, monitor_width: f64, host_width: f64) -> f64 {
    let half = host_width / 2.0;
    let min_x = monitor_x + 8.0;
    let max_x = monitor_x + monitor_width - host_width - 8.0;
    let x = center_x - half;
    x.clamp(min_x, max_x.max(min_x))
}

fn clamp_host_y(
    desired_y: f64,
    host_height: f64,
    monitor_y: f64,
    monitor_height: f64,
) -> f64 {
    let min_y = monitor_y;
    let max_y = monitor_y + monitor_height - host_height;
    desired_y.clamp(min_y, max_y.max(min_y))
}

fn host_position_for_anchor(
    anchor: &TrayAnchor,
    host_width: f64,
    host_height: f64,
    monitor_x: f64,
    monitor_y: f64,
    monitor_width: f64,
    monitor_height: f64,
) -> LogicalPosition<f64> {
    let visible_surface_y = anchor.tray_bottom_y + TRAY_POPOVER_GAP;
    let y = clamp_host_y(visible_surface_y, host_height, monitor_y, monitor_height);
    let x = clamp_host_x(anchor.center_x, monitor_x, monitor_width, host_width);
    LogicalPosition { x, y }
}

fn reposition_under_tray(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    let anchor = TRAY_ANCHOR
        .lock()
        .map_err(|_| "tray anchor lock poisoned".to_string())?;
    let Some(anchor) = anchor.as_ref() else {
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
    let host_size = window
        .outer_size()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(scale);
    let position = host_position_for_anchor(
        anchor,
        host_size.width,
        host_size.height,
        monitor_pos.x,
        monitor_pos.y,
        monitor_size.width,
        monitor_size.height,
    );
    window
        .set_position(Position::Logical(position))
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn tray_popover_resize(app: &AppHandle, width: f64, height: f64) -> Result<(), String> {
    let width = width.max(220.0).min(420.0);
    let height = height.max(180.0).min(560.0);
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
            let tray_bottom_y = tray_pos.y + tray_size.height;
            if let Ok(mut anchor) = TRAY_ANCHOR.lock() {
                *anchor = Some(TrayAnchor {
                    center_x: tray_center_x,
                    tray_bottom_y,
                });
            }
            let monitor_pos = pos.to_logical::<f64>(scale);
            let monitor_size = size.to_logical::<f64>(scale);
            let host_size = window
                .outer_size()
                .map_err(|e| e.to_string())?
                .to_logical::<f64>(scale);
            let position = host_position_for_anchor(
                &TrayAnchor {
                    center_x: tray_center_x,
                    tray_bottom_y,
                },
                host_size.width.max(popover_width()),
                host_size.height.max(POPOVER_FALLBACK_HEIGHT),
                monitor_pos.x,
                monitor_pos.y,
                monitor_size.width,
                monitor_size.height,
            );
            window
                .set_position(Position::Logical(position))
                .map_err(|e| e.to_string())?;
        }
        (Some(monitor), None) => {
            if let Ok(mut anchor) = TRAY_ANCHOR.lock() {
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
            if let Ok(mut anchor) = TRAY_ANCHOR.lock() {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn popover_surface_is_three_px_below_tray_bottom() {
        let anchor = TrayAnchor {
            center_x: 100.0,
            tray_bottom_y: 30.0,
        };
        let pos = host_position_for_anchor(&anchor, 300.0, 320.0, 0.0, 0.0, 1920.0, 1080.0);
        assert_eq!(pos.y - anchor.tray_bottom_y, TRAY_POPOVER_GAP);
    }

    #[test]
    fn host_center_tracks_tray_icon() {
        let anchor = TrayAnchor {
            center_x: 500.0,
            tray_bottom_y: 22.0,
        };
        let width = 312.0;
        let pos = host_position_for_anchor(&anchor, width, 320.0, 0.0, 0.0, 1920.0, 1080.0);
        assert_eq!(pos.x + width / 2.0, anchor.center_x);
    }

    #[test]
    fn host_top_aligns_with_visible_surface_without_top_bleed() {
        let anchor = TrayAnchor {
            center_x: 200.0,
            tray_bottom_y: 40.0,
        };
        let pos = host_position_for_anchor(&anchor, 280.0, 300.0, 0.0, 0.0, 1920.0, 1080.0);
        assert_eq!(pos.y, anchor.tray_bottom_y + TRAY_POPOVER_GAP);
    }
}
