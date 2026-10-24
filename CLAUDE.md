# Tab Warehouse — Chrome extension

Bookmarks as a warehouse: a Home page (clock + link tiles), a resizable folder sidebar with categories on the left, one folder's links on the right with full URLs, env tags (PROD/TEST/STAGE/LOCAL), sorting, an env-matrix view, inline editing and drag-and-drop. Manifest V3, vanilla ES modules, **no runtime dependencies**. The source runs unbundled; only the release ZIP is built (esbuild).

## Layout

```
extension/             The source and the Load unpacked folder for development. Paths below are relative to it.
  manifest.json        MV3: newtab override + action popup + omnibox + ⌘⇧B / ⌘K / ⌘⇧K commands
  newtab.html/.js      The warehouse page. newtab.js is the entry point: boot, refresh, select, page dispatch, global keys, ctx objects
  popup.html/.js       Toolbar popup entry point: save the current tab into any folder, warns on duplicates
  background.js        Service worker entry point: `tw` omnibox, quick save (⌘K), palette command (⌘⇧K)
  constants/           Fixed values only (envs, tags, sorts, themes, limits, defaults incl. DEFAULT_SETTINGS, pages, icons)
  domain/              Pure functions: no DOM, no chrome.* (env, tags, url, tree, folders, filter, sort, matrix, due, search, popup, transfer …)
  services/            The only modules that call chrome.* (storage, bookmarks, tabs, runtime, commands, omnibox, action, favicon, home-folder, import)
  ui/                  Reusable DOM pieces, no page state (dom.js h/svgIcon/highlight, toast, menu, dnd, seg, badges, icons, home-icon, pickers, theme, image, export)
  state/               Shared mutable page state: page-state.js (state + setState), folders.js / links.js (save actions), home-assets.js, popup-state.js
  views/               One folder per screen: sidebar/ folder/ search/ schedule/ board/ home/ palette/ settings/ (one file per tab) popup/
  styles/              tokens.css (design tokens), base.css, ui/ (one file per ui piece: row, badge, button, menu, toast …), views/ (one file per screen, mirrors views/)
  icons/               16/48/128 PNG
dist/                  Release build (git-ignored), written by tools/build.mjs; the ZIP and the site demo ship this
tools/                 build.mjs (esbuild release build into dist/), make-icons.py (build extension/icons/ from any logo), package.sh (builds, then zips dist/), set-shortcuts.js (console script that sets the keys), coverage-gate.mjs (unit coverage gate)
docs/                  Notes and requirements
tests/                 run.sh · unit/ (node --test) · e2e/ (headless Chrome + fake chrome.* API)
site/                  GitHub Pages website + live demo (site/build.sh, deployed by .github/workflows/pages.yml)
.claude/rules/         Always-on conventions; business-logic.md is the behaviour spec
.claude/skills/        Workflows: add-feature, regression-check, debug-extension, perf-check, release, update-website, web-store
.claude/agents/        feature-builder (implements), regression-guard (verifies)
```

## How it works (read before changing anything)

- **Source of truth is `chrome.bookmarks`.** Titles, URLs, folder membership and manual order live in Chrome. We never cache bookmark data; every change calls the API and `refresh()` re-renders from `chrome.bookmarks.getTree()` via the `onCreated/onRemoved/onChanged/onMoved/onChildrenReordered` listeners.
- **Extension-only state lives in `chrome.storage.local.settings`** (see `DEFAULT_SETTINGS` in `constants/defaults.js`): root folder, sidebar `order`, `lastFolder`, per-folder `folders[id] = { sort, view, show, closed }`, `envRules`, `hostMap`, `showFavicons`. Sidebar order deliberately does _not_ reorder Chrome's tree.
- **Home** is the default view. Its links are a bookmark folder _Home_ in Other bookmarks (`settings.home.folderId`), empty on a new install (no built-in links); icon overrides in `storage.local.homeIcons`, background in `storage.local.homeBg`. The Home folder is never a sidebar section.
- **Sidebar sections** = child folders of the root folder, plus a virtual `Unsorted` section for loose links directly under root (`id = "unsorted:<rootId>"`, `virtual: true`). Virtual sections can't be renamed, deleted or dragged.
- **Env** comes from `detectEnv()` (`explainEnv()` also says why): ordered host-substring rules (empty by default; edited in Settings › Environments), then PROD/TEST/STAGE/DEV words in the title. **Derive** (`deriveUrl()`) swaps the host for the same path using `hostMap`.
- **Rendering** is full re-render with the `h()` DOM helper. Never use `innerHTML` with bookmark data (titles/URLs are user content). `svgIcon()` is the only `innerHTML` and takes fixed strings.
- **Drag & drop** is native HTML5 DnD. `drag` (module-level) holds `{ kind: 'link'|'folder', id, parentId }`. Row reorder only in Manual sort; dropping a row on a sidebar item moves it to that folder. Folder drag reorders `settings.order` only.
- **Categories** (`settings.categories`, `folderCat`) group sidebar folders; **sections** are a folder's direct subfolders shown as headers on the folder page. Full rules: `.claude/rules/business-logic.md`.
- **Layers** (checked by `tests/unit/architecture.test.mjs`): constants ← domain ← services ← ui ← state ← views ← entry points. A view never imports another view; the entry point passes a `ctx` of functions (`select`, `renderNav`, `renderPage`, `folderMenu`, `renderRow`, `setFolderPrefs` …). Only `services/` may call `chrome.*`.
- **Where new code goes:**

  | New code                                         | Goes in                                                                                     | Its test                                                                                  |
  | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
  | A fixed value (name list, limit, default, label) | `constants/`                                                                                | Covered by the tests of the code that uses it                                             |
  | Pure logic (no DOM, no `chrome.*`, no storage)   | `domain/<topic>.js`                                                                         | `tests/unit/domain/<topic>.test.mjs` (required; ≥ 90 % lines)                             |
  | A `chrome.*` call                                | `services/<api>.js`                                                                         | `tests/unit/services/<api>.test.mjs` with `tests/unit/fake-chrome.mjs` (required; ≥ 80 %) |
  | A reusable DOM piece (takes data, returns nodes) | `ui/<piece>.js`                                                                             | A scenario in `tests/e2e/scenarios/ui.js`                                                 |
  | Shared page state or an action that saves it     | `state/`                                                                                    | Through the scenarios of the views that use it                                            |
  | A screen or part of a screen                     | `views/<screen>/`                                                                           | A scenario in `tests/e2e/scenarios/<area>.js`                                             |
  | Boot, wiring, the `ctx` passed to views          | `newtab.js` / `popup.js` / `background.js`                                                  | The e2e scenarios                                                                         |
  | Styles                                           | `styles/ui/<piece>.css` or `styles/views/<screen>.css`, linked in the HTML in cascade order | `tests/unit/styles.test.mjs`                                                              |

- **Loading** (checked by `tests/unit/architecture.test.mjs` › lazy views): only Home and the sidebar load with the page. Every other view (folder page, search, schedule, board, settings, palette) loads with `import()` in `newtab.js` the first time it opens (`LOADERS`, `viewsFor()`); a new view gets a `LOADERS` entry, never a static import.
- **Release build** (`tools/build.mjs`, checked by `tests/unit/build.test.mjs`): `dist/` holds one bundled script and one stylesheet per page (the `<link rel="stylesheet">` files concatenated in HTML order), the lazy views as separate chunks in `dist/chunks/`, and `background.js` as one file without `import()`. New stylesheets only need their `<link>` in the source HTML; new files Chrome loads by path (not imports) must be added to `COPY` in `build.mjs`.
- Same-parent `chrome.bookmarks.move` quirk: pass the target's **current** index for "drop before" and `index + 1` for "drop after"; Chrome adjusts for the removed item.

## Commands

Develop without a build: Load unpacked at `chrome://extensions` (choose `extension/`), then after edits click the ↻ on the extension card and open a new tab. The build is for release only.

- First time: `npm install`. It installs the dev tools and the git hooks: pre-commit runs Prettier on staged files and `npm run test:fast`; commit-msg enforces Conventional Commits (`feat:`, `fix:`, `docs:` …); pre-push runs `./tests/run.sh`.
- Format: `npm run format` (Prettier, config in `.prettierrc.json`).
- Release build: `npm run build` writes `dist/` (`node tools/build.mjs [out]`). Load `dist/` unpacked to try exactly what ships.
- Full check (syntax + unit + coverage gate + e2e on `extension/`, then build + the same e2e on `dist/`, about a minute): `./tests/run.sh` — must be green before any change is called done. Filter e2e: `./tests/run.sh "sections"`. It serves the repo on `PORT` (default 8799) and stops with an error when that port is already taken, so a stale server can never answer for it; use `PORT=8800 ./tests/run.sh` to run two at once.
- Coverage: `npm run coverage` prints the per-file table; `npm run coverage:gate` (`tools/coverage-gate.mjs`, also run by `tests/run.sh` and CI) fails when a `domain/` file is under 90 % line coverage or a `services/` file under 80 %. Every `domain/` and `services/` file needs its own `tests/unit/<layer>/<name>.test.mjs` (checked by `tests/unit/architecture.test.mjs`); services tests use the in-memory fake in `tests/unit/fake-chrome.mjs`.
- RAM / leak / render-speed check on the real extension (~1 min, needs Chrome for Testing): `node tests/perf/memprobe.mjs`. See the `/perf-check` skill.
- Debug a scenario visually: `python3 -I tests/serve.py 8799` (no-cache server), open `http://127.0.0.1:8799/tests/e2e/runner.html?only=<name>` (add `&root=dist` for the build; run `npm run build` first).
- Package: `./tools/package.sh` builds a clean export of HEAD and zips `dist/` + LICENSE; see the `/release` skill.

## Conventions

- Keep the extension dependency-free at runtime. If something seems to need a library, it doesn't. Dev tools (Husky, Prettier, lint-staged, commitlint, esbuild) live in `devDependencies` and never ship.
- esbuild (pinned, exact version) is the only build tool and runs for release only. Never minify or obfuscate the build (Chrome Web Store code-readability policy); the source must keep working unbundled.
- UI text: sentence case, plain verbs ("Save", not "Submit"). Buttons say what happens.
- All interactive elements ≥ 28 px tall in dense lists, ≥ 36 px in toolbars, ≥ 44 px for primary actions. Keep `:focus-visible` working.
- Colors only via tokens in `styles/tokens.css`. Env colors: PROD orange, TEST blue, STAGE purple, LOCAL green — do not reassign.
- Every destructive action gets either an undo toast (links, Home tiles) or a confirm (folders, sections, categories).
- Every behaviour change updates `.claude/rules/business-logic.md` and adds/updates a test in the same change. Never weaken a test to make it pass.
- Match the existing code style: 2-space indent, single quotes, semicolons, early returns, no classes.

## Don't

- Don't add another build tool, a framework, TypeScript, or runtime npm packages. Don't add a dev server or watch mode.
- Don't store bookmark titles/URLs in `chrome.storage` — they're already in Chrome.
- Don't add new permissions without saying why in the PR/commit message.
- Don't change the env color mapping or the badge/pill class names (`PROD` `TEST` `STAGE` `LOCAL` `GH`); CSS depends on them.
