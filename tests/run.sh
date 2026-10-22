#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ONLY="${1:-}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8799}"
status=0

echo "== syntax =="
for f in newtab.js popup.js home.js settings.js lib/core.js lib/transfer.js; do node --check "$f" || status=1; done

echo "== unit (node --test) =="
node --test tests/unit/ 2>&1 | grep -E '^# (tests|pass|fail)|^not ok|^\s+not ok' || true
node --test tests/unit/ >/dev/null 2>&1 || status=1

echo "== e2e (headless Chrome) =="
python3 -I tests/serve.py "$PORT" "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for _ in $(seq 1 50); do curl -s "http://127.0.0.1:$PORT/tests/e2e/runner.html" >/dev/null && break; sleep 0.1; done
PROFILE="$(mktemp -d)"
URL="http://127.0.0.1:$PORT/tests/e2e/runner.html${ONLY:+?only=$ONLY}"
OUT="$("$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check --user-data-dir="$PROFILE" \
  --window-size=1920,1000 --virtual-time-budget=180000 --run-all-compositor-stages-before-draw --dump-dom "$URL" 2>/dev/null)"
rm -rf "$PROFILE"
LINE="$(printf '%s' "$OUT" | grep -o 'E2E_RESULT {.*}' | head -1 | sed 's/&quot;/"/g; s/&gt;/>/g; s/&lt;/</g; s/&amp;/\&/g')"
if [ -z "$LINE" ]; then
  echo "e2e: no result (runner did not finish). Open http://127.0.0.1:$PORT/tests/e2e/runner.html in Chrome to debug."
  status=1
else
  printf '%s\n' "${LINE#E2E_RESULT }" | python3 -I tests/e2e/report.py || status=1
fi
exit $status
