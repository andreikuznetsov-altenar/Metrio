use std::sync::Mutex;
use std::time::Instant;

use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Monitor, PhysicalPosition, Position,
    Rect, Size, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

// Keep in sync with src/tray/trayPopoverGeometry.ts (TRAY_POPOVER_GAP_PX)
const POPOVER_FALLBACK_WIDTH: f64 = 312.0;
const POPOVER_FALLBACK_HEIGHT: f64 = 360.0;
/// Visible white surface sits this many logical px below the tray icon / menu-bar bottom.
const TRAY_POPOVER_GAP: f64 = 1.0;
const TRAY_HOST_SHADOW_BLEED_TOP: f64 = 12.0;
/// Ignore the blur that can arrive with the opening click. Not a UI delay.
const OPEN_BLUR_GRACE_MS: u128 = 100;
/// If focus-loss already hid the popover, swallow the same tray click's reopen.
const TOGGLE_REOPEN_SUPPRESS_MS: u128 = 150;

struct TrayAnchor {
    center_x: f64,
    /// Logical Y of the tray icon / status-item bottom (== menu-bar bottom for menu-bar trays).
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

/// Visible white card top edge in screen logical coordinates.
pub fn visible_surface_top_y(tray_bottom_y: f64) -> f64 {
    tray_bottom_y + TRAY_POPOVER_GAP
}

/// Transparent host origin so top shadow bleed sits above the visible card.
pub fn host_top_y_from_visible_surface(visible_surface_top_y: f64) -> f64 {
    visible_surface_top_y - TRAY_HOST_SHADOW_BLEED_TOP
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
    configure_macos_tray_popover_window(&window);
    let focus_app = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(focused) = event {
            handle_tray_popover_focus(&focus_app, *focused);
        }
    });
    Ok(window)
}

/// Raise above the menu bar so the transparent top bleed can occupy menu-bar Y without
/// macOS clamping the host down (which would turn bleed into a visible gap).
#[cfg(target_os = "macos")]
fn configure_macos_tray_popover_window(window: &tauri::WebviewWindow) {
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSPopUpMenuWindowLevel, NSWindow, NSWindowCollectionBehavior};

    let Ok(ptr) = window.ns_window() else {
        return;
    };
    if ptr.is_null() {
        return;
    }
    unsafe {
        let ns_window = &*(ptr as *const AnyObject as *const NSWindow);
        ns_window.setLevel(NSPopUpMenuWindowLevel);
        ns_window.setHasShadow(false);
        ns_window.setCollectionBehavior(
            NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::FullScreenAuxiliary
                | NSWindowCollectionBehavior::Transient
                | NSWindowCollectionBehavior::IgnoresCycle,
        );
    }
}

#[cfg(not(target_os = "macos"))]
fn configure_macos_tray_popover_window(_window: &tauri::WebviewWindow) {}

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
    // Allow host to sit above the menu-bar bottom (negative relative to content area)
    // so top shadow bleed is transparent over the menu bar, not empty desktop gap.
    let min_y = monitor_y - TRAY_HOST_SHADOW_BLEED_TOP;
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
    let visible_surface_y = visible_surface_top_y(anchor.tray_bottom_y);
    let host_y = host_top_y_from_visible_surface(visible_surface_y);
    let y = clamp_host_y(host_y, host_height, monitor_y, monitor_height);
    let x = clamp_host_x(anchor.center_x, monitor_x, monitor_width, host_width);
    LogicalPosition { x, y }
}

fn monitor_for_tray_point(app: &AppHandle, physical_x: f64, physical_y: f64) -> Option<Monitor> {
    app.monitor_from_point(physical_x, physical_y)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten())
        .or_else(|| {
            app.available_monitors()
                .ok()
                .and_then(|m| m.into_iter().next())
        })
}

fn reposition_under_tray(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    let anchor = TRAY_ANCHOR
        .lock()
        .map_err(|_| "tray anchor lock poisoned".to_string())?;
    let Some(anchor) = anchor.as_ref() else {
        return Ok(());
    };

    // Prefer the screen that contains the tray center (logical → approximate physical via primary scale).
    let probe = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);
    let monitor = monitor_for_tray_point(app, anchor.center_x * probe, anchor.tray_bottom_y * probe)
        .or_else(|| app.primary_monitor().ok().flatten());
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
    configure_macos_tray_popover_window(window);
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

    match tray_rect {
        Some(rect) => {
            // Tray-icon rect is physical; resolve the monitor that contains the icon first.
            let physical = rect.position.to_physical::<f64>(1.0);
            let Some(monitor) = monitor_for_tray_point(app, physical.x, physical.y) else {
                window
                    .set_position(Position::Physical(PhysicalPosition { x: 0, y: 28 }))
                    .map_err(|e| e.to_string())?;
                window.show().map_err(|e| e.to_string())?;
                return Ok(());
            };

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
            configure_macos_tray_popover_window(&window);
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
        None => {
            if let Ok(mut anchor) = TRAY_ANCHOR.lock() {
                *anchor = None;
            }
            let monitor = app.primary_monitor().ok().flatten().or_else(|| {
                app.available_monitors()
                    .ok()
                    .and_then(|m| m.into_iter().next())
            });
            if let Some(monitor) = monitor {
                let scale = monitor.scale_factor();
                let size = monitor.size();
                let width = popover_width();
                let x = (size.width as f64 / scale) - width - 12.0;
                // Fallback: approximate menu-bar height without tray rect.
                let y = host_top_y_from_visible_surface(visible_surface_top_y(28.0));
                window
                    .set_position(Position::Logical(LogicalPosition { x, y }))
                    .map_err(|e| e.to_string())?;
            } else {
                window
                    .set_position(Position::Physical(PhysicalPosition { x: 0, y: 28 }))
                    .map_err(|e| e.to_string())?;
            }
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
    fn visible_surface_gap_from_menu_bar_is_zero_to_two_px() {
        let menu_bar_bottom = 37.0;
        let anchor = TrayAnchor {
            center_x: 100.0,
            tray_bottom_y: menu_bar_bottom,
        };
        let pos = host_position_for_anchor(&anchor, 300.0, 320.0, 0.0, 0.0, 1920.0, 1080.0);
        let visible_top = pos.y + TRAY_HOST_SHADOW_BLEED_TOP;
        let gap = visible_top - menu_bar_bottom;
        assert!(gap >= 0.0, "gap {gap} must not overlap the menu bar");
        assert!(
            gap <= 2.0,
            "gap {gap} must be <= 2px (got visible_top={visible_top})"
        );
        assert_eq!(gap, TRAY_POPOVER_GAP);
    }

    #[test]
    fn host_top_equals_visible_surface_minus_top_bleed() {
        let menu_bar_bottom = 37.0;
        let visible_top = visible_surface_top_y(menu_bar_bottom);
        let host_top = host_top_y_from_visible_surface(visible_top);
        assert_eq!(host_top, visible_top - TRAY_HOST_SHADOW_BLEED_TOP);

        let anchor = TrayAnchor {
            center_x: 200.0,
            tray_bottom_y: menu_bar_bottom,
        };
        let pos = host_position_for_anchor(&anchor, 280.0, 300.0, 0.0, 0.0, 1920.0, 1080.0);
        assert_eq!(pos.y, host_top);
        assert!(pos.y < visible_top);
    }

    #[test]
    fn clamp_must_not_turn_top_bleed_into_desktop_gap() {
        // Regression: if host were forced to menuBarBottom, visible card would sit
        // menuBarBottom + bleed (= 12px gap). Desired host is above the menu bar.
        let menu_bar_bottom = 37.0;
        let anchor = TrayAnchor {
            center_x: 100.0,
            tray_bottom_y: menu_bar_bottom,
        };
        let pos = host_position_for_anchor(&anchor, 300.0, 320.0, 0.0, 0.0, 1920.0, 1080.0);
        assert!(
            pos.y < menu_bar_bottom,
            "host must extend into menu-bar Y for transparent bleed (host={})",
            pos.y
        );
        let visible_top = pos.y + TRAY_HOST_SHADOW_BLEED_TOP;
        assert!((visible_top - menu_bar_bottom).abs() <= 2.0);
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
