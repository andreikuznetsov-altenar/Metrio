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

# Persist the Finder layout through the mounted path instead of addressing
# "disk Metrio" by name. GitHub-hosted macOS runners can mount the image at a
# custom path without exposing a Finder disk object with that exact name.
style_dmg() {
  osascript - "$MOUNT_DIR" <<'APPLESCRIPT'
on run argv
  set mountPath to item 1 of argv
  set targetFolder to POSIX file mountPath as alias

  tell application "Finder"
    open targetFolder
    delay 1

    tell container window of targetFolder
      set current view to icon view
      set toolbar visible to false
      set statusbar visible to false
      set bounds to {100, 100, 760, 500}
    end tell

    set viewOptions to icon view options of container window of targetFolder
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 128
    set text size of viewOptions to 16

    set position of item "Metrio.app" of targetFolder to {180, 190}
    set position of item "Applications" of targetFolder to {480, 190}

    update targetFolder without registering applications
    delay 2
    close container window of targetFolder
  end tell
end run
APPLESCRIPT
}

# Finder automation on hosted runners can be briefly unavailable right after mount.
# Retry a few times, but never publish an unstyled DMG.
styled=false
for attempt in 1 2 3; do
  if style_dmg; then
    styled=true
    break
  fi
  echo "Finder DMG styling attempt $attempt failed; retrying…" >&2
  sleep 2
done

if [[ "$styled" != "true" ]]; then
  echo "Failed to persist Finder DMG layout." >&2
  exit 1
fi

sync
test -f "$MOUNT_DIR/.DS_Store"
test -d "$MOUNT_DIR/Metrio.app"
test -L "$MOUNT_DIR/Applications"

hdiutil detach "$MOUNT_DIR" -quiet

# Convert the styled writable image into the compressed release artifact.
hdiutil convert "$RW_DMG"   -format UDZO   -imagekey zlib-level=9   -ov   -o "$OUT" >/dev/null

codesign --force --sign "$IDENTITY" --timestamp "$OUT"
codesign --verify --verbose=2 "$OUT"
