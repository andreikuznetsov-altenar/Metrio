# Phase 33 — Release & update audit

## Current version sources (before sync discipline)

| Location | Field | Value at audit |
|----------|--------|----------------|
| `package.json` | `version` | **0.1.0** (intended source of truth) |
| `src-tauri/Cargo.toml` | `version` | 0.1.0 |
| `src-tauri/tauri.conf.json` | `version` | 0.1.0 |
| `app_get_build_info` / `CARGO_PKG_VERSION` | runtime | Cargo version |
| Vite | `VITE_APP_VERSION` | Injected from `package.json` via `vite.config.ts` |
| DMG filename | Tauri bundle | `Metrio_<version>_aarch64.dmg` |
| `BUILD_CHANNEL` | build-time env | `development` (dev) / `production` (release script) |

**Procedure:** run `npm run version:sync` after bumping `package.json`, then commit synced files together.

## Signing & notarization (preserved)

- **Developer ID Application:** Andrei Kuznetsov (V36L7T43H8)
- **Team ID:** V36L7T43H8
- **Entitlements:** `src-tauri/Entitlements.plist` (hardened runtime, client/server network, no App Sandbox)
- **Config:** `tauri.conf.json` → `bundle.macOS.hardenedRuntime`, entitlements path
- **Docs:** `docs/security/developer-id-build.md`, `docs/security/metrio-macos-security-report.md`

Notarization profile referenced in release script: `Metrio Notary` (override with `APPLE_NOTARY_PROFILE`).

## GitHub Actions

No workflows existed at audit start. Added optional `/.github/workflows/release-macos.yml` (manual `workflow_dispatch`).

## Distribution today

- Local: `npm run tauri build` → `.app` + `.dmg` under `src-tauri/target/release/bundle/`
- Documented gates: codesign verify, notarytool, stapler, spctl, SHA256 sums (`scripts/release-macos.sh`)

## Architecture

- **Platform:** macOS **Apple Silicon (aarch64)** only — no Intel/universal build in scope.
- **Windows:** out of scope.

## Updater technology (Tauri 2)

- Plugins: `tauri-plugin-updater`, `tauri-plugin-process` (relaunch after install)
- `bundle.createUpdaterArtifacts: true`
- Minisign **public** key in `tauri.conf.json`; **private** key only in CI / secure release host (`TAURI_SIGNING_PRIVATE_KEY`)
- UI: custom About panel (no built-in updater dialog — `dialog: false`)

## Update hosting decision

**Selected model: static HTTPS manifest + artifacts (Option C), with optional GitHub Releases as the upload target.**

| Approach | Verdict |
|----------|---------|
| A. GitHub Releases | OK if **manifest and `.tar.gz` are publicly readable** without auth. |
| B. Internal HTTPS | Preferred for private org — same manifest format on company CDN/S3. |
| C. Static endpoint | **Default pattern** — `latest.json` + signed archive URL. |

**Private GitHub repo constraint:** the desktop app must **not** embed a PAT. Either publish release assets to a **public** releases repo/bucket, or use an internal HTTPS endpoint with anonymous read for update files only.

Placeholder endpoint in repo config is replaced at release time via `METRIO_UPDATE_ENDPOINT` + `scripts/patch-updater-endpoint.mjs`.

## Recommended next production version

Stay on **0.1.0** until a deliberate release. After Phases 30–33, the first user-facing production release should likely be **0.2.0** (minor: substantial new product surface, no breaking API for end users). Bump only when executing `release-macos.sh`, not during development.

## Release artifacts (canonical set)

1. `Metrio_<version>_aarch64.dmg` — manual install / rollback
2. `Metrio.app` — notarized stapled bundle inside DMG
3. `*.tar.gz` + `*.tar.gz.sig` — Tauri updater payload (aarch64)
4. `latest.json` — update manifest (`version`, `notes`, `pub_date`, `platforms.darwin-aarch64`)
5. `SHA256SUMS.txt` — DMG, binary, updater archive hashes (per release directory under `release-artifacts/<version>/`)

## Channels

| Channel | Update checks |
|---------|----------------|
| `development` | Disabled (About shows development state) |
| `production` | Enabled (Tauri updater + optional manifest URL) |
| `internal-beta` | Reserved; treat like production when distributing beta builds |

## Packaged A→B QA (local)

1. Build **A** at version X with production channel and test endpoint.
2. Build **B** at version Y, sign updater with same minisign keypair as pubkey in config.
3. Host `latest.json` + archive on localhost HTTPS or static folder.
4. Install A → About → check → install → relaunch → verify prefs/credentials/tray/autostart.
5. Do **not** publish fake builds to production endpoint.

## Rollback

No automatic downgrade. Recovery: install previous **signed + notarized** DMG from `release-artifacts/<version>/`.
