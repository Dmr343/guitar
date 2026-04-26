#!/usr/bin/env bash
# Regression check: ensure shared/*.js + tools/*.html stay compatible with file://
#
# Why: <script type="module"> and ES module syntax fail with file:// (CORS).
# Daniel opens HTML tools by double-clicking, so the page goes blank.
# See memory: file_protocol.md
#
# Run: bash tools/shared/check-no-modules.sh
# Exits non-zero if any forbidden pattern is found.

set -e
cd "$(dirname "$0")/../.."

fail=0

# 1. No <script type="module"> in any HTML under tools/
hits=$(grep -rnE '<script[^>]*type="module"' tools/ --include='*.html' || true)
if [ -n "$hits" ]; then
  echo "✗ Found <script type=\"module\"> — breaks file://"
  echo "$hits"
  fail=1
fi

# 2. No top-level `import ... from` in shared/*.js
hits=$(grep -nE '^import .* from ' tools/shared/*.js || true)
if [ -n "$hits" ]; then
  echo "✗ Found ES module 'import' in shared/*.js — breaks file://"
  echo "$hits"
  fail=1
fi

# 3. No top-level `export ` keyword in shared/*.js
hits=$(grep -nE '^export ' tools/shared/*.js || true)
if [ -n "$hits" ]; then
  echo "✗ Found ES module 'export' in shared/*.js — breaks file://"
  echo "$hits"
  fail=1
fi

if [ $fail -eq 0 ]; then
  echo "✓ No file:// regressions detected"
fi
exit $fail
