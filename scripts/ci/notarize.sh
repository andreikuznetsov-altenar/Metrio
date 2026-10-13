#!/usr/bin/env bash
# Submits a file to Apple notarization with an App Store Connect API key and requires "Accepted".
#   scripts/ci/notarize.sh <path-to-zip-or-dmg>
# Needs: APPLE_API_KEY_PATH (.p8 file, used as-is), APPLE_API_KEY (key id), APPLE_API_ISSUER (UUID).
# Never prints secret values.
set -euo pipefail

FILE="${1:?usage: notarize.sh <file>}"

# Strip ONLY leading/trailing whitespace (spaces, tabs, CR, newlines) — pasted secrets often carry some.
trim() {
  local v="$1"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

: "${APPLE_API_KEY_PATH:?APPLE_API_KEY_PATH is not set}"
APPLE_API_ISSUER="$(trim "${APPLE_API_ISSUER:-}")"
APPLE_API_KEY="$(trim "${APPLE_API_KEY:-}")"

if [ -z "$APPLE_API_KEY" ]; then
  echo "::error::APPLE_API_KEY (App Store Connect API key id) is empty" >&2
  exit 1
fi
if ! printf '%s' "$APPLE_API_ISSUER" | grep -Eq '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$'; then
  echo "::error::APPLE_API_ISSUER is not a UUID (expected xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx; use the Issuer ID of a TEAM API key)" >&2
  exit 1
fi
if [ ! -f "$APPLE_API_KEY_PATH" ]; then
  echo "::error::API key file (APPLE_API_KEY_CONTENT) was not written" >&2
  exit 1
fi

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
