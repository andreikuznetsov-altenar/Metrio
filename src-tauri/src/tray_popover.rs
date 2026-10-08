use std::sync::Mutex;
use std::time::Instant;

use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, PhysicalPosition, Position, Rect,
    Size, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

// Keep in sync with src/tray/trayPopoverGeometry.ts (TRAY_POPOVER_GAP_PX)
const POPOVER_FALLBACK_WIDTH: f64 = 312.0;
const POPOVER_FALLBACK_HEIGHT: f64 = 360.0;
const TRAY_POPOVER_GAP: f64 = 3.0;
const TRAY_HOST_SHADOW_BLEED_TOP: f64 = 12.0;
/// Ignore the blur that can arrive with the opening click. Not a UI delay.
const OPEN_BLUR_GRACE_MS: u128 = 100;
/// If focus-loss already hid the popover, swallow the same tray click's reopen.
const TOGGLE_REOPEN_SUPPRESS_MS: u128 = 150;

struct TrayAnchor {
    center_x: f64,
    tray_bottom_y: f64,
}

struct TrayFocusState {
    focused_at: Option<Instant>,
    blur_hidden_at: Option<Instant>,
}

static TRAY_ANCHOR: Mutex<Option<TrayAnchor>> = Mutex::new(None);
static POPOVER_LOGICAL_WIDTH: Mutex<f64> = Mutex::new(POPOVER_FALLBACK_WIDTH);
static TRAY_FOCUS: Mutex<TrayFocusState> = Mutex::new(TrayFocusState {
    focused_at: None,
    blur_hidden_at: None,
});

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TrayBlurAction {
    Ignore,
    Hide,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TrayToggleAction {
    Hide,
    Show,
    SwallowReopen,
}

pub fn tray_blur_action(millis_since_focus: Option<u128>) -> TrayBlurAction {
    match millis_since_focus {
        Some(ms) if ms >= OPEN_BLUR_GRACE_MS => TrayBlurAction::Hide,
        _ => TrayBlurAction::Ignore,
    }
}

pub fn tray_toggle_action(visible: bool, millis_since_blur_hide: Option<u128>) -> TrayToggleAction {
    if visible {
        return TrayToggleAction::Hide;
    }
    if millis_since_blur_hide.is_some_and(|ms| ms < TOGGLE_REOPEN_SUPPRESS_MS) {
        return TrayToggleAction::SwallowReopen;
    }
    TrayToggleAction::Show
}

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
    let focus_app = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(focused) = event {
            handle_tray_popover_focus(&focus_app, *focused);
        }
    });
    Ok(window)
}

fn handle_tray_popover_focus(app: &AppHandle, focused: bool) {
    let mut focus = match TRAY_FOCUS.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };
    if focused {
        focus.focused_at = Some(Instant::now());
        return;
    }
    let since_focus = focus.focused_at.map(|at| at.elapsed().as_millis());
    if tray_blur_action(since_focus) != TrayBlurAction::Hide {
        return;
    }
    let Some(window) = app.get_webview_window("tray-popover") else {
        return;
    };
    if !window.is_visible().unwrap_or(false) {
        return;
    }
    focus.blur_hidden_at = Some(Instant::now());
    focus.focused_at = None;
    drop(focus);
    let _ = window.hide();
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

fn clamp_host_y(desired_y: f64, host_height: f64, monitor_y: f64, monitor_height: f64) -> f64 {
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
    let host_y = visible_surface_y - TRAY_HOST_SHADOW_BLEED_TOP;
    let y = clamp_host_y(host_y, host_height, monitor_y, monitor_height);
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

    let monitor = app.primary_monitor().ok().flatten().or_else(|| {
        app.available_monitors()
            .ok()
            .and_then(|m| m.into_iter().next())
    });
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
    let visible = window.is_visible().unwrap_or(false);
    let blur_age = TRAY_FOCUS
        .lock()
        .ok()
        .and_then(|focus| focus.blur_hidden_at.map(|at| at.elapsed().as_millis()));
    match tray_toggle_action(visible, blur_age) {
        TrayToggleAction::Hide => {
            if let Ok(mut focus) = TRAY_FOCUS.lock() {
                focus.blur_hidden_at = None;
                focus.focused_at = None;
            }
            window.hide().map_err(|e| e.to_string())?;
            return Ok(());
        }
        TrayToggleAction::SwallowReopen => {
            if let Ok(mut focus) = TRAY_FOCUS.lock() {
                focus.blur_hidden_at = None;
            }
            return Ok(());
        }
        TrayToggleAction::Show => {}
    }

    let monitor = app.primary_monitor().ok().flatten().or_else(|| {
        app.available_monitors()
            .ok()
            .and_then(|m| m.into_iter().next())
    });

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

    if let Ok(mut focus) = TRAY_FOCUS.lock() {
        focus.focused_at = Some(Instant::now());
        focus.blur_hidden_at = None;
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
    if let Ok(mut focus) = TRAY_FOCUS.lock() {
        focus.blur_hidden_at = None;
        focus.focused_at = None;
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
        let visible_top = pos.y + TRAY_HOST_SHADOW_BLEED_TOP;
        assert_eq!(visible_top - anchor.tray_bottom_y, TRAY_POPOVER_GAP);
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
    fn host_top_includes_shadow_bleed_without_lowering_the_surface() {
        let anchor = TrayAnchor {
            center_x: 200.0,
            tray_bottom_y: 40.0,
        };
        let pos = host_position_for_anchor(&anchor, 280.0, 300.0, 0.0, 0.0, 1920.0, 1080.0);
        let visible_top = anchor.tray_bottom_y + TRAY_POPOVER_GAP;
        assert_eq!(pos.y, visible_top - TRAY_HOST_SHADOW_BLEED_TOP);
        assert!(pos.y < visible_top);
    }

    #[test]
    fn focus_loss_hides_only_after_open_grace() {
        assert_eq!(tray_blur_action(None), TrayBlurAction::Ignore);
        assert_eq!(tray_blur_action(Some(0)), TrayBlurAction::Ignore);
        assert_eq!(tray_blur_action(Some(99)), TrayBlurAction::Ignore);
        assert_eq!(tray_blur_action(Some(100)), TrayBlurAction::Hide);
    }

    #[test]
    fn tray_icon_toggle_does_not_reopen_after_blur_hide() {
        assert_eq!(tray_toggle_action(true, None), TrayToggleAction::Hide);
        assert_eq!(
            tray_toggle_action(false, Some(10)),
            TrayToggleAction::SwallowReopen
        );
        assert_eq!(tray_toggle_action(false, Some(150)), TrayToggleAction::Show);
        assert_eq!(tray_toggle_action(false, None), TrayToggleAction::Show);
    }
}
