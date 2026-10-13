# Metrio updater and release process

Metrio updates itself through the Tauri updater using **GitHub Releases**.

- Endpoint (in `src-tauri/tauri.conf.json`):
  `https://github.com/andreikuznetsov-altenar/Metrio/releases/latest/download/latest.json`
- Updater public key: `plugins.updater.pubkey` (minisign key id `71456F81A4D6472A`).
- **0.1.2 is the migration baseline.** (0.1.1 was withdrawn: it showed a stale build SHA and failed the
  real-endpoint update check. It stays published as a prerelease for history; never install it.)
  Earlier builds were signed with an abandoned updater key and cannot update over the air; testers
  install 0.1.2 manually once. Every later release must be signed
  with the same permanent key.

## Two different signing identities

| Purpose | Identity |
| --- | --- |
| Apple code signing / notarization | Developer ID Application: Andrei Kuznetsov (V36L7T43H8), bundle id `com.altenar.metrio`, notary profile `Metrio-notary` |
| Updater artifact signing | The permanent Tauri updater key (below) |

## Permanent updater key

- Private key: `~/.tauri/metrio-updater.key` (outside the repository, mode 600). Never commit it.
- Password: macOS Keychain item `metrio-updater-key-password`
  (`security find-generic-password -s metrio-updater-key-password -w`).
- **Back up the key file and the password** in a password manager. Losing them again means another
  migration baseline. Do not rotate the key in a normal release.
- GitHub Actions secrets: `TAURI_SIGNING_PRIVATE_KEY` (key contents) and
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## Release flow

Releases are owned by one workflow, **Release macOS** (`.github/workflows/release-macos.yml`); see
[releasing.md](releasing.md) for the full maintainer guide. Tag pushes do not build anything — the
workflow creates the tag itself. `npm run release:macos` remains a local, manual alternative (reads the
key from `~/.tauri/metrio-updater.key` into `TAURI_SIGNING_PRIVATE_KEY` and the password from the Keychain).

`latest.json` follows the Tauri v2 static manifest schema; `signature` is the **content** of the
`.sig` file, never a URL.

## Runtime behaviour

- One automatic check shortly after startup, then about every 6 hours. Failures never block the app.
- "Update available" modal: **Update and restart** / **Later**. Nothing installs without the user.
- Settings → Company & App → *Check for updates* runs a manual check.

## Build provenance and updater semantics

- The commit shown in Settings → About comes from Git HEAD at build time in both Vite
  (`scripts/resolve-build-commit.mjs`) and Rust (`src-tauri/build_support.rs`, which also re-runs the
  build script when HEAD or its ref changes). Dirty trees get a `-dirty` suffix.
- Tauri's `check()` returning `null` means "no newer version" → **You're up to date**. Only thrown
  errors are failures; their raw reason is kept in `localStorage["metrio-update-diagnostic"]` and the
  console (`[metrio-updater]`), never in the UI.
- `latest.json` must contain `platforms["darwin-aarch64"]` (the plugin tries `darwin-aarch64-app`
  first, then `darwin-aarch64`). The app exposes the runtime key via `app_get_updater_target`.
- Manual live-manifest probe: `METRIO_LIVE_MANIFEST_URL=<url> cargo test --test updater_manifest -- --ignored --nocapture`.
