#!/usr/bin/env bash
# Submits a file to Apple notarization with an App Store Connect API key and requires "Accepted".
#   scripts/ci/notarize.sh <path-to-zip-or-dmg>
# Needs: APPLE_API_KEY_PATH (.p8), APPLE_API_KEY (key id), APPLE_API_ISSUER. Never prints secrets.
set -euo pipefail

FILE="${1:?usage: notarize.sh <file>}"
: "${APPLE_API_KEY_PATH:?}" "${APPLE_API_KEY:?}" "${APPLE_API_ISSUER:?}"

RESULT="$(mktemp)"
xcrun notarytool submit "$FILE" \
  --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER" \
  --wait --output-format json > "$RESULT"

STATUS="$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(r.status))' "$RESULT")"
ID="$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(r.id))' "$RESULT")"
echo "notarization $ID: $STATUS"
if [ "$STATUS" != "Accepted" ]; then
  xcrun notarytool log "$ID" --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER" || true
  echo "Notarization was not accepted for $FILE" >&2
  exit 1
fi
