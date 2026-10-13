# Changelog

All notable user-facing Metrio changes are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

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
