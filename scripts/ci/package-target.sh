#!/usr/bin/env bash
# Builds, signs, verifies, notarizes, staples and packages ONE macOS architecture of a release.
#   scripts/ci/package-target.sh <aarch64|x86_64>
# Needs (set by the release workflow): RELEASE_VERSION, RELEASE_SHA, SIGNING_IDENTITY, RUNNER_TEMP,
# APPLE_API_KEY_PATH, APPLE_API_KEY, APPLE_API_ISSUER, TAURI_SIGNING_PRIVATE_KEY(+_PASSWORD).
# Output (release-assets/): Metrio_<id>.app.tar.gz(+.sig) and Metrio_<version>_<id>.dmg
set -euo pipefail

ID="${1:?usage: package-target.sh <aarch64|x86_64>}"
read -r RUST_TARGET LIPO_ARCH ARCHIVE DMG < <(node --input-type=module -e '
  import { RELEASE_TARGETS, updaterArchiveName, dmgName } from "./scripts/release-targets.mjs";
  const t = RELEASE_TARGETS.find((x) => x.id === process.argv[1]);
  if (!t) { console.error("unknown target " + process.argv[1]); process.exit(1); }
  console.log(t.rustTarget, t.lipoArch, updaterArchiveName(t), dmgName(process.env.RELEASE_VERSION, t));
' "$ID")
BUNDLE_DIR="src-tauri/target/$RUST_TARGET/release/bundle/macos"
APP="$BUNDLE_DIR/Metrio.app"
mkdir -p release-assets

echo "::group::Build $ID ($RUST_TARGET)"
BUILD_CHANNEL=production APPLE_SIGNING_IDENTITY="$SIGNING_IDENTITY" \
  npm run tauri build -- --target "$RUST_TARGET" --bundles app
echo "::endgroup::"

node scripts/verify-build-provenance.mjs --app "$APP" --target "$RUST_TARGET" \
  --version "$RELEASE_VERSION" --sha "$RELEASE_SHA"
bash scripts/ci/verify-app-arch.sh "$APP" "$LIPO_ARCH"
bash scripts/ci/verify-app-signature.sh "$APP"

# Notarize the app, staple, Gatekeeper-check.
ditto -c -k --keepParent "$APP" "$RUNNER_TEMP/Metrio-$ID-app.zip"
bash scripts/ci/notarize.sh "$RUNNER_TEMP/Metrio-$ID-app.zip"
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl -a -vv "$APP" 2>&1 | tee "$RUNNER_TEMP/spctl-app-$ID.txt"
grep -q "source=Notarized Developer ID" "$RUNNER_TEMP/spctl-app-$ID.txt"
# Stapling must not change the architecture or break the signature.
bash scripts/ci/verify-app-arch.sh "$APP" "$LIPO_ARCH"
codesign --verify --deep --strict --verbose=2 "$APP"

# Updater archive from the FINAL stapled app, with its own signature.
COPYFILE_DISABLE=1 tar -czf "release-assets/$ARCHIVE" -C "$BUNDLE_DIR" Metrio.app
npx tauri signer sign "release-assets/$ARCHIVE" > /dev/null 2>&1
test -s "release-assets/$ARCHIVE.sig"

# DMG from the stapled app, notarized, stapled, Gatekeeper-checked.
bash scripts/ci/build-dmg.sh "$APP" "release-assets/$DMG" "$SIGNING_IDENTITY"
bash scripts/ci/notarize.sh "release-assets/$DMG"
xcrun stapler staple "release-assets/$DMG"
xcrun stapler validate "release-assets/$DMG"
spctl -a -t open --context context:primary-signature -vv "release-assets/$DMG" 2>&1 | tee "$RUNNER_TEMP/spctl-dmg-$ID.txt"
grep -q "source=Notarized Developer ID" "$RUNNER_TEMP/spctl-dmg-$ID.txt"
MNT="$RUNNER_TEMP/dmg-mount-$ID"; mkdir -p "$MNT"
hdiutil attach "release-assets/$DMG" -nobrowse -readonly -mountpoint "$MNT" >/dev/null
spctl -a -vv "$MNT/Metrio.app" 2>&1 | tee "$RUNNER_TEMP/spctl-dmg-app-$ID.txt"
bash scripts/ci/verify-app-arch.sh "$MNT/Metrio.app" "$LIPO_ARCH"
hdiutil detach "$MNT" >/dev/null
grep -q "source=Notarized Developer ID" "$RUNNER_TEMP/spctl-dmg-app-$ID.txt"
echo "OK: $ID packaged -> $ARCHIVE, $DMG"
