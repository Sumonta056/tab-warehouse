---
name: regression-check
description: Prove a change did not break existing behaviour — run the unit + end-to-end suite, read failures, add or update scenarios for new rules. Use after any code change, before saying "done", before a release, or when asked to "run tests", "check for regressions", "add test cases".
---

# Regression check

The suite is dependency-free: `node --test` for pure logic, headless Chrome for the real pages with a fake `chrome.*` API. One command runs everything:

```
./tests/run.sh               # syntax + unit + all e2e scenarios
./tests/run.sh "sections"    # only e2e scenarios whose name contains the text
```

Exit code 0 = all green. The e2e part prints `pass N / fail M / total T` and one block per failure.

## Layout

```
tests/unit/<layer>/<module>.test.mjs  one file per module under extension/<layer>/ (node --test)
tests/unit/architecture.test.mjs      layer dependency rule, and a test file for every domain/ and services/ module
tests/unit/styles.test.mjs            every stylesheet linked in cascade order, px font-sizes scaled
tests/unit/fake-chrome.mjs            in-memory chrome.* for services tests
tools/coverage-gate.mjs               run by run.sh: domain/ files >= 90 % lines, services/ files >= 80 %
tests/e2e/chrome-stub.js        fake chrome.bookmarks / storage / tabs / runtime (state lives in the runner page)
tests/e2e/fixtures.js           base() tree: My Links > Sprint tasks (+Blocked), Shop API (4 envs), GITHUB - PIN, Empty, Loose; Other bookmarks > Home
tests/e2e/runner.html|js        loads newtab.html / popup.html in an iframe per scenario, helpers on `t`
tests/e2e/scenarios/*.js        newtab (folders), sections, categories, home, popup, …; ui.js checks each ui/ piece alone
tests/serve.py                  no-cache static server used by run.sh and for visual debugging
tests/run.sh                    starts tests/serve.py, runs everything, parses E2E_RESULT
```

## When a test fails

1. Read the failure line: it names the scenario and the expected vs actual value.
2. Decide which side is wrong. Check `.claude/rules/business-logic.md`. If the rule says the old behaviour is correct, the code regressed — fix the code. If the rule changed on purpose, update the rule **and** the test in the same change. Never weaken an assertion just to get green.
3. Debug visually: `python3 -I tests/serve.py 8799` from the repo root (sends `Cache-Control: no-store`, so edited CSS/JS is never stale), open `http://127.0.0.1:8799/tests/e2e/runner.html?only=<name>` in Chrome (or with the Chrome DevTools MCP: `new_page`, `take_screenshot`, `list_console_messages`). The iframe shows the app; `window.__harness` holds the fake tree and storage.
4. Page JS errors are collected automatically and fail the scenario (`page error: …`).

## Adding tests for a new feature

1. Write the rule in `.claude/rules/business-logic.md`.
2. Pure logic → export it from the matching `domain/<topic>.js` and test it in `tests/unit/domain/<topic>.test.mjs`.
3. Behaviour → add a scenario object to the matching `tests/e2e/scenarios/*.js`:
   ```js
   { area: 'folders', name: 'what the user sees, in plain words', page: 'newtab', fixture: () => base({ /* overrides */ }),
     async run(t) { await t.folder('Shop API'); t.drag(t.row('31'), t.row('32'), 'after'); await t.settle(); t.eq(t.kids('30'), ['32','31','33','34'], 'order'); } }
   ```
   Helpers: `t.$ t.$$ t.click t.dblclick t.key t.type t.context t.menu(label) t.menuLabels t.drag(src,tgt,'before'|'after'|'center') t.answer(...promptValues) t.confirm(bool) t.settle() t.sleep(ms) t.until(fn) t.reload() t.folder(title) t.nav(title) t.row(id) t.part(title) t.catHeader(name) t.toast() t.node(id) t.kids(id) t.settings() t.store t.tabs t.H`.
   Assertions: `t.eq(actual, expected, msg)`, `t.ok(cond, msg)`.
4. Assert on **state** (`t.node`, `t.kids`, `t.settings()`, `t.store`) and on what the user sees — not on private functions.
5. Prove the test can fail: temporarily break the code it guards, run `./tests/run.sh "<name>"`, see it fail, restore. A test that cannot fail is not a test.
6. Network: tests must not need it. Use `data:` image URLs for icons.

## Known limits of the fake API

- No real `_favicon` service (tiles fall back to letters) and no network images.
- `prompt()`/`confirm()` are answered from `t.answer()` / `t.confirm()`; file pickers are not exercised (resize logic is browser-only).
- Drop only fires when `dragover` called `preventDefault()`, like a real browser.
