---
name: add-feature
description: Add or change a feature in the warehouse new-tab page, Home, or popup. Use when asked for a new view, sort, filter, menu item, setting, keyboard shortcut, or UI change in this extension.
---

# Add a feature

0. **Read the rules first:** `.claude/rules/business-logic.md` (what must keep working), `ui.md`, `extension.md`, `bookmarks-api.md`. Plan the change and get approval before writing code.
1. **Locate the layer.** Fixed values → `constants/`. Pure logic → `domain/<topic>.js` (export it so it can be unit-tested). `chrome.*` calls → `services/`. Reusable DOM pieces → `ui/`. Shared page state and save actions → `state/`. Screens → `views/<screen>/` (sidebar, folder, search, schedule, board, home, palette, settings, popup); a view never imports another view, it gets cross-screen functions from the entry point's `ctx`. Boot and wiring → `newtab.js` / `popup.js` / `background.js`. A new view is lazy-loaded via `import()` in `newtab.js` (an entry in `LOADERS` and `viewsFor()`); only Home and the sidebar are static imports. Eager modules must be in the `<link rel="modulepreload">` list of `newtab.html` / `popup.html` (a new static import of any file means a new preload line); `tests/unit/architecture.test.mjs` enforces it and prints what to add. Styles → `styles/ui/<piece>.css` if shared, else `styles/views/<screen>.css` (tokens in `styles/tokens.css`), linked in `newtab.html` / `popup.html`.
2. **Persisted?** Decide where it lives before writing UI:
   - per folder → `folderPrefs()` / `setFolderPrefs(id, patch)` and add the default to `folderPrefs()`
   - global → add the default to `DEFAULT_SETTINGS` (or `DEFAULT_HOME`) in `constants/defaults.js`, save via `saveSettings()`
   - large blobs (images) → their own `chrome.storage.local` key, never inside `settings`
   - bookmark content → `chrome.bookmarks.*` only, never storage
   - when changing a stored list (categories, colors), look items up by **id** in the current `settings`, never through an object captured at render time
3. **Build with `h()`**, reuse existing classes (see `ui.md`). Put the control where its siblings are: sort/view/show in `.toolbar`, per-link actions in `linkMenu()` and per-folder actions in `folderMenu()` (`views/folder/menus.js`), section actions in `partMenu()` (`views/folder/parts.js`), category actions in `catMenu()` (`views/sidebar/categories.js`), any global or Home option in the matching tab file of `views/settings/`.
4. **Re-render path:** after a settings change call `renderPage()`/`renderBody()`/`renderNav()`; after a bookmark change do nothing — the debounced `chrome.bookmarks` listener calls `refresh()`.
5. **Rules + tests in the same change** (see `/regression-check`):
   - add or update the rule in `.claude/rules/business-logic.md`
   - unit test for new pure logic in `tests/unit/domain/<topic>.test.mjs`; a new `chrome.*` call in `tests/unit/services/<api>.test.mjs` with the fake in `tests/unit/fake-chrome.mjs` (a new `domain/` or `services/` file without its test file fails `architecture.test.mjs`; the coverage gate wants ≥ 90 % lines for domain, ≥ 80 % for services)
   - a new or changed `ui/` piece → a scenario in `tests/e2e/scenarios/ui.js` that checks it alone
   - e2e scenario(s) in `tests/e2e/scenarios/*.js` for the user-visible behaviour, including the edge cases (empty folder, Unsorted, sections, categories, Home)
   - prove each new test fails when the feature is broken
6. **Check:** `./tests/run.sh` must be fully green. Then reload at `chrome://extensions`, open a new tab, try it with the Shop API folder (longest URLs, all four envs), an empty folder, a folder with sections, and Home.
7. **Document:** README.md (feature table / section + changelog line). After the feature is committed, run `/update-website` so the website, its live demo, the screenshots and the README show it.

Checklist before saying done: `./tests/run.sh` green (layers, coverage gate and e2e) · only `services/` calls `chrome.*` · keyboard reachable · focus visible · works in URL mode and Title mode · works with Manual and Env sort · works with and without categories · works in a folder with sections · nothing truncates a URL on the folder page · no new permission without a README line.

For a larger feature, hand the build to the `feature-builder` agent and the verification to the `regression-guard` agent (see `.claude/agents/`).
