---
name: debug-extension
description: Diagnose a bug in this Chrome extension — blank page, missing links, drag not working, settings not saving, console errors. Use when something in the warehouse page or popup misbehaves.
---

# Debug the extension

Get the facts first; most bugs are one of five things.

1. **Where is the error?** New-tab page: open a new tab → right-click → Inspect → Console. Popup: right-click the toolbar icon → Inspect popup. Card-level errors (manifest, CSP): `chrome://extensions` → "Errors" on the card.
2. **Common causes, in order of likelihood**
   - *Blank or partial page*: a thrown error inside `renderPage()`/`renderBody()`. The stack points at the row. Usually a `null` node after a `refresh()` (stale `current`) or a `h()` child that is `undefined` inside an array (use `null`/`false` to skip).
   - *Links missing*: `resolveRoot()` picked the wrong folder — check Settings → Root folder. Subfolders two levels down are intentionally not shown.
   - *Drag does nothing*: row reorder only works in **Manual** sort and within the same folder; cross-folder moves must be dropped on a sidebar item. Check `drag` is set in `dragstart` (the `.grip` must have `draggable`).
   - *Settings not saved*: `saveSettings()` merges the whole object; make sure the key exists in `DEFAULT_SETTINGS`. Inspect `chrome.storage.local.get('settings')` in the console.
   - *A menu action does nothing after another change*: a stale object. `storage.onChanged` replaces `settings` objects; look items up by id (see business-logic.md).
   - *Form submit does nothing*: browser validation on `type=url`; forms that normalise input themselves need `novalidate`.
   - *Home empty or doubled*: check `settings.home.folderId` / `seeded` and the *Home* folder in Other bookmarks.
   - *Favicon broken*: `_favicon/` needs the `favicon` permission; otherwise `iconEl()` falls back to letters, which is fine.
3. **Reproduce as a failing test first**: add a scenario to `tests/e2e/scenarios/*.js` that shows the bug (see `/regression-check`), run `./tests/run.sh "<name>"`, see it fail. In real Chrome, a test folder with one PROD, one TEST and one localhost link is the smallest manual repro.
4. **Fix at the source**, not with a try/catch around the render.
5. **Verify** with `./tests/run.sh` (the new scenario must pass, nothing else may turn red) and a card reload. If the fix touches `chrome.bookmarks.move` index maths, test all four cases: up/down within folder, before/after target.
