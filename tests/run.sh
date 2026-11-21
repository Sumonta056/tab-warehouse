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
PARTS="${E2E_PARTS:-4}"
e2e_part() {
  local root="$1" part="$2" profile
  profile="$(mktemp -d)"
  "$CHROME" --headless=new --use-mock-keychain --password-store=basic --disable-gpu --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE ssl.gstatic.com" --no-first-run --no-default-browser-check --user-data-dir="$profile" \
    --window-size=1920,1000 --virtual-time-budget=300000 --run-all-compositor-stages-before-draw --dump-dom "http://127.0.0.1:$PORT/tests/e2e/runner.html?root=$root&part=$part/$PARTS${ONLY:+&only=$ONLY}" 2>/dev/null |
    grep -o 'E2E_RESULT {.*}' | head -1 | sed 's/&quot;/"/g; s/&gt;/>/g; s/&lt;/</g; s/&amp;/\&/g; s/^E2E_RESULT //'
  rm -rf "$profile"
}
e2e() {
  local root="$1" dir i lines
  echo "== e2e on $root/ (headless Chrome, $PARTS parts) =="
  dir="$(mktemp -d)"
  for i in $(seq 0 $((PARTS - 1))); do e2e_part "$root" "$i" >"$dir/$i"; done
  for i in $(seq 0 $((PARTS - 1))); do
    if [ ! -s "$dir/$i" ]; then
      echo "e2e: no result for part $i of $PARTS (runner did not finish). Open http://127.0.0.1:$PORT/tests/e2e/runner.html?root=$root&part=$i/$PARTS in Chrome to debug."
      status=1
    fi
  done
  lines="$(cat "$dir"/*)"
  rm -rf "$dir"
  [ -n "$lines" ] && { printf '%s\n' "$lines" | python3 -I tests/e2e/report.py || status=1; }
}

e2e extension

echo "== build (tools/build.mjs) =="
if node tools/build.mjs; then
  e2e dist
else
  status=1
fi
exit $status
