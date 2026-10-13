# Changelog

All notable user-facing Metrio changes are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

## 0.1.3 — updater verification release

- Validates automatic update delivery from Metrio 0.1.2.

## 0.1.2 — corrected updater migration baseline

- Replaces the withdrawn 0.1.1 as the manually-installed migration baseline (0.1.1 failed final validation and must not be installed).
- Build provenance: the native build commit now follows the checked-out Git HEAD; Cargo can no longer reuse a stale SHA.
- Updater: "You're up to date" is the result when the installed version equals the latest release; real failures keep a diagnostic (target, endpoint, category, raw plugin error) and show a calm message. Removed the secondary manifest fetch path.
- `latest.json` now carries only the `darwin-aarch64` platform entry.

## 0.1.1 — updater migration baseline

- New permanent Tauri updater signing key and GitHub Releases updater endpoint.
- Update prompt (Update and restart / Later), automatic checks every ~6 hours, manual check in Settings.
- Installed builds signed with the previous updater key cannot update over the air; install this build manually once.

### Added
- Daily briefs and weekly manager digests (deterministic, no LLM).
- Project cockpit, operational attention rules, command palette, and related Home/Performance improvements across Phases 30–32.
- macOS update infrastructure: Settings → About → Check for updates, signed updater artifacts, release scripts (Phase 33).

### Changed
- Preferences schema migrations through v8 (digests, operational rules).

## 0.1.0

Initial distributable baseline: Tauri desktop app with Jira/Bamboo performance views, notifications, tray, and Developer ID / notarization workflow documentation.
