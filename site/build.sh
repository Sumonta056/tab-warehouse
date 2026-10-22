#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/_site}"

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT/site/." "$OUT/"
rm "$OUT/build.sh"
mkdir -p "$OUT/demo"
git -C "$ROOT" archive HEAD -- '*.html' '*.css' '*.js' manifest.json lib icons \
  | tar -x -C "$OUT/demo" --exclude 'tests' --exclude 'tools' --exclude 'site' --exclude '.*' --exclude 'commitlint.config.mjs'
for page in newtab popup; do
  perl -0pi -e 's|<script type="module"|<script src="demo-chrome.js"></script>\n    <script type="module"|' "$OUT/demo/$page.html"
  perl -0pi -e 's|<head>|<head>\n    <meta name="robots" content="noindex" />|' "$OUT/demo/$page.html"
  grep -q 'demo-chrome.js' "$OUT/demo/$page.html"
done
echo "Built $OUT"
