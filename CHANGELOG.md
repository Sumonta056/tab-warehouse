# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Schedule**: a third view tab under the search box lists every link with a due date from all folders. Groups: Overdue, Today, Next 7 days and Later; the oldest overdue link comes first. Each row shows its folder and section. Open it also with `j`/`k` or from the command palette.

### Changed

- The due chip sits on the right of each row, so the dates of all rows line up. In a narrow window it moves under the link.
- The view tabs show only their names at the default sidebar width, icons and names in a wide sidebar, and only icons in a narrow sidebar.

## [2.5.0] - 2026-10-24

Tab Warehouse 2.5.0 helps you save faster and not forget what you saved. It adds due dates on links, quick save without the popup, a warning when a page is already saved, and a Shortcuts tab in Settings.

### Added

**Due dates**

- Give a link a due date, with a time if you want one. Set it in the popup (press **Due**), in the row edit form or from the row ⋯ menu.
- Each row shows a due chip: red when overdue, highlighted in the next 7 days, plain after that.
- Filter buttons **Overdue** and **Has due date** find the links you forgot.
- **Also add to Google Calendar** opens a filled-in Google Calendar event after you save. Google sends the reminder. The row menu has _Add to Google Calendar_ for links you saved earlier.
- Backup JSON carries the due date. No new permission.

**Saving**

- Quick save: ⌘K / Ctrl+K saves the current tab into the last folder you used, without the popup. The toolbar icon shows a green ✓. If the page is already saved, the popup opens instead.
- The popup tells you when the page is already saved (it ignores tracking parameters, `#part` and a trailing `/`), shows where, and lets you remove a copy. The button then says **Save again**.

**Settings**

- Settings › Shortcuts lists your Chrome keys, opens Chrome's shortcut page and shows the keys of the new tab page.

### Changed

- The command palette now opens with ⌘⇧K / Ctrl+Shift+K. It is a Chrome shortcut, so you can pick another key at `chrome://extensions/shortcuts`, and it works right after a new tab opens with the cursor in the address bar. ⌘K / Ctrl+K is now quick save.
- The website has a Due dates section, the new keys, the Shortcuts tab and a **Star this project** button.
- Dev: `tools/set-shortcuts.js`, run in the console of `chrome://extensions`, sets ⌘K and ⌘⇧K on Tab Warehouse and clears those keys from other extensions. It does not ship.

## [2.4.0] - 2026-10-23

Tab Warehouse 2.4.0 helps you find and sort links faster. It adds a command palette, search from the address bar, link notes and priority, a duplicate finder and your own tags.

### Added

**Find links**

- Command palette: press ⌘K / Ctrl+K anywhere to search links, folders and Settings tabs. Enter opens the link; ⌘/Ctrl/Shift+Enter opens it in a background tab.
- Address bar search: type `tw`, a space and some text in Chrome's address bar to see up to 5 matching links.
- Search (sidebar, palette and `tw`) also matches the link note and the tag name.

**Notes and priority**

- Give a link a one-line note (max 200 characters) and a priority: High, Medium or Low.
- Set them in the popup, in the row edit form or in the row ⋯ menu.
- Priority links come first, with High / Medium / Low / Other headers in plain folders. A colored stripe marks each priority link.
- Filter buttons above the list: All, High, Medium, Low, Has note.
- Backup JSON carries notes and priority. Undo after a delete restores them too.

**Duplicates**

- Settings › Duplicates lists links that have the same address, oldest first, with the folder path and the date added.
- **Keep this** deletes the other copies. **Keep the oldest in every group** cleans all groups at once. Both have an 8 s Undo.
- An option ignores the `#part` and tracking parameters such as `utm_*`.

**Your own tags**

- Add tags next to PROD / TEST / STAGE / LOCAL, for example QA or UAT, in Settings › Tags › Your tags. Each has a name, a plain name and one of 6 colors.
- Rules by address can give your tags. Each tag gets its own column in _Same site in each version_.
- Your tags show in every view: badges, Tag sort, Tag matrix, _Open on <tag>_, the Board, the popup and search.
- Copy / paste text and Backup JSON carry your tags.

**Popup**

- **Open this page in**: open the same page on the other versions of the site with one click. Shift/⌘/Ctrl+click opens it in the background.

### Changed

- The UI says _tag_ in place of _env_ and _label_: the Settings tab is **Tags**, the sort is **Tag**, the view is **Tag matrix** and the untagged group is **NO TAG**. Saved data does not change.
- The popup is more compact. The **Save** button is always visible without scrolling.
- Opening any page clears the global search. While search results show, the sidebar marks no page as open.
- A small background service worker exists only for the `tw` address bar search. No permission changes.

## [2.3.0] - 2026-10-22

Tab Warehouse 2.3.0 adds the Board: every folder as a column of cards on one screen. The release also adds a website with a live demo, and a ZIP download on each GitHub release.

### Added

**Board**

- A Board button next to Home opens every folder as a column of cards. A card shows the favicon, the title, the URL and the PROD / TEST / STAGE / LOCAL or GH badge.
- Columns sit in one lane per category, or in one row. Switch with **By category** / **One row** (shown only when you have categories). Unsorted is always the last column.
- A folder's sections show as small headers inside its column, with **No section** last.
- Drag a card onto a column, a section header, or another card (Manual sort) to move it. Drag it onto a sidebar folder or the Home button, as on the folder page.
- Drag a column header onto another column to reorder folders. Chrome's bookmark tree does not change.
- **Add link** at the bottom of every column. Each card has a ✕ that deletes with an 8 s Undo.
- A filter box searches the title and URL in all columns.
- A separate Board text size slider in Settings › Appearance.

**Website and download**

- A website on GitHub Pages with screenshots, a settings tour, install steps and a live demo that runs the real extension in the browser.
- Each GitHub release has a `tab-warehouse-<version>.zip` to download and load unpacked.

### Changed

- The sidebar search box now has the full width. Home and Board are two labeled tabs under it.
- `j` / `k` now walk Home, Board, then the folders. The floating Home button also shows on the Board.
- The files that Chrome loads now live in the `extension/` folder. Choose `extension/` in _Load unpacked_. Existing users who load unpacked from the repo root must copy their Local Extension Settings, because a new path gives a new extension ID. The release ZIP is not affected.
- Dev: new GitHub Actions deploy the site after CI passes and attach the release ZIP. No permission changes.

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

[Unreleased]: https://github.com/Sumonta056/tab-warehouse/compare/v2.5.0...HEAD
[2.5.0]: https://github.com/Sumonta056/tab-warehouse/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/Sumonta056/tab-warehouse/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/Sumonta056/tab-warehouse/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/Sumonta056/tab-warehouse/releases/tag/v2.2.0
