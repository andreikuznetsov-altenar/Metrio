#!/usr/bin/env bash
# Builds the distributable DMG from an ALREADY STAPLED Metrio.app, writes a deterministic
# Finder layout, then Developer ID signs the final compressed image.
#
# Desired Finder presentation:
#   - compact window
#   - large icons
#   - Metrio.app on the LEFT
#   - Applications on the RIGHT
#
# Usage:
#   scripts/ci/build-dmg.sh <Metrio.app> <output.dmg> "<signing identity>"
set -euo pipefail

APP="${1:?}"
OUT="${2:?}"
IDENTITY="${3:?}"

ROOT_TMP="$(mktemp -d)"
CONTENT_DIR="$ROOT_TMP/content"
MOUNT_DIR="$ROOT_TMP/mount"
RW_DMG="$ROOT_TMP/Metrio-rw.dmg"

cleanup() {
  if mount | grep -Fq " on $MOUNT_DIR "; then
    hdiutil detach "$MOUNT_DIR" -quiet || true
  fi
  rm -rf "$ROOT_TMP"
}
trap cleanup EXIT

mkdir -p "$CONTENT_DIR" "$MOUNT_DIR"
ditto "$APP" "$CONTENT_DIR/Metrio.app"
ln -s /Applications "$CONTENT_DIR/Applications"

rm -f "$OUT" "$RW_DMG"

# Create a writable image first. Finder must be able to write .DS_Store so the
# icon size, icon positions, and compact window geometry survive in the final DMG.
hdiutil create   -volname "Metrio"   -srcfolder "$CONTENT_DIR"   -fs HFS+   -format UDRW   -ov "$RW_DMG" >/dev/null

hdiutil attach "$RW_DMG"   -readwrite   -noverify   -noautoopen   -mountpoint "$MOUNT_DIR" >/dev/null

# Persist a deterministic Finder icon-view layout.
#
# Keep this deliberately simple and native: no background art and no third-party
# DMG tooling. The application is the primary object and appears first/left.
osascript <<'APPLESCRIPT'
tell application "Finder"
  tell disk "Metrio"
    open

    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set bounds of container window to {100, 100, 760, 500}

    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 128
    set text size of viewOptions to 16

    set position of item "Metrio.app" of container window to {180, 190}
    set position of item "Applications" of container window to {480, 190}

    close
    open
    update without registering applications
    delay 2
    close
  end tell
end tell
APPLESCRIPT

sync
test -f "$MOUNT_DIR/.DS_Store"
test -d "$MOUNT_DIR/Metrio.app"
test -L "$MOUNT_DIR/Applications"

hdiutil detach "$MOUNT_DIR" -quiet

# Convert the styled writable image into the compressed release artifact.
hdiutil convert "$RW_DMG"   -format UDZO   -imagekey zlib-level=9   -ov   -o "$OUT" >/dev/null

codesign --force --sign "$IDENTITY" --timestamp "$OUT"
codesign --verify --verbose=2 "$OUT"
