#!/usr/bin/env bash
# Validates the workflow_dispatch inputs and, for a non-publishing RC build, resolves the requested
# source ref to ONE full commit SHA and checks it out (detached). Changes no public state: it never
# commits, tags, pushes or edits any file.
#   scripts/ci/resolve-rc-target.sh <rc|release> [target_ref]
# Writes to $GITHUB_OUTPUT (when set): rc=true|false, sha=<40-hex>, version=<package.json version>.
set -euo pipefail

MODE="${1:?usage: resolve-rc-target.sh <rc|release> [target_ref]}"
TARGET="${2:-}"
out() { if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1" >> "$GITHUB_OUTPUT"; fi; }

if [ "$MODE" != "rc" ]; then
  if [ "$MODE" != "release" ]; then echo "::error::mode must be rc or release (got '$MODE')"; exit 1; fi
  if [ -n "$TARGET" ]; then echo "::error::target_ref is only valid with mode=rc"; exit 1; fi
  out "rc=false"
  exit 0
fi

if [ -z "$TARGET" ]; then echo "::error::mode=rc requires target_ref (a commit SHA, branch or tag)"; exit 1; fi
if ! printf '%s' "$TARGET" | grep -Eq '^[A-Za-z0-9._/-]+$' || [[ "$TARGET" == -* ]]; then
  echo "::error::target_ref '$TARGET' is not a valid git ref"; exit 1
fi

SHA="$(git rev-parse --verify --quiet "${TARGET}^{commit}" || true)"
if ! printf '%s' "$SHA" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "::error::target_ref '$TARGET' does not resolve to a commit in this repository"; exit 1
fi

# A SHA (full or abbreviated) must resolve to exactly that commit, never to a ref that happens to
# share its spelling.
if printf '%s' "$TARGET" | grep -Eq '^[0-9a-fA-F]{7,40}$'; then
  WANT="$(printf '%s' "$TARGET" | tr 'A-F' 'a-f')"
  if [ "${#WANT}" -eq 40 ]; then
    if [ "$SHA" != "$WANT" ]; then echo "::error::resolved SHA $SHA does not equal requested SHA $WANT"; exit 1; fi
  elif [[ "$SHA" != "$WANT"* ]]; then
    echo "::error::resolved SHA $SHA does not start with requested SHA $WANT"; exit 1
  fi
fi

for f in scripts/ci/package-target.sh scripts/release-targets.mjs scripts/verify-build-provenance.mjs; do
  git cat-file -e "$SHA:$f" 2>/dev/null || { echo "::error::$f is missing at $SHA; it is not a buildable release commit"; exit 1; }
done

VERSION="$(git show "$SHA:package.json" | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version')"
if ! printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "::error::package.json version '$VERSION' at $SHA is not X.Y.Z"; exit 1
fi

git checkout --quiet --detach "$SHA"
echo "RC build: requested '$TARGET' -> source commit $SHA (version $VERSION, NOT published)"
out "rc=true"
out "sha=$SHA"
out "version=$VERSION"
