# Metrio macOS persistence audit (Phase 18)

Git baseline: `1dd603826edab6f5d4dc1b61b966ed7245c24aa8`

## 1. Autostart implementation (confirmed)

| Layer | Location | Behavior |
|-------|----------|----------|
| UI | `SettingsPage.tsx` → `syncGeneralPreferencesToNative` | User toggles **Launch at login** only |
| Boot sync | `RuntimeShellEffects.tsx` | Applies saved preference on startup (no silent enable) |
| JS API | `src/platform/autostart.ts` | `enable` / `disable` / `isEnabled` via `@tauri-apps/plugin-autostart` |
| Rust | `src-tauri/src/lib.rs` | `tauri_plugin_autostart::MacosLauncher::LaunchAgent`, args `["--minimized"]` |
| Capability | `src-tauri/capabilities/default.json` | `autostart:default` |
| Default | `preferences.ts` | `general.launchAtLogin: false` |

**Keep running in tray** (`keepRunningInTray`) calls `set_keep_running_in_tray` only — it does **not** register Launch at login.

## 2. Repository search — other persistence

Searched: LaunchAgent, LaunchDaemon, launchctl, plist, SMAppService, SMLoginItem, Login Items, osascript, startup, autostart, background service.

| Finding | Notes |
|---------|--------|
| Tauri autostart plugin | Only user-facing login persistence |
| `auto-launch` crate (dependency) | Writes `~/Library/LaunchAgents/{app_name}.plist` when enabled |
| AppleScript mode | **Not used** (`MacosLauncher::LaunchAgent` only) |
| SMAppService | Available in dependency, **not selected** |
| Shell scripts / CI | No extra login registration found |
| `package.json` | No login hooks |

## 3. LaunchAgent artifact (expected shape)

When **Launch at login** is ON, `auto-launch` creates:

- **Path:** `~/Library/LaunchAgents/Metrio.plist` (app display name from Tauri `productName`)
- **Label:** `Metrio` (same as app name, not bundle ID)
- **ProgramArguments:** `[<canonical path to running binary>, "--minimized"]`
- **RunAtLoad:** `true`
- **KeepAlive:** not set (no respawn loop)
- **AssociatedBundleIdentifiers:** from plugin (bundle id when provided)

For a **development** run, `ProgramArguments[0]` resolves to the binary under `src-tauri/target/.../Metrio.app/Contents/MacOS/metrio` (or equivalent). For **/Applications** install, it must point at the installed bundle binary.

macOS may also list the app under **System Settings → General → Login Items** / **Allow in Background** depending on OS version; wording varies.

### Local inspection (this machine, before enabling)

- `~/Library/LaunchAgents/` — no Metrio-related plists at audit time
- `launchctl print gui/$(id -u)` — no Metrio entries at audit time

Manual step for Security: enable **Launch at login**, capture plist contents (redact secrets — none expected), then disable and confirm plist removal.

## 4. Disable cleanup (expected)

`disable()` removes `~/Library/LaunchAgents/Metrio.plist` if present. `isEnabled()` is file existence. No Metrio-owned launchd unload script beyond plist removal.

## 5. Stale development agents

No stale Metrio / `src-tauri/target` LaunchAgents found on the audit host. If Security sees old plists, compare `ProgramArguments[0]` to current install path and remove only Metrio-owned `Metrio.plist`.

## 6. `--minimized` (fixed in 18b)

Previously Rust registered `--minimized` for autostart but did not hide the main window. **Fix:** `args_include_minimized` + `hide_main_window` during setup when flag present.

## 7. LaunchAgent vs SMAppService

**Recommendation:** keep **LaunchAgent** (official Tauri path) until a **signed + notarized** build is tested with SentinelOne. Consider SMAppService only if EDR still flags acceptable signed builds with login enabled.

## Background behavior (legitimate)

| Component | Interval / trigger |
|-----------|-------------------|
| Tray | Always when app running |
| `background-jira-refresh` | 30 min (Rust emitter) |
| `background-bamboo-refresh` | 60 min |
| `background-survey-sync` | 15 min |
| Launch at login | **Only if user enables** in Settings |

## User consent

- Default `launchAtLogin: false`
- Enable only via Settings checkbox → `applyLaunchAtLogin(true)`
- No code path enables autostart without saved user preference (boot sync mirrors saved value only)

## Uninstall note

If the app is deleted while Launch at login is ON, `~/Library/LaunchAgents/Metrio.plist` may remain and point at a missing binary. User or IT should delete that plist or disable login item before/after uninstall. No custom uninstaller in this phase.
