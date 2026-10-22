# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-10-22

### Added

- New installs start without built-in links or company data.
- Your name shows as the brand, and a credit footer sits at the bottom of the sidebar.
- Home: a setting for the space above the tiles.
- Folder page: a Delete button on each link row.
- Settings: text size sliders for the sidebar and the page.
- Renamed to **Tab Warehouse** with a new terminal-style icon.
- Home page: clock, date, your own tiles, background, clock and tile settings, official Google icons.
- One Settings view with 5 tabs, auto-save, accent themes and a sidebar background.
- Environments: plain-language labels and site rows, _Try it_, copy and paste; no default rules.
- Resizable sidebar; categories with colors and drag reorder; sections inside folders; save-current-tab popup.

### Changed

- Home: removed the _Add link_ tile. Add links in Settings › Home page.
- Performance and security checkup; CI checks.
- Dev tools: Husky, Prettier, lint-staged and commitlint; files formatted with Prettier.

### Fixed

- Environments: copied text is selected, and the clipboard write times out.
- Home: missing tile icons.
- Edit form Save, category menu after a settings change, _Whole site_ only for http(s).

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
