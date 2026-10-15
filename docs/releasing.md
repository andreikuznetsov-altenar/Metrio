# Releasing Metrio

One workflow, **Release macOS** (`.github/workflows/release-macos.yml`), owns every release. It
bumps the version, builds, Developer ID signs, notarizes, staples, signs the updater archive, builds
the DMG, writes `latest.json`, tags and publishes. Installed apps then see the update through the
Tauri updater (`https://github.com/andreikuznetsov-altenar/Metrio/releases/latest/download/latest.json`).

## Normal release

Push product code to `main`. The workflow plans every push and releases the next patch version
when the push can change the packaged app. Docs-only pushes (and the generated release commit)
release nothing.

## Manual fallback

GitHub → Actions → **Release macOS** → *Run workflow* (`force` releases even when only docs changed).
Or: `gh workflow run release-macos.yml`.

## Status

Automatic releases are **enabled**: the workflow starts on every push to `main` (ignoring
`docs/**` and `*.md`) and on manual dispatch. The first release produced this way, v0.1.4, was
verified with a real over-the-air update from v0.1.3.

## What a run does

1. **Plan** (`scripts/plan-release.mjs`): lists releases and tags, diffs the files changed since the
   latest stable tag and decides `should_release`. Docs, `*.md`, tests, e2e, `.github/**` and the
   release helper scripts alone never release; anything that could change the packaged app does.
   A HEAD commit containing `[skip release]` never releases (this is the recursion guard).
2. Tests (`tsc`, design-system check, `npm test`, `npm run build`, `cargo check/test`).
3. **Version bump** (`scripts/prepare-release-version.mjs X.Y.Z`) of `package.json`,
   `package-lock.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, `src/config/build.ts` and
   `CHANGELOG.md`, committed as `RELEASE Metrio vX.Y.Z [skip release]` and pushed to `main`. This
   commit is the release SHA. Pushes made with `GITHUB_TOKEN` do not start workflows, and the marker
   keeps even a manual run from recursing.
4. Build with an ephemeral keychain, Developer ID signing, `BUILD_CHANNEL=production`. **Both macOS
   architectures are built in this one job from the same checkout** (`scripts/ci/package-target.sh`):
   Apple Silicon `aarch64-apple-darwin`, then Intel `x86_64-apple-darwin` (cross-built on the arm64
   runner). The target list lives in `scripts/release-targets.mjs`; steps 5–9 run once per architecture.
   `lipo -archs` must report exactly `arm64` / `x86_64` for the main executable and every Mach-O file
   must contain the target architecture (`scripts/ci/verify-app-arch.sh`).
5. **Provenance gate**: Info.plist version, every version source, the commit Cargo baked into the
   native build and the commit embedded in the frontend must all match the release commit.
6. Signature check (Developer ID, team `V36L7T43H8`, bundle `com.altenar.metrio`, hardened runtime).
7. Notarize the **app**, staple, validate, Gatekeeper (`source=Notarized Developer ID`).
8. `Metrio_<arch>.app.tar.gz` (`aarch64`, `x86_64`) is created from that **stapled** app and signed with the updater key; the
   signature is verified and a one-byte-tampered copy must fail.
9. `Metrio_<version>_aarch64.dmg` / `Metrio_<version>_x86_64.dmg` from the stapled app, signed, notarized, stapled, Gatekeeper-checked.
10. ONE `latest.json` with `darwin-aarch64` and `darwin-x86_64`; each entry points at its own archive and
    carries its own **`.sig` content**. The app picks its key at compile time (`tauri_plugin_updater::target()`),
    so an Intel binary never downloads ARM content and vice versa.
11. Tag `vX.Y.Z` on the release SHA; release created **without** `latest.json` and not yet "latest";
    the assets are downloaded again and compared byte-for-byte; only then `latest.json` is uploaded
    and the release marked latest. A failure before that point deletes the half-made release and tag;
    clients never saw it.

## Versioning

Next version = patch bump of the highest of: `package.json`, latest **stable** release, highest
`vX.Y.Z` tag (withdrawn versions are never reused). If `package.json` is already ahead of every
tag (a release commit was pushed but publishing failed) that version is **reused** on the retry. A
manual bump of `package.json` (for example `0.2.0`) is honoured the same way.

## Concurrency

`concurrency: metrio-release-main` with `cancel-in-progress: false`: releases queue and a running
release is never cancelled. Each run re-plans from the then-current `main` and the release list.

## Required GitHub secrets (names only)

| Purpose | Secret |
| --- | --- |
| Updater signing (permanent key) | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| Developer ID certificate | `APPLE_CERTIFICATE` (base64 of the `.p12`), `APPLE_CERTIFICATE_PASSWORD` |
| Notarization (App Store Connect API key) | `APPLE_API_ISSUER`, `APPLE_API_KEY` (key id), `APPLE_API_KEY_CONTENT` (the `.p8` text) |

The run fails immediately, naming any missing secret. Never commit a `.p12`, `.p8` or the updater key.

## Inspecting a failed release

Open the failed run in Actions; the failing step name says which gate stopped it (planning,
tests, provenance, signature, notarization, updater verification, publishing). Notarization failures
print Apple's log. If the release commit was pushed but nothing published, just run the workflow
again: the same version is reused. No tag or release is left behind by a failed publish.

## Disabling automatic releases temporarily

`gh workflow disable release-macos.yml` (re-enable with `gh workflow enable release-macos.yml`), or
put `[skip release]` in the HEAD commit message of a push. Docs/tests/CI-only pushes never release anyway.

## Updater key warning

**Do not rotate the updater key casually.** Installed apps trust the public key in
`src-tauri/tauri.conf.json`; a release signed with any other key cannot be installed by them and
they would need a manual reinstall. Back up `~/.tauri/metrio-updater.key` and its password.

## Known limitation

An app launched straight from the DMG or Downloads while still quarantined runs from a read-only
AppTranslocation path and cannot update itself; installing it into Applications and opening it once
avoids that.

## Platforms (PASS42)

One release (one version, one tag, one GitHub Release, one `latest.json`) ships three platforms.
The workflow is split into jobs that all use the single release commit planned by `prepare`:

| Job | Runner | Output |
|---|---|---|
| `prepare` | macos-14 | plan, test gate, version bump + release commit |
| `macos` | macos-14 | Apple Silicon + Intel: signed, notarized, stapled `.app`, DMGs, updater archives |
| `windows` | windows-latest | NSIS installer `Metrio_<version>_x86_64-setup.exe` + updater signature, runtime QA report |
| `publish` | macos-14 | verifies every signature, writes ONE `latest.json`, tags, publishes, uploads `latest.json` last |

Updater platform keys: `darwin-aarch64`, `darwin-x86_64`, `windows-x86_64`.

**Windows signing:** no Authenticode certificate or signing service is configured, so the Windows
installer and app are **unsigned** (SmartScreen warns). The `.sig` next to the installer is the Tauri
*updater* signature (same minisign key as macOS), not Authenticode. Add an Authenticode step to the
`windows` job when a certificate becomes available.

**Windows QA:** the `windows` job runs `scripts/windows-qa.mjs smoke` against the exact installer
(silent install, launch, UI over WebView2 CDP, drawers, scroll, external link, tray, updater) and uploads
`qa-out/`. The manual workflow **Windows QA** (`windows-qa.yml`) runs the same smoke test or a controlled
OTA test (`mode=ota`) without publishing anything.
