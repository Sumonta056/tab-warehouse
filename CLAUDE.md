# Tab Warehouse — Chrome extension

Bookmarks as a warehouse: a Home page (clock + link tiles), a resizable folder sidebar with categories on the left, one folder's links on the right with full URLs, env tags (PROD/TEST/STAGE/LOCAL), sorting, an env-matrix view, inline editing and drag-and-drop. Manifest V3, vanilla ES modules, **no build step, no dependencies**.

## Layout

```
manifest.json          MV3: newtab override + action popup + ⌘⇧B command
newtab.html/.css/.js   The warehouse page (sidebar + folder page)
home.js                Home view: clock, tiles, links list, default links
settings.js            Settings view (right pane, 5 tabs); opened by the sidebar gear
popup.html/.js         Toolbar popup: save the current tab into any folder
lib/core.js            Shared: settings schema, env detection, derive, sort, matrix, DOM helpers
lib/transfer.js        Export (JSON w/ prefs, Netscape HTML) and merge-import
tools/make-icons.py    Build icons/ from any logo
lib/shared.css         Design tokens + shared components (.row, .badge, .btn, .menu, .toast)
icons/                 16/48/128 PNG
tests/                 run.sh · unit/ (node --test) · e2e/ (headless Chrome + fake chrome.* API)
site/                  GitHub Pages website + live demo (site/build.sh, deployed by .github/workflows/pages.yml)
.claude/rules/         Always-on conventions; business-logic.md is the behaviour spec
.claude/skills/        Workflows: add-feature, regression-check, debug-extension, release, update-website
.claude/agents/        feature-builder (implements), regression-guard (verifies)
```

## How it works (read before changing anything)

- **Source of truth is `chrome.bookmarks`.** Titles, URLs, folder membership and manual order live in Chrome. We never cache bookmark data; every change calls the API and `refresh()` re-renders from `chrome.bookmarks.getTree()` via the `onCreated/onRemoved/onChanged/onMoved/onChildrenReordered` listeners.
- **Extension-only state lives in `chrome.storage.local.settings`** (see `DEFAULT_SETTINGS` in `lib/core.js`): root folder, sidebar `order`, `lastFolder`, per-folder `folders[id] = { sort, view, show, closed }`, `envRules`, `hostMap`, `showFavicons`. Sidebar order deliberately does _not_ reorder Chrome's tree.
- **Home** is the default view. Its links are a bookmark folder _Home_ in Other bookmarks (`settings.home.folderId`), empty on a new install (no built-in links); icon overrides in `storage.local.homeIcons`, background in `storage.local.homeBg`. The Home folder is never a sidebar section.
- **Sidebar sections** = child folders of the root folder, plus a virtual `Unsorted` section for loose links directly under root (`id = "unsorted:<rootId>"`, `virtual: true`). Virtual sections can't be renamed, deleted or dragged.
- **Env** comes from `detectEnv()` (`explainEnv()` also says why): ordered host-substring rules (empty by default; edited in Settings › Environments), then PROD/TEST/STAGE/DEV words in the title. **Derive** (`deriveUrl()`) swaps the host for the same path using `hostMap`.
- **Rendering** is full re-render with the `h()` DOM helper. Never use `innerHTML` with bookmark data (titles/URLs are user content). `svgIcon()` is the only `innerHTML` and takes fixed strings.
- **Drag & drop** is native HTML5 DnD. `drag` (module-level) holds `{ kind: 'link'|'folder', id, parentId }`. Row reorder only in Manual sort; dropping a row on a sidebar item moves it to that folder. Folder drag reorders `settings.order` only.
- **Categories** (`settings.categories`, `folderCat`) group sidebar folders; **sections** are a folder's direct subfolders shown as headers on the folder page. Full rules: `.claude/rules/business-logic.md`.
- Same-parent `chrome.bookmarks.move` quirk: pass the target's **current** index for "drop before" and `index + 1` for "drop after"; Chrome adjusts for the removed item.

## Commands

There is no build. Load unpacked at `chrome://extensions`, then after edits click the ↻ on the extension card and open a new tab.

- First time: `npm install`. It installs the dev tools and the git hooks: pre-commit runs Prettier on staged files and `npm run test:fast`; commit-msg enforces Conventional Commits (`feat:`, `fix:`, `docs:` …); pre-push runs `./tests/run.sh`.
- Format: `npm run format` (Prettier, config in `.prettierrc.json`).
- Full check (syntax + unit + e2e, ~10 s): `./tests/run.sh` — must be green before any change is called done. Filter e2e: `./tests/run.sh "sections"`.
- RAM / leak / render-speed check on the real extension (~1 min, needs Chrome for Testing): `node tests/perf/memprobe.mjs`. See the `/perf-check` skill.
- Debug a scenario visually: `python3 -I tests/serve.py 8799` (no-cache server), open `http://127.0.0.1:8799/tests/e2e/runner.html?only=<name>`.
- Package: see the `/release` skill (excludes `.claude/`, `tests/`).

## Conventions

- Keep the extension dependency-free at runtime. If something seems to need a library, it doesn't. Dev tools (Husky, Prettier, lint-staged, commitlint) live in `devDependencies` and never ship.
- UI text: sentence case, plain verbs ("Save", not "Submit"). Buttons say what happens.
- All interactive elements ≥ 28 px tall in dense lists, ≥ 36 px in toolbars, ≥ 44 px for primary actions. Keep `:focus-visible` working.
- Colors only via tokens in `lib/shared.css`. Env colors: PROD orange, TEST blue, STAGE purple, LOCAL green — do not reassign.
- Every destructive action gets either an undo toast (links, Home tiles) or a confirm (folders, sections, categories).
- Every behaviour change updates `.claude/rules/business-logic.md` and adds/updates a test in the same change. Never weaken a test to make it pass.
- Match the existing code style: 2-space indent, single quotes, semicolons, early returns, no classes.

## Don't

- Don't add a bundler, framework, TypeScript, or runtime npm packages.
- Don't store bookmark titles/URLs in `chrome.storage` — they're already in Chrome.
- Don't add new permissions without saying why in the PR/commit message.
- Don't change the env color mapping or the badge/pill class names (`PROD` `TEST` `STAGE` `LOCAL` `GH`); CSS depends on them.
