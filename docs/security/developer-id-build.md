# Developer ID build and notarization (Metrio)

Use this checklist after installing **Developer ID Application** in Keychain (not *Apple Development*).

## Identity

```bash
security find-identity -v -p codesigning
```

Select the line:

`Developer ID Application: …`

Export for Tauri (do **not** commit the identity string if policy requires env-only):

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
```

## Entitlements

Project file: `src-tauri/Entitlements.plist` (Hardened Runtime, no App Sandbox).

`tauri.conf.json` sets `bundle.macOS.hardenedRuntime: true` and references that entitlements file.

## Notarization (choose one)

### A. App Store Connect API key (preferred)

```bash
export APPLE_API_ISSUER="<issuer-id>"
export APPLE_API_KEY="<key-id>"
export APPLE_API_KEY_PATH="$HOME/path/to/AuthKey_XXXX.p8"
```

### B. Apple ID + app-specific password

```bash
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="<app-specific-password>"
export APPLE_TEAM_ID="<10-char Team ID>"
```

Never use the normal Apple ID password. Never commit credentials.

## Build

```bash
npm run tauri build
```

Artifact:

`src-tauri/target/release/bundle/macos/Metrio.app`

Optional DMG:

`src-tauri/target/release/bundle/dmg/Metrio_0.1.0_aarch64.dmg` (name may vary)

## Verify

```bash
APP="src-tauri/target/release/bundle/macos/Metrio.app"

codesign --verify --deep --strict --verbose=2 "$APP"
codesign -dv --verbose=4 "$APP"
codesign -d --entitlements :- "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute --verbose=4 "$APP"
shasum -a 256 "$APP/Contents/MacOS/metrio"
shasum -a 256 src-tauri/target/release/bundle/dmg/*.dmg
```

## Install test

1. Copy signed app to `/Applications`
2. Launch from Finder
3. Enable **Launch at login** → confirm plist targets `/Applications/Metrio.app/.../metrio`
4. Log out/in → one process, window hidden, tray active
5. Provide SHA256 + Team ID + notarization ticket to Security for allowlisting

## Current blocker (audit host)

At Phase 18 audit time only **Apple Development** identity was present — **Developer ID Application certificate not installed**. Distributable signing and notarization were **not** executed on this machine.
