#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/_site}"

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT/site/." "$OUT/"
rm "$OUT/build.sh"
test -d "$ROOT/node_modules/esbuild" || { echo "esbuild is missing: run npm ci first." >&2; exit 1; }
SRC="$(mktemp -d)"
trap 'rm -rf "$SRC"' EXIT
git -C "$ROOT" archive HEAD | tar -x -C "$SRC"
ln -s "$ROOT/node_modules" "$SRC/node_modules"
node "$SRC/tools/build.mjs" "$SRC/dist" >/dev/null
cp -R "$SRC/dist/." "$OUT/demo/"
for page in newtab popup palette; do
  perl -0pi -e 's|<script type="module"|<script src="demo-chrome.js"></script>\n    <script type="module"|' "$OUT/demo/$page.html"
  perl -0pi -e 's|<head>|<head>\n    <meta name="robots" content="noindex" />|' "$OUT/demo/$page.html"
  grep -q 'demo-chrome.js' "$OUT/demo/$page.html"
done
echo "Built $OUT"
