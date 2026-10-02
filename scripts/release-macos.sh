#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORTED_IGNORE='(\.ported$|src-tauri/Cargo\.toml\.ported|src-tauri/src/lib\.rs\.ported)'
if ! git diff --quiet -- . ":(exclude)*.ported"; then
  echo "Refusing release: tracked files have unstaged/staged changes."
  git status -sb
  exit 1
fi

BRANCH="${RELEASE_BRANCH:-main}"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "Refusing release: expected branch $BRANCH (on $CURRENT_BRANCH)."
  exit 1
fi

node scripts/sync-app-version.mjs

echo "Running test gate…"
npm test
npm run build
npm run test:visual
(cd src-tauri && cargo test && cargo check)

export BUILD_CHANNEL="${BUILD_CHANNEL:-production}"
export APPLE_SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY:-Developer ID Application: Andrei Kuznetsov (V36L7T43H8)}"

if [[ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" && -z "${TAURI_SIGNING_PRIVATE_KEY_PATH:-}" ]]; then
  echo "WARNING: TAURI_SIGNING_PRIVATE_KEY not set — updater artifacts may be unsigned."
fi

if [[ -n "${METRIO_UPDATE_ENDPOINT:-}" ]]; then
  node scripts/patch-updater-endpoint.mjs "$METRIO_UPDATE_ENDPOINT"
fi

npm run tauri build

APP="$ROOT/src-tauri/target/release/bundle/macos/Metrio.app"
DMG_GLOB="$ROOT/src-tauri/target/release/bundle/dmg/Metrio_"*"_aarch64.dmg"

if [[ ! -d "$APP" ]]; then
  echo "Missing app bundle at $APP"
  exit 1
fi

echo "Codesign gate…"
codesign --verify --deep --strict --verbose=2 "$APP"

if [[ -n "${APPLE_NOTARY_PROFILE:-}" ]]; then
  echo "Notary gate (profile: $APPLE_NOTARY_PROFILE)…"
  xcrun notarytool submit "$APP" --keychain-profile "$APPLE_NOTARY_PROFILE" --wait
  xcrun stapler staple "$APP"
fi

echo "Stapler gate…"
xcrun stapler validate "$APP" || true

echo "Gatekeeper gate…"
spctl --assess --type execute --verbose=4 "$APP" || true

RELEASE_DIR="$ROOT/release-artifacts/$(node -p "require('./package.json').version")"
mkdir -p "$RELEASE_DIR"

DMG_PATH="$(ls -1 $DMG_GLOB 2>/dev/null | head -1 || true)"
if [[ -n "$DMG_PATH" ]]; then
  cp "$DMG_PATH" "$RELEASE_DIR/"
  shasum -a 256 "$DMG_PATH" | tee "$RELEASE_DIR/SHA256SUMS.txt"
fi

BIN="$APP/Contents/MacOS/metrio"
if [[ -f "$BIN" ]]; then
  shasum -a 256 "$BIN" >> "$RELEASE_DIR/SHA256SUMS.txt"
fi

UPDATER_DIR="$ROOT/src-tauri/target/release/bundle/macos"
if compgen -G "$UPDATER_DIR/*.tar.gz" > /dev/null; then
  for f in "$UPDATER_DIR"/*.tar.gz; do
    cp "$f" "$RELEASE_DIR/"
    shasum -a 256 "$f" >> "$RELEASE_DIR/SHA256SUMS.txt"
  done
fi

node scripts/generate-update-manifest.mjs "$RELEASE_DIR"

echo "Release artifacts prepared in $RELEASE_DIR"
echo "Review SHA256SUMS.txt and latest.json before publishing."
