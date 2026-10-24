#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORE=0
if [ "${1:-}" = "--store" ]; then
  STORE=1
  shift
fi
REF="${2:-HEAD}"
VERSION="$(git -C "$ROOT" show "$REF:extension/manifest.json" | python3 -c 'import json,sys;print(json.load(sys.stdin)["version"])')"
SUFFIX=""
[ "$STORE" = 1 ] && SUFFIX="-store"
OUT="${1:-$ROOT/tab-warehouse-$VERSION$SUFFIX.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

test -d "$ROOT/node_modules/esbuild" || { echo "esbuild is missing: run npm install first." >&2; exit 1; }
mkdir -p "$TMP/src"
git -C "$ROOT" archive "$REF" | tar -x -C "$TMP/src"
ln -s "$ROOT/node_modules" "$TMP/src/node_modules"
node "$TMP/src/tools/build.mjs" "$TMP/tab-warehouse" >/dev/null
cp "$TMP/src/LICENSE" "$TMP/tab-warehouse/"
test -f "$TMP/tab-warehouse/manifest.json"
rm -f "$OUT"
if [ "$STORE" = 1 ]; then
  (cd "$TMP/tab-warehouse" && zip -qr -X "$OUT" .)
else
  (cd "$TMP" && zip -qr -X "$OUT" tab-warehouse)
fi
echo "$OUT"
