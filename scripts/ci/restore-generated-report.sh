#!/usr/bin/env bash
# After the test gate: the ONLY tracked file tests are allowed to regenerate is the pass14 parity
# report. Restore exactly that file, then require the rest of the working tree to be clean.
# Any other tracked change fails the run (the dirty-tree gate is not weakened).
set -euo pipefail

GENERATED="docs/pass14-legacy-parity-report.md"

git status --short
if ! git diff --quiet -- "$GENERATED"; then
  echo "Generated report changed during tests; diff summary:"
  git diff --stat -- "$GENERATED"
  git restore -- "$GENERATED"
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "::error::Unexpected tracked changes after the test gate:"
  git status --short
  exit 1
fi
echo "Working tree clean (tracked files)."
