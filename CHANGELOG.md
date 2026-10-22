# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Board view: a board button next to Home shows every folder as a column of cards (favicon, title, full URL, env badge), in lanes by category or in one row. Drag cards between columns, onto section headers or within a column (Manual sort); drag column headers to reorder folders; add a link per column; delete with undo; filter all columns.

## [2.2.0] - 2026-10-22

Tab Warehouse 2.2.0 is a bookmark manager and new tab page for developers. It shows full URLs, PROD / TEST / STAGE / LOCAL tags and an environment matrix, on top of Chrome's own bookmarks. Manifest V3, no runtime dependencies, no build step.

### Added

**Home**

- Home opens on every new tab: a large clock, the date and your link tiles.
- Tiles are a normal bookmark folder _Home_ in _Other bookmarks_. A new install starts with an empty Home and a short help text.
- Add, remove and reorder Home links in Settings › Home page, with a live preview.
- Drag tiles to reorder. The tile menu changes the icon (upload or URL), edits the name or URL, opens in a new tab or removes the tile with undo.
- Official icons for Gmail, Drive, Calendar, Keep, Meet, Docs, Sheets, Slides and Forms. Other sites use the Chrome favicon, then Google's favicon service for public hosts, then a letter icon.
- Look settings: background image, opacity, darkness, blur, color, clock size, 12/24-hour, seconds, date, tile names, icon size, icons per row and space above the tiles.

**Sidebar**

- One entry per folder under your root folder, with link counts. Loose links show in a virtual _Unsorted_ entry.
- Drag folders into your own order. The order lives in the extension; Chrome's tree never changes.
- Categories group folders, with colors, collapse, rename and drag reorder.
- Drop a link on a folder to move it, or on the Home button to add it to Home.
- Resizable from 180 to 440 px with the mouse or the keyboard. Background: a solid color or a blurred copy of the Home image.
- Your name as the brand ("<name>'s Warehouse") in the header and the tab title, and a credit footer.
- A floating Home button on every page except Home.
- Keyboard: `j` / `k` walk the folders, Alt+↑/↓ reorders a folder in its category.

**Folder page**

- Full URLs that wrap and never truncate. Show the title first or the URL first.
- 6 sort modes per folder: manual, name, URL, environment, date added and host.
- Sections: real subfolders shown as groups, with colors, collapse, rename, reorder and delete.
- Inline edit, a Delete button on each row (undo for 8 s), right-click menus, a folder filter, _Open all_ and _Copy all URLs_.
- Global search over every folder and section, with a `Folder › Section` path.

**Environments**

- Labels: "if the address contains X, show label Y". The first match wins. Without labels, PROD / TEST / STAGE / DEV words in the title still work.
- Same site in each version: one row per site with its PROD, TEST, STAGE and LOCAL hosts. Every link can open on the other versions.
- Env matrix: one row per page, one column per environment, with **+ derive** for empty cells.
- _Try it_ box: type a link to see its label, the reason and the other versions.
- Copy both lists as text and import them on another machine.
- No built-in rules or company data.

**Popup (`⌘⇧B` / `Ctrl+Shift+B`)**

- Save the current tab into any folder, or create a folder by typing its name.
- Save the full page or the whole site (`origin/`).
- Shows the env badge, remembers the last folder and shows where the URL is already saved.

**Settings and backup**

- One Settings view with 5 tabs: Appearance, Home page, Bookmarks, Environments and Backup.
- Every change saves at once. There is no Save button.
- Appearance: your name, text size for the sidebar and the page (80–140 %), 7 accent colors or a custom color, sidebar background.
- Export to JSON (links, sections, sidebar order, categories and preferences) or to HTML (Chrome bookmark format). Import merges, skips known URLs and drops invalid data.

### Changed

- Renamed to **Tab Warehouse**, with a new icon.
- Home has no _Add link_ tile. Add links in Settings › Home page.
- Performance: debounced bookmark events, one sort key per link, a clock that stops in hidden tabs, images resized once on upload.
- Security: no `innerHTML` with bookmark data, private hosts never go to Google's favicon service, imported settings are validated.
- Developer tools: Husky, Prettier, lint-staged, commitlint and CI checks. 68 unit tests and 116 end-to-end tests.

### Fixed

- Environments: copied text is selected, and the clipboard write times out.
- Home: missing tile icons.
- Edit form Save, the category menu after a settings change, and _Whole site_ only for http(s) pages.

## [2.1.0]

### Added

- Rename folders from the sidebar and page header; ✎ and ··· always visible on rows; right-click menus; import and export (JSON with preferences, Netscape HTML); `tools/make-icons.py`.

## [2.0.1]

### Fixed

- Sidebar drag fixed; Alt+↑/↓ keyboard reorder; Unsorted always listed last.

## [2.0.0]

### Changed

- Sidebar and folder page replace the column board. Six sort modes, env matrix with derive, per-folder view settings, reorderable sidebar, global search, host map.

## [1.0.0]

### Added

- Column board, popup search.

[Unreleased]: https://github.com/Sumonta056/tab-warehouse/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/Sumonta056/tab-warehouse/releases/tag/v2.2.0
