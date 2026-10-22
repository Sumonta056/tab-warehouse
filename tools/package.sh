#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="${2:-HEAD}"
VERSION="$(git -C "$ROOT" show "$REF:extension/manifest.json" | python3 -c 'import json,sys;print(json.load(sys.stdin)["version"])')"
OUT="${1:-$ROOT/tab-warehouse-$VERSION.zip}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/tab-warehouse"
git -C "$ROOT" archive "$REF:extension" | tar -x -C "$TMP/tab-warehouse"
git -C "$ROOT" archive "$REF" -- LICENSE | tar -x -C "$TMP/tab-warehouse"
test -f "$TMP/tab-warehouse/manifest.json"
rm -f "$OUT"
(cd "$TMP" && zip -qr -X "$OUT" tab-warehouse)
echo "$OUT"
