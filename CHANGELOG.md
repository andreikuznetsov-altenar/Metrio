# Changelog

All notable user-facing Metrio changes are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## Unreleased

## 0.1.32 — automated release

- Automated release build.

## 0.1.31 — automated release

- Automated release build.

## 0.1.30 — automated release

- Automated release build.

## 0.1.29 — automated release

- Automated release build.

## 0.1.28 — automated release

- Automated release build.

## 0.1.27 — automated release

- Automated release build.

## 0.1.26 — automated release

- Automated release build.

## 0.1.25 — automated release

- Automated release build.

## 0.1.24 — automated release

- Automated release build.

## 0.1.23 — automated release

- Automated release build.

## 0.1.22 — automated release

- Automated release build.

## 0.1.21 — automated release

- Automated release build.

## 0.1.20 — automated release

- Automated release build.

## 0.1.19 — automated release

- Automated release build.

## 0.1.18 — automated release

- Automated release build.

## 0.1.17 — automated release

- Automated release build.

## 0.1.16 — automated release

- Automated release build.

## 0.1.15 — automated release

- Automated release build.

## 0.1.14 — automated release

- Automated release build.

## 0.1.13 — automated release

- Automated release build.

## 0.1.12 — automated release

- Automated release build.

## 0.1.11 — automated release

- Automated release build.

## 0.1.10 — automated release

- Automated release build.

## 0.1.9 — automated release

- Automated release build.

## 0.1.8 — automated release

- Automated release build.

## 0.1.7 — automated release

- Automated release build.

## 0.1.6 — automated release

- Automated release build.

## 0.1.5 — automated release

- Automated release build.

## 0.1.4 — automated release

- Automated release build.

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
