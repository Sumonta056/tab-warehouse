---
name: debug-extension
description: Diagnose a bug in this Chrome extension — blank page, missing links, drag not working, settings not saving, console errors. Use when something in the warehouse page or popup misbehaves.
---

# Debug the extension

Get the facts first; most bugs are one of five things.

1. **Where is the error?** New-tab page: open a new tab → right-click → Inspect → Console. Popup: right-click the toolbar icon → Inspect popup. Card-level errors (manifest, CSP): `chrome://extensions` → "Errors" on the card.
2. **Common causes, in order of likelihood**
   - _Blank or partial page_: a thrown error inside `renderPage()`/`renderBody()`. The stack points at the row. Usually a `null` node after a `refresh()` (stale `current`) or a `h()` child that is `undefined` inside an array (use `null`/`false` to skip).
   - _Links missing_: `resolveRoot()` picked the wrong folder — check Settings → Root folder. Subfolders two levels down are intentionally not shown.
   - _Drag does nothing_: row reorder only works in **Manual** sort and within the same folder; cross-folder moves must be dropped on a sidebar item. Check `drag` is set in `dragstart` (the `.grip` must have `draggable`).
   - _Settings not saved_: `saveSettings()` merges the whole object; make sure the key exists in `DEFAULT_SETTINGS`. Inspect `chrome.storage.local.get('settings')` in the console.
   - _A menu action does nothing after another change_: a stale object. `storage.onChanged` replaces `settings` objects; look items up by id (see business-logic.md).
   - _Form submit does nothing_: browser validation on `type=url`; forms that normalise input themselves need `novalidate`.
   - _Home empty or doubled_: check `settings.home.folderId` and the _Home_ folder in Other bookmarks.
   - _Favicon broken_: `_favicon/` needs the `favicon` permission; otherwise `iconEl()` falls back to letters, which is fine.
3. **Reproduce as a failing test first**: add a scenario to `tests/e2e/scenarios/*.js` that shows the bug (see `/regression-check`), run `./tests/run.sh "<name>"`, see it fail. In real Chrome, a test folder with one PROD, one TEST and one localhost link is the smallest manual repro.
4. **Fix at the source**, not with a try/catch around the render.
5. **Verify** with `./tests/run.sh` (the new scenario must pass, nothing else may turn red) and a card reload. If the fix touches `chrome.bookmarks.move` index maths, test all four cases: up/down within folder, before/after target.
