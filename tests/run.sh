#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ONLY="${1:-}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PORT="${PORT:-8799}"
status=0

echo "== syntax =="
for f in $(find extension -name '*.js'); do node --check "$f" || status=1; done

echo "== unit (node --test) + coverage gate =="
node tools/coverage-gate.mjs || status=1

echo "== e2e server =="
if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "e2e: port $PORT is already in use by another server. Stop it (lsof -nP -iTCP:$PORT -sTCP:LISTEN) or run with PORT=<free port>."
  exit 1
fi
python3 -I tests/serve.py "$PORT" "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for _ in $(seq 1 50); do curl -s "http://127.0.0.1:$PORT/tests/e2e/runner.html" >/dev/null && break; sleep 0.1; done
if ! kill -0 "$SERVER" 2>/dev/null; then
  echo "e2e: the test server could not start on port $PORT."
  exit 1
fi
e2e() {
  local root="$1" profile out line
  echo "== e2e on $root/ (headless Chrome) =="
  profile="$(mktemp -d)"
  out="$("$CHROME" --headless=new --disable-gpu --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE ssl.gstatic.com" --no-first-run --no-default-browser-check --user-data-dir="$profile" \
    --window-size=1920,1000 --virtual-time-budget=300000 --run-all-compositor-stages-before-draw --dump-dom "http://127.0.0.1:$PORT/tests/e2e/runner.html?root=$root${ONLY:+&only=$ONLY}" 2>/dev/null)"
  rm -rf "$profile"
  line="$(printf '%s' "$out" | grep -o 'E2E_RESULT {.*}' | head -1 | sed 's/&quot;/"/g; s/&gt;/>/g; s/&lt;/</g; s/&amp;/\&/g')"
  if [ -z "$line" ]; then
    echo "e2e: no result (runner did not finish). Open http://127.0.0.1:$PORT/tests/e2e/runner.html?root=$root in Chrome to debug."
    status=1
  else
    printf '%s\n' "${line#E2E_RESULT }" | python3 -I tests/e2e/report.py || status=1
  fi
}

e2e extension

echo "== build (tools/build.mjs) =="
if node tools/build.mjs; then
  e2e dist
else
  status=1
fi
exit $status
