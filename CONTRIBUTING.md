# Contributing to Tab Warehouse

Thank you for your interest in this project. This guide shows how to set up the project, how the code is organized, and what a pull request needs.

## Ways to help

- **Report a bug.** Open an [issue](https://github.com/Sumonta056/tab-warehouse/issues) with the steps to reproduce it, what you expected, what happened, and your Chrome version.
- **Suggest a feature.** Open an issue that describes the problem first, then your idea. Discuss large changes before you write code.
- **Send a pull request.** Small, focused pull requests are easiest to review.

## Set up

There is no build step and nothing to install.

1. Fork the repository and clone your fork:
   ```sh
   git clone https://github.com/<your-user>/tab-warehouse.git
   cd tab-warehouse
   ```
2. Open `chrome://extensions`, turn on **Developer mode** and click **Load unpacked**. Choose the project folder.
3. Open a new tab.

To test with your real bookmarks safely, use a separate Chrome profile.

### Reload after a change

- **New tab page or Settings:** click ↻ on the extension card in `chrome://extensions`, then open a new tab.
- **Popup:** it reloads each time it opens. If you changed `manifest.json`, reload the card first.

## Project structure

```
manifest.json          Manifest V3: new tab override, popup, ⌘⇧B command
newtab.html/.css/.js   The main page: sidebar + folder page
home.js                Home view: clock, tiles, default links
settings.js            Settings view (5 tabs)
popup.html/.js         Toolbar popup: save the current tab
lib/core.js            Shared logic: settings, env detection, derive, sort, matrix, DOM helper
lib/transfer.js        Export and import
lib/shared.css         Design tokens and shared components
tests/                 run.sh · unit/ · e2e/ · perf/
.claude/rules/         Conventions and the behaviour spec (business-logic.md)
```

Read these 2 files before you change behaviour:

- [`CLAUDE.md`](CLAUDE.md) — architecture and conventions.
- [`.claude/rules/business-logic.md`](.claude/rules/business-logic.md) — the behaviour spec. Every rule has at least one test.

## Core rules

1. **Chrome's bookmarks are the source of truth.** Never store bookmark titles or URLs in `chrome.storage`. Change bookmarks with the `chrome.bookmarks` API and let `refresh()` re-render.
2. **No dependencies.** Do not add npm, a bundler, a framework or TypeScript.
3. **No remote code.** No CDN scripts, no inline `<script>` and no inline event handlers (the extension CSP blocks them).
4. **No `innerHTML` with user data.** Build DOM with the `h()` helper. Titles and URLs are user content.
5. **No new permissions** without a reason in the pull request and a line in the README's permissions table.

## Code style

- 2-space indent, single quotes, semicolons.
- Early returns. No classes.
- Match the code around your change.
- Colors only through the tokens in `lib/shared.css`. Do not change the env colors: PROD orange, TEST blue, STAGE purple, LOCAL green.
- UI text in sentence case with plain verbs ("Save", not "Submit").
- Interactive elements at least 28 px tall in lists, 36 px in toolbars and 44 px for primary actions. Keep `:focus-visible` working.
- Every destructive action gets an undo toast (links, Home tiles) or a confirm (folders, sections, categories).

## Tests

Run the full check before you open a pull request. It takes about 10 seconds.

```sh
./tests/run.sh               # syntax + unit + end-to-end
./tests/run.sh "sections"    # only e2e scenarios whose name contains "sections"
```

- Unit tests are in `tests/unit/` and use `node --test`.
- End-to-end scenarios are in `tests/e2e/scenarios/`. They run the real pages in headless Chrome with a fake `chrome.*` API.
- To watch one scenario run:
  ```sh
  python3 -I tests/serve.py 8799
  # open http://127.0.0.1:8799/tests/e2e/runner.html?only=<name>
  ```
- If you change rendering, listeners, timers or storage, also run `node tests/perf/memprobe.mjs`.

**Every behaviour change updates `business-logic.md` and adds or updates a test in the same pull request.** Never weaken a test to make it pass.

## Pull request checklist

- [ ] The change does one thing, and the title says what it is.
- [ ] `./tests/run.sh` is green.
- [ ] `.claude/rules/business-logic.md` describes the new or changed behaviour.
- [ ] A test covers the new or changed behaviour.
- [ ] No new dependencies and no new permissions (or the reason is in the description).
- [ ] UI changes include a screenshot.
- [ ] The README is updated if the user-facing behaviour changed.

## Commit messages

Use a short summary in the imperative mood, for example:

```
Add host sort to the folder page
Fix popup folder filter for nested folders
```

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
