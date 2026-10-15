#!/usr/bin/env bash
# Requires every Mach-O file in the bundle to contain the expected architecture, and the main
# executable to be EXACTLY that single architecture (no fat/mixed binary, no renamed artifact).
#   scripts/ci/verify-app-arch.sh <Metrio.app> <arm64|x86_64>
set -euo pipefail

APP="${1:?usage: verify-app-arch.sh <app> <arm64|x86_64>}"
ARCH="${2:?usage: verify-app-arch.sh <app> <arm64|x86_64>}"

EXEC_NAME="$(plutil -extract CFBundleExecutable raw "$APP/Contents/Info.plist")"
MAIN="$APP/Contents/MacOS/$EXEC_NAME"
ACTUAL="$(lipo -archs "$MAIN")"
echo "main executable $EXEC_NAME: $ACTUAL"
file "$MAIN"
[ "$ACTUAL" = "$ARCH" ] || { echo "Main executable architecture is '$ACTUAL', expected exactly '$ARCH'" >&2; exit 1; }

bad=0; count=0
while IFS= read -r -d '' f; do
  if file -b "$f" | grep -q "Mach-O"; then
    count=$((count + 1))
    archs="$(lipo -archs "$f" 2>/dev/null || true)"
    case " $archs " in
      *" $ARCH "*) ;;
      *) echo "INCOMPATIBLE: $f has [$archs], need $ARCH" >&2; bad=1 ;;
    esac
  fi
done < <(find "$APP" -type f -print0)
[ "$bad" = 0 ] || exit 1
echo "OK: $count Mach-O files in the bundle all contain $ARCH; main executable is $ARCH only"
