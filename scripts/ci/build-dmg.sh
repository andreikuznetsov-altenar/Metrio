#!/usr/bin/env bash
# Builds the distributable DMG from an ALREADY STAPLED Metrio.app and Developer ID signs it.
#   scripts/ci/build-dmg.sh <Metrio.app> <output.dmg> "<signing identity>"
set -euo pipefail

APP="${1:?}"; OUT="${2:?}"; IDENTITY="${3:?}"
STAGE="$(mktemp -d)"
ditto "$APP" "$STAGE/Metrio.app"
ln -s /Applications "$STAGE/Applications"
rm -f "$OUT"
hdiutil create -volname "Metrio" -srcfolder "$STAGE" -fs HFS+ -format UDZO -ov "$OUT" >/dev/null
codesign --force --sign "$IDENTITY" --timestamp "$OUT"
codesign --verify --verbose=2 "$OUT"
rm -rf "$STAGE"
