#!/usr/bin/env bash
# Requires a real Developer ID signature for the expected team/bundle with hardened runtime.
#   scripts/ci/verify-app-signature.sh <Metrio.app>
set -euo pipefail

APP="${1:?usage: verify-app-signature.sh <app>}"
TEAM="${EXPECTED_TEAM_ID:-V36L7T43H8}"
BUNDLE="${EXPECTED_BUNDLE_ID:-com.altenar.metrio}"

codesign --verify --deep --strict --verbose=2 "$APP"
INFO="$(codesign -dvv "$APP" 2>&1)"
echo "$INFO" | grep -q "Authority=Developer ID Application:" || { echo "Not signed with a Developer ID Application certificate" >&2; exit 1; }
echo "$INFO" | grep -q "TeamIdentifier=$TEAM" || { echo "Wrong team identifier (expected $TEAM)" >&2; exit 1; }
echo "$INFO" | grep -q "Identifier=$BUNDLE" || { echo "Wrong bundle identifier (expected $BUNDLE)" >&2; exit 1; }
echo "$INFO" | grep -q "flags=0x[0-9a-f]*(runtime)" || { echo "Hardened runtime is not enabled" >&2; exit 1; }
echo "$INFO" | grep -qi "Signature=adhoc" && { echo "Ad-hoc signature is not acceptable" >&2; exit 1; }
echo "OK: Developer ID signature, team $TEAM, bundle $BUNDLE, hardened runtime"
