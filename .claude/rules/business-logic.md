# Business logic (source of truth for behaviour)

Every rule here has at least one test. If you change a rule, change its test in the same edit; if you add a feature, add its rules here and its tests under `tests/`. Run `./tests/run.sh` before saying a change is done.

## Data ownership

| Data                                                                                                                                                             | Lives in                                                                | Never in                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Link title, URL, folder membership, order inside a folder                                                                                                        | `chrome.bookmarks`                                                      | `chrome.storage`                               |
| Sections (status groups inside a folder)                                                                                                                         | Real subfolders in `chrome.bookmarks`                                   | settings                                       |
| Home links and their order                                                                                                                                       | Bookmark folder `settings.home.folderId` (created in _Other bookmarks_) | settings                                       |
| Sidebar order, categories, folder→category, section colors, per-folder prefs, env rules, host map, Home look, sidebar width, theme, sidebar look, Board grouping | `chrome.storage.local.settings`                                         | bookmarks                                      |
| Home icon overrides (URL or 128 px data URL), keyed by bookmark id                                                                                               | `chrome.storage.local.homeIcons`                                        | settings                                       |
| Link note (max 200 chars), priority (`high`/`med`/`low`) and due date, keyed by bookmark id                                                                      | `chrome.storage.local.linkMeta`                                         | settings, bookmark titles                      |
| Home background image (JPEG, max 1920 px)                                                                                                                        | `chrome.storage.local.homeBg`                                           | settings (it would be rewritten on every save) |

- `loadSettings()` merges stored settings over `DEFAULT_SETTINGS`, and merges `home`, `sideLook` and `board` one level deep over `DEFAULT_HOME` / `DEFAULT_SIDE_LOOK` / `DEFAULT_BOARD`, so old stored objects gain new keys.
- Code that changes settings re-reads by **id** from the current `settings` object. The `storage.onChanged` listener replaces `settings` objects, so a category/section object captured at render time can be stale (this bug happened; test "category menu: color, rename, Move down").

## Sidebar

- Header: the extension icon (`#logo`, `icons/icon48.png`) and `brandName(settings)` (`#brandTitle`): `"<userName>'s Warehouse"`, or `Tab Warehouse` when the name is empty. The root folder name is not shown. The browser tab title (`document.title`) is the same text.
- Footer (`#sideFoot`), last in the sidebar: "Made by Sumonta", a GitHub link (`https://github.com/sumonta056`) and a portfolio link (`https://sumonta056.vercel.app/`). Icon links, ≥ 28 px, `target=_blank rel=noopener`, with `aria-label`; the icon is centred in its hover box.
- The search box has the full sidebar width. Under it, the view tabs (`.view-tabs`, `role="group"`, `aria-label="View"`) hold three equal buttons: Home (`#homeBtn`), Board (`#boardBtn`) and Schedule (`#scheduleBtn`), each ≥ 28 px tall (compact, like dense-list rows); the whole group is at most 36 px tall. What a tab shows depends on the sidebar width (container query on `.side`): the label only at the default width, icon and label when the sidebar is wide (about 296 px and more), the icon only when it is narrow (below about 228 px). Every tab keeps its `aria-label` and tooltip, and nothing overflows at any width; the search placeholder still fits at 180 px. Two 1 px lines split the three tabs while none is marked `on`; they hide when one is.
- Home (`#homeBtn`, `aria-label="Home"`) is always present and marked `on` while Home is open. It is not an item in `#nav`. Clicking it from search results clears the search and opens Home.
- While global search results show, nothing in the sidebar is marked open: no `on` on Home, Board, Settings or a folder, no `has-on` on a category, no `aria-current`. The page under the search stays `current`, so Escape or **Clear** marks it again. The sidebar re-renders only when the search starts or ends, not on each keystroke.
- Opening any page clears the global search first (`select()`): a sidebar folder, Home, Board, Schedule, the floating Home button, j/k, the palette, a Board column name and _Rename folder_.
- Order of `#nav`: (categories, or a flat list) → Unsorted.
- There is no hint text under the sidebar buttons.
- Sections of the sidebar = child folders of the root folder (`resolveRoot`: `rootId`, else folder named `rootName` (empty by default; older installs keep their saved name), else first top-level folder), **excluding the Home folder**.
- `Unsorted` (id `unsorted:<rootId>`) exists only when the root has loose links; it is virtual: no rename, no drag, no New section, no category.
- Folder count = direct links + links in its sections (`section.all`).
- Folder order is `settings.order`; ids not in it are appended in Chrome order. Reordering never moves bookmarks in Chrome.
- Alt+↑/↓ moves a folder one step **within its own category** (or within "No category").
- Dropping a link on a sidebar folder moves the bookmark there; dropping a link on the Home button moves it into the Home folder.
- `j` / `k` (when nothing is focused) walk the visible order: Home, Board, Schedule, then folders, skipping collapsed categories.
- Width: drag the handle, ←/→ on the focused handle (16 px steps), double-click resets to 264. Clamped to 180–440 (`clampSideWidth`). Saved on release / after 300 ms of key presses, never per pointer move.

- Floating Home button (`#homeFab`, `position: fixed`, bottom-right, `aria-label="Go to Home"`): visible on every view except Home — folder pages, the Board, the Schedule, Unsorted and search results. Click clears search and opens Home.

## Settings

- One settings button: the gear in the sidebar header (`#settingsBtn`). It opens the Settings view in the right pane (the sidebar stays); clicking it again, **Done**, or Escape (when focus is not in a text field) returns to the page that was open before, and focus goes back to the gear. The gear is marked `on` while Settings is open. There is no settings `<dialog>`.
- Tabs, in order: Appearance (your name, text size, accent color, sidebar background), Home page (links, background, clock, tiles, live preview), Bookmarks (root folder, site favicons, reset sidebar order), Duplicates (duplicate links), Tags (explanation + Try it, your tags, tags by address, sites, copy/paste), Backup (export JSON / HTML, import), Shortcuts (Chrome shortcuts, keys on this page). ←/→ move between tabs. The last tab is remembered for the session.
- Every change saves without a Save button. Toggles, swatches, the root folder and buttons save at once; sliders and color pickers save after 300 ms; Tags rows and the name save when a box loses focus; the name is trimmed and updates the header and tab title at once. The header status shows "Saving…" then "Saved".
- Saves go through one queue so two quick saves never overwrite each other.
- Settings changed in another tab: a hidden tab only marks itself stale; when it is shown again it reloads settings and Home assets and re-renders (test "a hidden tab picks up settings changed in another tab when it is shown"). A visible tab never re-renders on a settings storage event, so its own sliders and text boxes are not interrupted. A `linkMeta` change (for example a save from the popup) re-renders only the folder list or search results, and not while a row is being edited.
- Backup › Import (JSON) keeps only valid preferences (`cleanImport()`): custom tags pass through `cleanTags()`; env rules need a text pattern and a built-in or imported tag; host rows keep only text values for the built-in and imported tags (an old backup without `customTags` keeps only PROD/TEST/STAGE/LOCAL); folder prefs keep only a known sort, `list`/`matrix`, `title`/`url` and boolean `closed`; `board.group` is kept only when it is `cat` or `flat`; links need a text URL; a link's `note`/`pri`/`due` pass through `cleanMeta()`. Anything else is dropped, so a bad file cannot break the page.
- Settings re-render on bookmark changes and keep their tab and scroll position.
- Shortcuts tab (`keys`, last): card **Chrome shortcuts** (`#chromeKeys`) lists `chrome.commands.getAll()`, one row per command (`data-cmd=<name>`). The label is `commandLabel()`: `_execute_action` → "Open the save popup", `quick-save` → "Quick save (no popup)", `palette` → "Open the command palette (on Tab Warehouse)", any other command → its description. The keys are `<kbd>` pieces from `shortcutKeys()` (`Ctrl+Shift+B` splits on `+`; Mac `⇧⌘B` splits each modifier symbol and keeps the key whole); an empty shortcut shows "Not set". A last row "Search from the address bar" shows the manifest omnibox keyword (`tw`) and Space. The help line says Chrome does not let an extension change its own keys and that a key another extension uses is left Not set. **Change shortcuts** (`#keysChange`, ≥ 36 px) opens `chrome://extensions/shortcuts` with `chrome.tabs.create`. The keys are read again each time the tab renders and when the page becomes visible again.
- Card **Keys on this page** (`#pageKeys`, marked "Fixed"): ⌘/Ctrl+Enter background tab in the palette, `/` search box, `j`/`k` sidebar pages, Alt(⌥)+↑/↓ move the focused folder, rule or tag, Esc close/clear. ⌘ and ⌥ show on a Mac, Ctrl and Alt elsewhere (`navigator.platform`). The palette key is not in this card: it is the Chrome command `palette` in the **Chrome shortcuts** card, so it shows the key the user picked.

## Command palette

- The Chrome command `palette` (suggested ⌘⇧K / Ctrl+Shift+K; the user can pick any key at `chrome://extensions/shortcuts`) opens the palette on the Tab Warehouse tab (`#palette`, `role="dialog"`, `views/palette/palette.js`) with focus in its box (`#palQ`, `role="combobox"`). It closes any open menu first. `/` focuses the sidebar search.
- `palette` is in `manifest.json` with the description "Open the command palette on Tab Warehouse". The page has no palette keydown of its own: a new tab starts with focus in the address bar, where the page gets no keys, and a fixed page key would be a second, hidden key next to the one the user picked. With no key set, the palette has no key. ⌘K / Ctrl+K is `quick-save` (see _Quick save_).
- `background.js` takes the command's tab id (else the active tab's id) and calls `paletteCommand(tabId, send)`: it sends `{ type: 'open-palette', tabId }` with `chrome.runtime.sendMessage`. It never looks at `tab.url` (an overridden new tab reports `chrome://newtab/`, and the URL needs `activeTab`).
- Each Tab Warehouse page reads its own tab id once (`chrome.tabs.getCurrent()`) and listens with `chrome.runtime.onMessage`. Only the page whose id matches (`isPaletteRequest()`) opens the palette (`showPalette()`: close any open menu, then `openPalette()`) and answers `true`; every other page does not answer.
- An answer of `true` → `'palette'`. No answer, a rejected `sendMessage` or no tab id → `'none'`: on any other site the key does nothing (no popup, no badge).
- Empty box: every sidebar folder (sidebar order), then the places: Home, Board, Schedule and one `Settings › <tab>` item per Settings tab. Typing: links first (`searchLinks()`: title, URL, folder crumb, note and env label; every term must match; at most 30), then matching folders, then matching places. Matches are highlighted with `<mark>` via `highlight()`.
- A link item shows its favicon/letter icon, the title (or the address), `Crumb · address` on one line (cut with …; the full URL is the tooltip) and its env or GH badge. A folder item says `n links` and "Folder"; a place says "Go to".
- ↑/↓ move the active item (`aria-activedescendant`); the first item is active after each keystroke; the mouse also selects. Tab stays in the box.
- Enter (or click) on a link opens it in this tab (`chrome.tabs.update`). ⌘/Ctrl/Shift+Enter (or ⌘-click) opens it in a background tab (`chrome.tabs.create({ active: false })`) with the toast "Opened in a background tab". On a folder it opens the folder page; on a place it opens Home, the Board or that Settings tab. Opening anything clears a global search first.
- Escape or a click outside the box closes the palette and gives focus back to where it was. Escape in the palette does not also close Settings.
- No result: "Nothing matches. Try part of a name, host or note.".

## Address bar search

- Keyword `tw` (`manifest.json` `omnibox`). Type `tw`, a space, then text in Chrome's address bar. `background.js` is a module service worker that exists only for this.
- On each keystroke the worker reads settings, the bookmark tree and `linkMeta` fresh (no cache) and builds the sidebar sections without the Home folder. `omniboxSuggestions()` uses `searchLinks()` (same match as the palette), puts links whose title has every term first, and returns at most 5 (`OMNI_MAX`). Empty text → no suggestion.
- A suggestion is `Title <dim>LABEL · Folder › Section</dim> <url>address</url>`; the title (or the address when there is no title) and the address mark the matched terms with `<match>`. Chrome reads the description as XML, so every title, URL and crumb goes through `xmlEscape()`.
- The default row says "Search Tab Warehouse for <text>".
- Enter (`omniboxTarget()`): a suggestion opens its URL; typed text that is not a `scheme://` address opens `newtab.html?q=<text>`. `disposition` picks the tab: `currentTab` → `chrome.tabs.update`, `newForegroundTab` → `chrome.tabs.create({ active: true })`, `newBackgroundTab` → `chrome.tabs.create({ active: false })`.
- The new-tab page with `?q=<text>` puts the text in the sidebar search box and shows the global search results. Without `q` it opens Home as before.

## Duplicate links

- Settings › Duplicates (its own tab, after Bookmarks) has the **Duplicate links (n)** card (`#dupCard`). It checks every link under the root folder, in any depth, except the Home folder. n = number of groups.
- Two links are the same address when `dupKey()` matches: same scheme, host (any case), path without trailing `/`, query and `#part`. The toggle **Ignore #part and tracking parameters** also drops the `#part` and `utm_*`, `gclid`, `fbclid`, `msclkid`, `mc_eid` from the query. The toggle is not saved; it resets when the page reloads.
- A group (`findDuplicates()`) lists its copies oldest first (`dateAdded`): the folder path (`Folder › Section`, or `Unsorted` for links directly under the root), the date added and **Keep this**. A copy whose address differs from the first one shows its own address.
- **Keep this** deletes every other copy in the group. **Keep the oldest in every group** (shown only with 2 or more groups) deletes every copy but the first in each group. Both show one toast "Deleted 1 copy" / "Deleted N copies" with an 8 s Undo that recreates each copy at the same parent and index, with its note and priority under the new id.
- No groups → "No duplicate links.".

## Tags (Settings › Tags: tags by address and sites)

- UI words: the Settings tab is **Tags**, the sort is **Tag**, the view is **Tag matrix**, the untagged group is **NO TAG**. One row of _Tags by address_ is a **rule**. Storage keys (`envRules`, `hostMap`), ids (`#envLabels`, tab key `env`) and CSS classes keep their old names.

- No defaults: `envRules` and `hostMap` start as `[]` on a fresh install. Saved lists from older versions are kept as they are. With no rules, `detectEnv` uses only the PROD/TEST/STAGE/DEV words in the title.
- All copy is plain language: _Tags by address (n)_ ("If the address contains" → "Give the tag") and _Same site in each version_ (one row per site, a box per tag). Built-in tag names stay PROD/TEST/STAGE/LOCAL with their colors; plain names (`ENV_NAMES`: Live, Test, Staging, Your computer) show beside them.
- "What is this?" card explains both lists and has **Try it**: type a link or click a sample. It shows the tag or **No tag** (`explainEnv()`), why ("Rule N matched: the address contains …", "No rule matches this address.", "There are no rules yet."), and the same page in the other versions from the site row (`deriveUrl`), or why there is none.
- Tags by address: add row (text + tag + ＋, Enter works), edit on blur, a select colored by its tag. Clearing the text or ✕ removes the row with the Undo toast "Removed rule". Drag the grip or Alt+↑/↓ to reorder; the first match wins. A pasted full address is cut to its host; text is lower-cased.
- Sites: one box per tag (PROD, TEST, STAGE, LOCAL, then custom tags; the table scrolls sideways with more than 4) + ✕; an empty box means none. A row with all boxes empty is not added, and emptying every box removes it (Undo). Full addresses are cut to the host.
- Empty states offer **Add examples** (neutral `example.com` / `localhost:3000` data).
- Copy or paste: **Copy to clipboard** writes `envText()` (a `#` header per list, `# Tags by address: …` first (old text with `# Labels` still imports, because `#` lines are comments); `pattern TAG` lines; `PROD TEST STAGE LOCAL` host lines with `-` for none) to the box and the clipboard. **Import** parses with `parseEnvText()` (comments/blank lines ignored, any order, bad lines counted), replaces both lists and shows "Imported N rules and M sites[. Skipped K lines …]" with Undo. Text with no valid line imports nothing and says so.

## Custom tags

- `settings.customTags = [{ name, plain, color }]`, default `[]`. Only custom tags are stored; the built-ins stay `ENVS` (PROD, TEST, STAGE, LOCAL) with fixed names and colors. `tagNames(settings)` = built-ins, then custom tags in their saved order. `tagPlain()` gives the plain name (`ENV_NAMES` for built-ins, the custom `plain`, else the name).
- Name (`tagNameError()`): 1–8 capital letters or digits; not `PROD TEST STAGE LOCAL DEV GH NONE` or a color word; unique. `cleanTags()` upper-cases, drops bad or repeated names, cuts `plain` to 40 characters and replaces an unknown color with `teal`.
- Colors: `TAG_COLORS` = teal, pink, yellow, red, cyan, grey (never the env colors).
- A custom tag comes **only from an address rule** (`envRules` `{ pattern, env: 'QA' }`). Title words stay PROD/TEST/STAGE/DEV for the built-ins.
- Sites: a `hostMap` row may hold a key for each custom tag. `deriveUrl()`, `switchTargets()` and `buildMatrix()` take the tag list; Tag sort ranks built-ins, then custom tags, then unknown tags with the untagged links.
- Text format: with custom tags, `envText()` starts with `# Tags: NAME color plain name` lines (`QA teal QA team`), and the sites header names the columns (`# Same site in each version: PROD TEST STAGE LOCAL QA (- for none)`). `parseEnvText(text, known)` reads tag lines first (any order), returns new tags in `tags`, accepts rules for built-in, known and new tags, reads site rows by the header columns (old text without a header = the 4 built-ins), drops columns of unknown tags and skips a row that is then empty.
- Badges: `tagBadge()` gives `badge PROD|TEST|STAGE|LOCAL` for built-ins and `badge tag` + `data-tag="<color>"` for a custom tag; `linkBadge()` (tag, else GH) is used by the folder rows, the Board cards and the palette. `[data-tag]` sets `--tag-bg/--tag-fg` from the `--tag-<color>-bg/-fg` tokens, so the badge, the label select and the swatches share one color rule.
- Settings › Tags › **Your tags (n)** (`#envTags`), between the intro and the tags by address: the built-ins locked (`.tag-builtin`), then one row per custom tag: badge, name (`.tag-name`, upper-cased), plain name (`.tag-plain`), 6 swatches (`.tag-sw`, `aria-pressed`, ≥ 28 px) and ✕ (`Delete tag <name>`); then the add row (`#tagAddName`, `#tagAddPlain`, swatches with the first unused color picked, ＋, Enter works).
- A bad or taken name shows the `tagNameError()` text as a toast; nothing is saved and a renamed box gets its old name back.
- Rename changes the tag in every rule and moves its site column. Plain name and color save at once. Delete asks `confirm()` ("Delete the tag QA? Its N rules and its site column are removed too."), then removes the tag, its rules and its column; a site row that is then empty is removed. Alt+↑/↓ or drag the grip reorders tags (focus follows).
- The tag select of each rule, the legend ("<plain> — your tag"), the sites table and Try it list built-ins then custom tags; a select with a custom tag is colored like its badge.
- Every view uses `tagNames(settings)` (built-ins, then custom tags) in place of the fixed list:
  - Tag sort: one group per tag in that order, then **NO TAG**. A custom group header is `grp tag` + `data-tag="<color>"`; every header has `data-env="<name>"`; collapse is `folders[id].closed[<name>]`.
  - Tag matrix: one column per tag, always (also with no link of that tag). A custom tag's pill is `pill tag` + `data-tag`, its header dot uses the tag color. `+ derive` and the row menu's _Save derived links_ use `deriveUrl(..., tags)`.
  - Link ⋯ menu: _Open on <tag>_ for every other tag that the site row fills, also from and to a custom tag.
  - Board cards and every `sortLinks()` call take the tag list.
  - Popup: the page badge is `linkBadge()`; **Open this page in** uses `switchTargets(..., tags)`, `tagBadge()` and the plain name `tagPlain()`.
  - The palette and `tw` find a link by its custom tag name (`searchLinks()`).
- Backup › Export JSON writes `customTags`. Import adds only the tags whose names are new, after the existing ones; a local tag with the same name keeps its color and plain name.
- Copy writes `envText(rules, map, customTags)`. Import (`parseEnvText(text, known)`) adds new tags after the existing ones, replaces rules and sites, says "Imported N tags, N rules and N sites" (the tags part only when there are new tags), and Undo also removes the new tags.

## Text size

- `settings.fontSide`, `settings.fontPage` and `settings.fontBoard` are percents (80–140, default 100; `clampFont()`; bad values → 100).
- Every px `font-size` in `newtab.css` and `styles/shared.css` is `calc(Npx * var(--fs, 1))`. `.side` sets `--fs` from `--fs-side`, `.page` from `--fs-page`, and the Board (`.page.board-mode`) from `--fs-board` (all set on `:root` by `applyFontSize()`). The Board ignores the Page size; every other view ignores the Board size. Only text scales; row heights, icons and click areas stay. The Home clock and tile letters keep their own sizes.
- Edited in Settings › Appearance › Text size: Sidebar, Page and Board sliders, steps of 5. Text sizes are not part of Backup export/import. Changes apply at once and save after 300 ms.

## Theme

- `settings.theme` = a preset name (`blue` default, `teal`, `green`, `purple`, `pink`, `orange`, `red`; `THEMES` in `constants/themes.js`) or a custom `#rrggbb`. Unknown values fall back to blue.
- `applyTheme()` sets `--accent`, `--accent-bg`, `--accent-text`, `--accent-ink` on `:root` in the new-tab page and the popup. A custom color derives the other three (`color-mix`; ink is dark on light colors, white on dark).
- Picked in Settings › Appearance (7 swatches + custom color). It applies and saves at once.
- Env colors never change with the theme.
- The open list of every `<select>` uses the dark tokens (`option`: `--surface` background, `--text` color), so options stay readable where the browser draws a white list (Windows).

## Sidebar look

- `settings.sideLook = { mode: 'solid'|'image', color, dark (30–95), blur (0–24 px) }`, default `{ solid, #1b1b1b, 70, 12 }` = the plain sidebar.
- A fixed `.side-backdrop` (same width as the sidebar) sits behind `.side`: an image layer (`--side-img`, `blur(--side-blur)`) and a color layer (`--side-color` at `opacity: --side-dark`). `sideLookVars()` computes the variables.
- `image` mode uses the Home background (`homeBg`, never copied). Without a Home image, or in `solid` mode, the sidebar is the plain color (dark 1, blur 0, no image).
- Edited in Settings › Appearance: Background (Solid color / Home image), Color, Darkness, Blur. Darkness and Blur are disabled in Solid mode. In Home image mode with no image the note "Upload a background on Home first." shows. Changes apply at once and save after 300 ms.
- Uploading or removing the Home image updates the sidebar at once.
- At ≤ 760 px the sidebar is on top and uses only the color.

## Categories (sidebar groups, extension-only)

- `settings.categories = [{ id, name, closed, color? }]` in display order; `settings.folderCat = { folderId: categoryId }`.
- No categories → the sidebar renders flat, exactly as before categories existed.
- Header text: `Name (count)`. "No category" is a fixed group after the categories, shown only when it has folders; it cannot be renamed, colored, dragged or collapsed.
- Drop a folder on a header → that category, placed at its end. Drop a folder on a folder in another category → adopts that category at that position.
- Folder menu: _Move to <category>_ (except its current one), _Remove from category_.
- Header menu: color (default + red/orange/yellow/green/blue/purple), Rename, Move up/down, Delete. Drag a header onto another header to reorder.
- Delete asks `confirm()`, removes the category and its `folderCat` entries; folders and bookmarks stay.

## Board

- `#boardBtn` (view tab, ≥ 28 px, `aria-label="Board"`) sits right after `#homeBtn`. It opens the Board in the right pane (the sidebar stays), is marked `on` with `aria-current="page"` while the Board is open, and clears a global search first. `#homeFab` stays visible on the Board. Settings opened from the Board return to the Board on Done/Escape.
- `settings.board = { group: 'cat'|'flat' }`, default `cat`. The **By category** / **One row** switch shows only when categories exist and saves at once.
- Columns: with categories and `group: 'cat'` → one lane per category in sidebar order (header `Name (n)`, collapsed categories still shown, empty lanes skipped), then a **No category** lane holding the uncategorised folders and Unsorted (its count includes Unsorted). No categories or `group: 'flat'` → one row in sidebar order. Unsorted is always the last column and exists only when the root has loose links. Each lane scrolls sideways; columns are 320 px wide (at most the screen width minus 48 px at ≤ 760 px).
- Column header: the folder name is a button that opens the folder page; the count is `section.all`; ⋯ (and right-click) opens the folder menu.
- Cards use the folder's own sort (`folders[id].sort`). A card shows the favicon (`iconEl`), the title (at most 2 lines), the URL on 1 line cut with … (the full URL is the card tooltip; hidden only when it equals the title, `sameAsUrl`) and the env or GH badge at the right edge. Cards keep their full height in a scrolling column and never overlap; the ✕ floats over the top-right corner on hover or focus. Click opens the link `target=_blank rel=noopener`.
- Sections: a folder's subfolders show as small headers in its column (with the section color dot), **No section** last; headers show even when empty, as drop targets. Folders without subfolders show a plain card list.
- Drag a card: onto a column → moves to the end of that folder (Unsorted = the root; not offered for its own folder); onto a section header → into that subfolder (**No section** = the folder itself; its own section refuses); onto a card → before/after it (same index rule as rows), **only when that folder's sort is Manual**; onto a sidebar folder or the Home button → the existing sidebar moves.
- Drag a column header onto another column → reorders `settings.order` (`moveFolder`, shared with the sidebar) and adopts that column's category; the Chrome tree does not change. Unsorted can't be dragged and is not a folder drop target.
- Card ✕ (`aria-label="Delete link"`, ≥ 28 px) deletes with the 8 s Undo toast (restored at the same parent and index).
- **Add link** at the bottom of every column (Unsorted too: it adds to the root) opens an inline form: URL + Name, Save/Cancel, Escape cancels. No URL → nothing is added; no scheme → `https://`; no name → host without `www.`.
- Board filter (title + URL, every term must match) re-renders only the columns, so the box keeps focus; a column with no hits says "Nothing matches."; Escape clears it. Opening the Board resets the filter.

## Folder page

- Rows show the full URL and wrap; nothing truncates URLs on the folder page.
- Title mode: title, then URL only if they differ (`sameAsUrl`). URL mode: URL, then title only if they differ.
- Sort per folder: manual (Chrome index), name (case-insensitive, numeric), URL, tag (PROD, TEST, STAGE, LOCAL, custom tags, NO TAG; with collapsible tag groups when there are no sections), date added (newest first), host.
- Row drag-reorder only in Manual sort. Index rule for the same parent: pass the target's current index for "before" and `index + 1` for "after".
- Tag matrix: rows = same path across tags; `+ derive` uses the host map; Alt+click saves the derived link. No tagged link → "No link in this folder has a tag, so there is nothing to lay out as a matrix. Use List view or add tags by address in Settings › Tags."
- Folder filter matches title + URL + note, all terms must match; shows "Nothing matches the filter." when empty.
- Edit form: `novalidate`; a URL without a scheme gets `https://`; Chrome errors show as a toast and keep the old value; Cancel/Escape discard.
- Each row has Edit (pencil), Delete (trash, `aria-label="Delete link"`) and the ⋯ menu. Delete does not open the link.
- Delete link → undo toast for 8 s (recreated at the same parent and index). Delete folder → `confirm()`.
- Global search (sidebar box) searches every folder and section (not Home), shows a crumb `Folder › Section`, Escape clears it. It also matches the link note and the link's env label (`searchLinks()`, shared with the command palette). `/` (when nothing is focused) focuses the box; the hint in the box shows `/`.

## Link notes and priority

- `linkMeta = { [bookmarkId]: { note?, pri? } }` in `chrome.storage.local`. `cleanMeta()`: note trimmed and cut to 200 chars (`NOTE_MAX`); `pri` only `high`/`med`/`low` (`PRIS`, labels High/Medium/Low); an empty result removes the entry. Notes stay on this computer (bookmark ids differ per device); Backup JSON carries them.
- Set in the popup (priority picker None/High/Medium/Low + one-line note box, saved with the new bookmark id; nothing is stored when both are empty), in the row edit form (same picker + note), and in the row ⋯ menu: _Add note_ / _Edit note_ (opens the edit form with the note box focused), _Mark as High/Medium/Low_ (except the current one), _Clear priority_ (only when set).
- Row: a 3 px stripe in the priority color at the left edge (`--pri-high` red, `--pri-med` yellow, `--pri-low` grey; never the env colors) and the note on its own line under the URL. Note text is rendered with `h()`/`highlight()`, never `innerHTML`.
- Order: priority links always come first (High, Medium, Low, then the rest); the folder's sort applies inside each group (`priGroups`, `priFirst`).
  - Plain folder, any sort except Tag, with at least one priority link: headers **High / Medium / Low / Other** (`Name  count`), empty groups skipped, collapsible per folder (`folders[id].closed['pri:<pri|none>']`).
  - Folder with sections, or Tag sort: no priority headers; inside each section / env group, priority links come first.
  - No priority link: the plain list, unchanged.
- Drop a link on a priority header → it gets that priority; in Manual sort it also moves after the last link of that group. Drop before/after a row inside priority groups (Manual sort) → it moves there and takes that row's priority.
- Filter buttons (All, High, Medium, Low, Has note) above the list, only when the folder has a link with a note or priority. They combine with the folder filter, reset to All when another folder opens, and an empty result says "Nothing matches the filter.". The folder filter also matches the note text.
- Delete a link removes its entry; Undo restores the link and its note/priority under the new id (folder page, Board ✕ and popup Remove). Entries of links removed anywhere else are pruned on the next refresh.
- Backup › Export JSON adds `note`/`pri` to each link. Import matches by URL: new links and existing links without a note get the imported one; an existing note is kept. HTML export has no notes.

## Due dates

- `linkMeta[id].due` is `YYYY-MM-DD` (all day) or `YYYY-MM-DDTHH:MM` (local time). `cleanMeta()` keeps it only when `isDue()` says the date and time exist (no 30 Feb, no hour 24, no minute 60). Clearing the date removes the key. Backup JSON carries it like the note; Import keeps an existing entry as it is.
- There are no browser reminders, alarms or notifications, and no new permission. A reminder comes only from Google Calendar.
- `dueState(due, now)`: a date without a time is `overdue` from the next day; a date with a time is `overdue` after that minute; else `today`, `soon` (within `DUE_SOON_DAYS` = 7 days) or `later`.
- `dueLabel()`: "Overdue · 20 Oct (4 days)", "Overdue · today 10:00", "Due today", "Today 16:00", "Due Thu 29 Oct [10:00]", "Due 11 Dec 2026 [10:00]".
- Due picker (`duePicker()`, popup and row edit form), top to bottom:
  - Quick chips (`.due-q`, ≥ 28 px): **Today**, **Tomorrow**, **Next week** (`DUE_QUICK`, 0/1/7 days; `dueQuickDate(days, now)` = local `YYYY-MM-DD`) set the date. The chip whose date equals the date box is `aria-pressed="true"`. **Pick a date…** (`.due-pick-date`) shows the date and time boxes, focuses the date box and opens the browser date picker.
  - Date box (`.due-date`) and optional time box (`.due-time`) (`.due-row`): hidden until **Pick a date…** or **+ Time**, or when the link already has a date. While they show, the quick chips hide.
  - Summary (`.due-sum`, only with a valid date): a chip (`.due-now.<state>`, calendar icon + `dueLabel()`, colored like the row chip), **+ Time** (`.due-add-time`, only while the boxes are hidden and there is no time; shows the boxes and focuses the time box), the check box **Google Calendar** (`.due-cal-box`, tooltip "Also add to Google Calendar") and ✕ (`.due-clr`, `aria-label="Clear due date"`). ✕ empties both boxes, hides them and brings the quick chips back.
  - The check box is disabled and unchecked while there is no date; it is off by default and is not remembered.
  - `focus()` focuses the date box when the boxes show, else the **Today** chip.
- With the check box on, Save stores the link and its date, then opens `gcalUrl()` with `chrome.tabs.create` (popup: right after the current tab). With it off, nothing opens.
- `gcalUrl({ title, url, note, due })` = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=<title, else url>&dates=…&details=<note>\n\n<url>`. All day → `YYYYMMDD/<next day>`. With a time → a 30-minute event, local time without `Z`, so Google reads it in the user's calendar time zone. The event is created once; later changes to the date do not update it.
- Row (folder page, global search, Schedule): the due chip (`.due-chip.<state>`, calendar icon + `dueLabel()`, the stored value as tooltip) sits on the right of the row in `.due-col` (at least 200 px, chip at its right edge), after the env/GH badge and before the actions, so the chips of all rows line up. At ≤ 760 px the row wraps and the column moves to its own line under the link, lined up with the text; the actions stay on the first line. Overdue uses the red tag tokens, today the yellow tag tokens, soon the accent; later is plain.
- Row ⋯ menu: _Set due date_ / _Change due date_ (opens the edit form with the picker focused: the date box when the link has a date, else **Today**); with a date also _Add to Google Calendar_ and _Clear due date_ (keeps the note and priority).
- Filter buttons **Overdue** and **Has due date** come after Has note. A link with only a due date also makes the filter buttons show. They combine with the folder filter like the others.

## Schedule

- `#scheduleBtn` (third view tab, `aria-label="Schedule"`) opens the Schedule in the right pane (the sidebar stays). It is marked `on` with `aria-current="page"` while open, clears a global search first, and Settings opened from it return to it on Done/Escape. `#homeFab` shows. The palette has a **Schedule** place.
- Lists every link under the root folder, in any depth, that has a valid `linkMeta[id].due` (not the Home folder). `scheduleGroups(secs, meta, now)` sorts by the due moment (all-day = the start of that day), earliest first; on the same moment an all-day link comes first. Then it groups by `dueState()`: **Overdue**, **Today**, **Next 7 days**, **Later** (`DUE_GROUPS`), empty groups left out. So the oldest overdue link is at the top.
- Head: "Schedule" and `n link(s)`. Group header (`.grp.dueg.<state>`, `data-due`): name, a line, the count; Overdue red, Today yellow, Next 7 days accent, Later muted. Click collapses it; saved in `folders.schedule.closed[<state>]`.
- Rows are the folder-page rows (title/URL mode of their own folder, note, priority stripe, badge, due chip, Edit, Delete, ⋯) with the crumb `Folder › Section` (`Unsorted` for loose links). No reorder by drag (the date sets the order); a drop on a sidebar folder or the Home button still moves the link. Delete is the row trash with the 8 s Undo (the link comes back with its note, priority and due date).
- A due date set or cleared anywhere (row menu, edit form, popup) re-renders the Schedule at once.
- No dated link → "No links with a due date. Set one in the ⋯ menu of a link, or with Due in the save popup.".

## Sections (subfolders inside a folder)

- Direct subfolders of the open folder; deeper levels are not shown as sections.
- Headers in Chrome order, then **No section** (direct links) last and always present as a drop target. A folder without subfolders renders the plain list.
- Collapse is per folder: `folders[id].closed[sectionId]`.
- Drop a link on a header → move into that subfolder. Drop a link before/after a row of another section (Manual sort) → move to that position.
- Link menu: _Move to <section>_ for every section except the current one, including _No section_.
- Header menu: color (saved in `settings.partColors[folderId]`), Rename (Chrome title), Move up/down (Chrome order), Delete (moves its children to the parent first, then removes the empty folder; asks `confirm()`). Drag a header onto another header to reorder.
- Folder count, Open all, Copy all URLs, Tag matrix and search include links in sections.

## Home

- Default view on every new tab. Fills the right pane; the sidebar stays.
- First start: find or create a folder **Home** in _Other bookmarks_ (`tree.children[1]`, fallback first child). An existing _Home_ folder is adopted as it is. No links or icons are built in: a new install starts with an empty Home (only the help text "Add the sites you use most in Settings › Home page. …"); the help text goes away once Home has a link. Existing installs keep their Home links and icons (they are bookmarks and `homeIcons`, never touched on update). If the Home folder is deleted later, an empty one is created.
- Tiles = links in the Home folder in Chrome order. There is no _Add link_ tile: links are added only in Settings › Home page. Click opens in the same tab; the _Open in new tab_ setting adds `target=_blank rel=noopener`.
- Icon order (`tileIconSrcs`, `homeIconImg`; tiles, preview and Links list): `homeIcons[id]` → official Google product icon by host (`googleIcon`: Gmail, Drive, Calendar, Keep, Meet, Docs/Sheets/Slides/Forms) → Chrome favicon for the link `_favicon?pageUrl=…&size=64` → Chrome favicon for the site root `https://host/` → Google favicon service `https://www.google.com/s2/favicons?domain=<host>&sz=64` then for the host without `www.` (`webIconUrls`; only http(s) hosts with a dot, never localhost or an IP address, so private hosts are not sent to Google) → letter icon. Failed images fall back down this chain. Chrome answers an unknown page with its grey globe instead of an error, so a favicon that has the same pixels as the globe for `https://favicon.invalid/` also falls back. Google answers an unknown site with a 16 px globe, so a Google image of 16 px or less also falls back. The image stays invisible until it passes this check.
- Uploading a background or an icon when `chrome.storage.local` is full shows "Not enough storage space. Remove the background image or some custom icons, then try again." and keeps the old image (`imageSaveError()`).
- Tile menu: Change icon… (upload, resized to 128 px PNG), Icon from URL…, Use site icon, Edit name / URL, Open in new tab, Remove (undo toast restores the bookmark **and** its icon).
- Drag a tile onto a tile → move before it; onto the empty space of the tile grid → move to the end.
- Links list (Settings › Home page, card `Links (n)`): the Home folder's links in Chrome order with icon, name and a Remove button (same undo toast as the tile menu). Drag rows to reorder (same-parent index rule: before = target index, after = index + 1). The add form takes name + URL: no URL → nothing is added; no scheme → `https://`; no name → host without `www.`. Settings stay open on the same tab and keep their scroll position when the list changes.
- Home has no settings button of its own. Its look (background image, opacity, darkness, blur, color; clock size 48–260 (also capped to 17 % of pane width), 24-hour, seconds, date; show names, open in new tab, icon size 40–88, per row 4–16, space above tiles 0–240 px (`tilesGap`, the margin under the date)) is edited in Settings › Home page, next to a live preview. Changes save after 300 ms.
- Defaults: color `#185a63`, darkness 65, blur 2, clock 170, 12-hour with seconds, date on, names on, same tab, icon 56, 12 per row, 80 px above tiles.

## Popup (save current tab)

- Shows the active tab title (editable), the full URL and its env badge. No tab → message, Save disabled.
- **Open this page in** (`#switch`, under the page): when the tab's host is in a row of _Same site in each version_ (`switchTargets()`), one button per other filled box of that row: env badge, the same page on that host (`deriveUrl`: path, query and `#part` kept; `localhost…` gets `http:`; cut with …, the full URL is the tooltip) and the plain name (`ENV_NAMES`). Click opens it in a new tab right after the current one and closes the popup; Shift/⌘/Ctrl+click opens it in the background, keeps the popup open and shows "Opened in a background tab".
- No site row but the page has an env label → the hint "To open this page in your other versions, add this site in Settings › Tags.". No site row and no label, or a row with no other box → the section is hidden.
- Layout (top to bottom): page, **Open this page in**, options, the _Already saved_ warning, folder search and list, then the bottom bar. The popup is at most 600 px tall (Chrome's limit); only the folder list shrinks and scrolls, so the bottom bar with **Save** is always visible without scrolling.
- Options: row 1 is the priority picker with names (● None, ● High, ● Medium, ● Low). Row 2 splits the width in 3: a one-line note box (`#note`, max 200 chars, 2 parts) and the **Page** / **Site** switch (`#modes`, 1 part). Enter in the note box saves. Row 1 ends with the **Due** button (`#dueBtn`, calendar icon, ≥ 28 px, `aria-expanded`, `aria-controls=duePick`). It shows the due picker (`#duePick`, see _Due dates_) under row 2 and focuses **Today**; pressing it again hides the picker and clears it, so a hidden date is never saved. The picker is hidden, empty and with the calendar box off on every open. While it is open the folder list may shrink to 48 px, so the popup still fits 600 px with the _Open this page in_ rows, also with a date set and with the date and time boxes shown.
- Bottom bar: the status line (only when there is text), the key hints, _Open Tab Warehouse_ and **Save to <folder>** (cut with …; the full label is the tooltip).
- _Page_ saves the full URL; _Site_ saves `origin/` with the host as title and exists only for http(s) pages. A title you edited is kept when switching mode.
- Folder list: root first, then every nested folder (indented); filter matches the full path. If no folder has exactly the typed name, the last item is _Create "<name>"_ (created under the root).
- Preselects `settings.lastSaveFolder`, else the root. ↑/↓ move, Enter saves. After save: status "Saved to X", remember the folder, close after 0.9 s.
- Already saved: the popup finds copies with `findSaved()` over the whole bookmark tree (`dupKey(url, true)`: tracking parameters, `#part` and a trailing `/` do not matter). On a match an orange warning box (`.dup-warn`, `--warn-bg/-fg/-line` tokens, never the env colors) shows up to 3 copies, one line each: "Already saved in <strong>path</strong>" (the folder path from the root, else the full path, cut with …) and Remove (undo toast). A copy whose address differs from the page also shows its own address (cut with …, the full URL is the tooltip). While a copy exists the button says **Save again to <folder>**; Enter still saves. Removing the last copy brings back **Save to <folder>**.

## Quick save

- Command `quick-save` (`manifest.json`), suggested `⌘K` (mac) / `Ctrl+K`; `_execute_action` (`⌘⇧B`) stays the popup. The third command is `palette` (⌘⇧K, see _Command palette_); 3 suggested keys of at most 4. On a Tab Warehouse tab ⌘K is quick save too, which skips the page (grey `–`). The user can change both at `chrome://extensions/shortcuts`; Chrome skips a suggested key that another extension already has.
- Many sites (GitHub, Slack, Notion) use ⌘K themselves and lose it while the extension has it. On Windows Chrome may keep Ctrl+K; then the command shows Not set and the user picks a key at `chrome://extensions/shortcuts`.
- `background.js` reads the active tab, settings and the bookmark tree fresh and asks `quickSave(settings, tree, tab)`:
  - no tab, or not an `http(s):`/`file:` page → `skip`: grey badge `–`, nothing saved.
  - `findSaved()` finds a copy → `dup`: nothing is saved and `chrome.action.openPopup()` opens the popup with its _Already saved_ warning. If that throws, orange badge `!` with the title "Already in <full path>".
  - else → `save`: a bookmark (title = tab title, else the URL) in `quickSaveTarget()`: `settings.lastSaveFolder` while it is still a folder under the root, else the root. Green badge `✓`, title "Saved to <folder>". A Chrome error gives the grey `–` with "Could not save: …".
- Quick save never changes `settings.lastSaveFolder` (only the popup does) and stores no note or priority.
- Badge (`quickSaveBadge()`): per tab, cleared after 2.5 s (`QUICK_BADGE_MS`), then the default action title comes back.

## Performance rules

- Bookmark events are debounced (30 ms) into one `refresh()`.
- The clock updates only text, aligned to the next second (or minute without seconds), and stops while the tab is hidden.
- Images are resized once on upload; tiles use `loading=lazy decoding=async`; the Home pane uses `contain: strict`.
- Sidebar resize updates at most once per animation frame and saves only on release.
- Sorts compute each link's key (env rank, host, path, display URL) once, then sort with one shared `Intl.Collator`; nothing parses a URL inside the compare function. The env title words are compiled once (`ENV_WORDS`).
- Closing a menu removes its document click listener.
- Leak and speed check on the real extension: `node tests/perf/memprobe.mjs` (`/perf-check`).
