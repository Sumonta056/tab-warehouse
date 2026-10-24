# Architecture

![Tab Warehouse architecture](architecture.png)

Tab Warehouse has three entry points. All three use one shared module, and that module talks to two Chrome stores.

## Entry points

| Entry point        | File                      | What it does                                                                                                   |
| ------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| New tab page       | `extension/newtab.js`     | The main page. Boots, refreshes and sends each screen to its folder in `views/`.                               |
| Popup              | `extension/popup.js`      | Saves the current tab into a folder (⌘⇧B); warns when the page is already saved.                               |
| Address bar worker | `extension/background.js` | Searches links from the address bar with the keyword `tw`; runs quick save (⌘K) and the palette command (⌘⇧K). |

## Shared core

Shared code is split by layer: `extension/constants/` holds fixed values, `extension/domain/` the pure logic (sorting, tag detection, `searchLinks()`, backup data), `extension/services/` every `chrome.*` call (loading and saving settings, the bookmark tree, import), `extension/ui/` the DOM pieces (the `h()` helper, toast, menu, badges, pickers, export download), `extension/state/` the shared page state and the actions that save it, and `extension/views/` one folder per screen (sidebar, folder, search, schedule, board, home, palette, settings, popup). A file imports only from its own layer or the layers before it, a view never imports another view, and only `services/` calls `chrome.*`; `tests/unit/architecture.test.mjs` checks this.

```
constants ← domain ← services ← ui ← state ← views ← newtab.js / popup.js / background.js
```

## Where new code goes

| New code             | Layer               | Test                                                                                            |
| -------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| A fixed value        | `constants/`        | Through the code that uses it                                                                   |
| Pure logic           | `domain/<topic>.js` | `tests/unit/domain/<topic>.test.mjs` (required, ≥ 90 % lines)                                   |
| A `chrome.*` call    | `services/<api>.js` | `tests/unit/services/<api>.test.mjs` with `tests/unit/fake-chrome.mjs` (required, ≥ 80 % lines) |
| A reusable DOM piece | `ui/<piece>.js`     | A scenario in `tests/e2e/scenarios/ui.js`                                                       |
| Shared page state    | `state/`            | The scenarios of the views that use it                                                          |
| A screen             | `views/<screen>/`   | A scenario in `tests/e2e/scenarios/`                                                            |

`tools/coverage-gate.mjs` enforces the line coverage; `tests/unit/architecture.test.mjs` enforces the layers and the test file per `domain/` and `services/` module.

## Stores

| Store                  | Holds                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `chrome.bookmarks`     | Titles, URLs, folders and order. The source of truth; never copied.                         |
| `chrome.storage.local` | Settings, sidebar order, tags, link notes (`linkMeta`), Home icons and the Home background. |

## Data flow

- **Read:** a new tab calls `refresh()`, which reads `chrome.bookmarks.getTree()` and draws the page again with `h()`.
- **Write:** every edit calls the `chrome.bookmarks` API. Chrome fires `onCreated`, `onChanged`, `onMoved` and the other bookmark events. The page waits 30 ms for more events, then runs `refresh()` once.
- **Rule:** bookmark data goes in `chrome.bookmarks`. Data that is only for the extension goes in `chrome.storage.local`.

The full behaviour spec is `.claude/rules/business-logic.md`.
