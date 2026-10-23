# Plan: search and clean-up features (handoff)

Status on 2026-10-23. Read this file first when you continue the work.

## 1. Goal

Make Tab Warehouse the bookmark workspace for developers and QA engineers. Build 4 features, then custom tags.

| #   | Feature                   | Status                          |
| --- | ------------------------- | ------------------------------- |
| 6   | Duplicate finder          | Done, committed `89cbfa0`       |
| 2   | Command palette (⌘K)      | Done, committed `5f01083`       |
| 1   | Env switch in the popup   | Done, committed `6083322`       |
| 3   | Address bar search (`tw`) | Done, waiting for the user      |
| —   | Custom tags (env-style)   | Not started (after #3)          |
| —   | Website update            | Not started (after all of them) |

Branch: `feat/palette-omnibox-dupes` (from `main`). Nothing is pushed from this branch.

Note: the sample data in tests uses `shop.example.com`, `api.example.com`, `www.example.org` and the root folder "My Links". Use these names in every new test.

## 2. Decisions the user made

1. **Order:** #6 → #2 → #1 → #3 → custom tags.
2. **⌘K** opens the command palette. `/` still focuses the sidebar search. (`.claude/rules/ui.md` is updated.)
3. **Address bar keyword:** `tw`.
4. **Tag model:** env-style tags. One tag per link, set from the address by rules, like today. The user can add custom tag names and colors next to PROD/TEST/STAGE/LOCAL. Rename "env" to "tag" in the UI.
5. **Duplicates** have their own Settings tab (`Duplicates`, after `Bookmarks`), not a card in Bookmarks.
6. Stop after each feature. Show the result and the test output. Commit only when the user says so.

## 3. Feature #3: what exists now (uncommitted)

| File                       | Change                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extension/background.js`  | New. The module service worker with the omnibox listeners.                                                                                                           |
| `extension/manifest.json`  | Adds `"background": { "service_worker": "background.js", "type": "module" }` and `"omnibox": { "keyword": "tw" }`.                                                   |
| `extension/newtab.js`      | `boot()` reads `?q=` and runs the global search with it.                                                                                                             |
| `tests/e2e/runner.js`      | `mount()` takes a `search` value (scenario field `search` or `t.open(name, { search })`). It sets the query with `history.replaceState` before the page scripts run. |
| `tests/unit/core.test.mjs` | New `describe('omnibox')` tests. **They fail now**, because the functions below are missing from `core.js`.                                                          |

`docs/requirements.md` also has an uncommitted change from the user. Never commit it with feature work.

### 3.1 Code to add back to `extension/lib/core.js`

Another session overwrote `core.js` and this code was lost. Put it right before the line `/* ---------- duplicates ---------- */` (after `searchLinks()`):

```js
/* ---------- omnibox ---------- */
export const OMNI_MAX = 5;

export function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

function xmlMatch(text, terms) {
  if (!terms.length) return xmlEscape(text);
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text
    .split(re)
    .map((part, i) => (i % 2 ? `<match>${xmlEscape(part)}</match>` : xmlEscape(part)))
    .join('');
}

export function omniboxSuggestions(secs, text, meta = {}, rules = [], max = OMNI_MAX) {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const inTitle = (bm) => terms.every((t) => (bm.title || '').toLowerCase().includes(t));
  return searchLinks(secs, text, meta, rules)
    .sort((a, b) => inTitle(b.bm) - inTitle(a.bm))
    .slice(0, max)
    .map(({ bm, crumb }) => {
      const label = [detectEnv(bm, rules), crumb].filter(Boolean).join(' · ');
      return {
        content: bm.url,
        description: `${xmlMatch(bm.title || displayUrl(bm.url), terms)} <dim>${xmlEscape(label)}</dim> <url>${xmlMatch(displayUrl(bm.url), terms)}</url>`,
      };
    });
}

export function omniboxTarget(text, newtabUrl) {
  const t = text.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `${newtabUrl}?q=${encodeURIComponent(t)}`;
}
```

### 3.2 How #3 works

1. Type `tw` and a space in Chrome's address bar. Chrome sends the rest of the text to `background.js`.
2. On each keystroke the worker reads the settings, the bookmark tree and `linkMeta` fresh. It keeps no cache, so the rule "never cache bookmark data" holds. It builds the sidebar sections, then calls `omniboxSuggestions()`.
3. Chrome shows about 5 rows. Rows whose title matches all terms come first. Each row is `Title <dim>LABEL · Folder › Section</dim> <url>address</url>`, and the matched words are in `<match>`.
4. **Security:** Chrome reads the description as XML. Titles and URLs are user content, so `xmlEscape()` escapes them. Never put raw text into the description.
5. Enter:
   - On a suggestion, the `content` is the link URL, and it opens.
   - On typed text, the extension opens `newtab.html?q=<text>`, and the new-tab page runs the global search.
   - Chrome passes `disposition`: `currentTab` → `chrome.tabs.update`, `newForegroundTab` → `create({ active: true })`, `newBackgroundTab` → `create({ active: false })`.
6. The default row says "Search Tab Warehouse for <match>%s</match>".

### 3.3 Steps left for #3

1. Put the code from 3.1 into `core.js`. Run `node --test tests/unit/` and expect all to pass.
2. Add an e2e scenario (new file `tests/e2e/scenarios/omnibox.js`, registered in `tests/e2e/runner.js` `ALL`): open the new tab with `search: '?q=shop prod'` and check that the search box has the text, `.head h2` is "Search" and the PROD link is in the results. Add a second check: no `q` → Home opens as before.
3. Add a "Address bar search" section to `.claude/rules/business-logic.md`. Use the rules in 3.2.
4. Update `README.md`:
   - "Keyboard shortcuts": add `tw` + space in the address bar.
   - "Privacy and permissions": add one line. Say that the extension now has a background service worker only for the address bar search, and that the `omnibox` key shows no install warning. (`.claude/rules/extension.md` asks for a reason when a worker is added.)
5. Run `npx prettier --write` on the changed files, then `./tests/run.sh`. All must pass.
6. Test in real Chrome (see section 5). Check that the service worker starts with no errors and that `chrome.omnibox` exists in it. A script cannot type into the real address bar in headless Chrome. So test the pure functions with unit tests, and test `?q=` in the real new-tab page.
7. Show the user the result. Commit only when the user says so. Suggested message: `feat: search the warehouse from the address bar (tw)`.

## 4. Custom tags (after #3)

Approved on 2026-10-23. Branch `feat/custom-tags` (from `feat/omnibox`). Phases, 1 commit each, stop after each:

1. Core + unit tests (no change for users without custom tags). 2. Tags card in Settings + badges + colors.
2. Tags in every view (sort, matrix, derive, popup, Board, palette, `tw`, backup). 4. Wording rename. 5. `/update-website`.

User decisions (these replace items 1 and 7 below where they differ):

- Store only custom tags: `settings.customTags = [{ name, plain, color }]`, default `[]`. Built-ins stay the `ENVS` constant; `tagNames(settings)` = built-ins + custom.
- Custom tags come **only from address rules**. Title words (PROD/TEST/STAGE/DEV) stay for built-ins only, so `detectEnv()` does not change.
- Colors: fixed `TAG_COLORS` (teal, pink, yellow, red, cyan, grey) as `--tag-<c>-bg/-fg` tokens. Badge: `badge tag` + `data-color`.
- Reserved names: `PROD TEST STAGE LOCAL DEV GH NONE` and the color words.

1. `settings.tags = [{ name, plain, color }]`. It starts with the 4 built-in tags. Their names and colors stay fixed: CLAUDE.md forbids changes to the env colors and to the `.badge.PROD/TEST/STAGE/LOCAL/GH` classes.
2. The user can add tags such as `QA`, `UAT` or `DEMO`, with a color from a fixed palette (new tokens in `lib/shared.css`). A tag name is 1–8 capital letters or digits.
3. Keep the storage keys `envRules` and `hostMap`, so old installs and old backups still work. Change only the UI words: "Environment" → "Tag", "Env matrix" → "Tag matrix", "Labels" → "Tags".
4. Replace the fixed `ENVS` list (`extension/lib/core.js:3`) with the tag list from settings. About 30 places use it:
   - `newtab.js`: matrix columns, env sort groups, derive
   - `settings.js`: label select, sites table, legend, Try it
   - `lib/transfer.js`: `cleanImport` checks
   - `core.js`: `envText` / `parseEnvText` format, `ENV_WORDS`, `deriveUrl`, `switchTargets`, sort rank
   - `board.js` and `popup.js`: badges
5. The sites table gets one column for each tag and scrolls sideways after 4.
6. Renaming a tag updates every rule and site row. Deleting a tag asks with `confirm()` first.
7. A custom tag badge uses the class `badge tag` plus inline CSS variables for its colors.

## 5. How to test (lessons from this work)

- **Automated:** `./tests/run.sh` (syntax, unit, e2e). Filter e2e with `./tests/run.sh "palette"`. Last full result after #3: 91 unit, 176 e2e, all pass.
- **`?q=` in e2e:** Chrome refuses `history.replaceState` in an `about:srcdoc` frame. When a scenario sets `search`, `mount()` writes the page with `document.open()/write()`, so the frame has an `http://` address.
- **Real UI:** start Chrome for Testing from `~/Library/Caches/ms-playwright/chromium-*/…/Google Chrome for Testing` with `--load-extension=<extension dir> --user-data-dir=<temp dir> --remote-debugging-pipe --headless=new`, like `tests/perf/memprobe.mjs` does. Then drive it with CDP:
  - Open `chrome://newtab/`, attach, run `Runtime.evaluate` to make bookmarks with `chrome.bookmarks.create`.
  - Send real keys with `Input.dispatchKeyEvent` (`modifiers: 4` = ⌘) and real clicks with `Input.dispatchMouseEvent` (`modifiers: 8` = Shift).
  - Take screenshots with `Page.captureScreenshot`.
- **Popup:** a script can open it with `chrome.action.openPopup()` (call it from the new-tab page with `userGesture: true`). But then `activeTab` does not give it the tab URL. For the test only, load a copy of `extension/` with `"tabs"` added to `permissions`. Never ship that permission.
- The real-UI test found a bug that the e2e tests missed (`replaceChildren(null)` printed "null"). Always do a real-UI check before you report a feature as done.

## 6. Rules to remember

- Plan first, ask before each big step, never commit or push without the user's word (`~/.claude/CLAUDE.md`).
- No code comments unless the user asks.
- Every behaviour change updates `.claude/rules/business-logic.md` and adds a test in the same change.
- Commit messages: Conventional Commits, and every line of the body must be at most 100 characters, or commitlint rejects the commit.
- Stage files by name. Never stage `docs/requirements.md`.
- Before you edit, run `ListAgents`. If another session works in this project, stop and ask the user (this caused the lost `core.js` code).
- After all features: run `/update-website`. `site/index.html` still says "⌘K or /" opens search, and it must show the palette, the Duplicates tab, the popup env switch and `tw`.
