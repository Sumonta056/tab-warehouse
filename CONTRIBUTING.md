# Contributing to Tab Warehouse

Thank you for your interest in this project. This guide shows how to set up the project, how the code is organized, and what a pull request needs.

## Ways to help

- **Report a bug.** Open an [issue](https://github.com/Sumonta056/tab-warehouse/issues) with the steps to reproduce it, what you expected, what happened, and your Chrome version.
- **Suggest a feature.** Open an issue that describes the problem first, then your idea. Discuss large changes before you write code.
- **Send a pull request.** Small, focused pull requests are easiest to review.

## Set up

There is no build step. The extension runs straight from the source folder.

1. Fork the repository and clone your fork:
   ```sh
   git clone https://github.com/<your-user>/tab-warehouse.git
   cd tab-warehouse
   ```
2. Install the dev tools and git hooks (Node 20 or newer):
   ```sh
   npm install
   ```
3. Open `chrome://extensions`, turn on **Developer mode** and click **Load unpacked**. Choose the `extension` folder in the project.
4. Open a new tab.

To test with your real bookmarks safely, use a separate Chrome profile.

### Reload after a change

- **New tab page or Settings:** click ↻ on the extension card in `chrome://extensions`, then open a new tab.
- **Popup:** it reloads each time it opens. If you changed `manifest.json`, reload the card first.

## Project structure

```
extension/             Everything Chrome loads (choose this folder in Load unpacked)
  manifest.json        Manifest V3: new tab override, popup, omnibox, ⌘⇧B / ⌘K / ⌘⇧K commands
  newtab.html/.js      The main page: sidebar + folder page
  popup.html/.js       Toolbar popup: save the current tab
  constants/           Fixed values: envs, tags, sorts, themes, limits, defaults
  domain/              Pure logic: env detection, derive, sort, matrix, search, due dates, backup
  services/            The only code that calls Chrome APIs: storage, bookmarks, tabs, omnibox, favicons, import
  ui/                  Shared DOM pieces: h() helper, toast, menu, badges, icons, pickers, export
  state/               Shared page state and the actions that save it
  views/               One folder per screen: sidebar, folder, search, schedule, board, home, palette, settings, popup
  styles/              tokens.css, base.css, ui/ (one file per ui piece), views/ (one file per screen)
  icons/               Extension icons
tools/                 make-icons.py · package.sh (release ZIP) · coverage-gate.mjs (unit coverage gate)
docs/                  Notes and requirements
tests/                 run.sh · unit/ · e2e/ · perf/
.claude/rules/         Conventions and the behaviour spec (business-logic.md)
```

Read these 2 files before you change behaviour:

- [`CLAUDE.md`](CLAUDE.md) — architecture and conventions.
- [`.claude/rules/business-logic.md`](.claude/rules/business-logic.md) — the behaviour spec. Every rule has at least one test.

## Core rules

1. **Chrome's bookmarks are the source of truth.** Never store bookmark titles or URLs in `chrome.storage`. Change bookmarks with the `chrome.bookmarks` API and let `refresh()` re-render.
2. **No runtime dependencies.** Do not add a bundler, a framework, TypeScript or any package that ships with the extension. npm is only for dev tools (`devDependencies`).
3. **No remote code.** No CDN scripts, no inline `<script>` and no inline event handlers (the extension CSP blocks them).
4. **No `innerHTML` with user data.** Build DOM with the `h()` helper. Titles and URLs are user content.
5. **No new permissions** without a reason in the pull request and a line in the README's permissions table.
6. **Layers.** `constants ← domain ← services ← ui ← state ← views ← entry points`: a file imports only from its own layer or the layers to its left, and a view never imports another view (the entry point passes it a `ctx` of functions). `domain/` and `constants/` never touch `document`, `window` or `chrome`. **Only `services/` calls `chrome.*`.** `tests/unit/architecture.test.mjs` checks all of this.

## Where new code goes

| New code                                         | Goes in                                             | Its test                                                                             |
| ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A fixed value (name list, limit, default, label) | `extension/constants/`                              | Covered by the tests of the code that uses it                                        |
| Pure logic (no DOM, no `chrome.*`, no storage)   | `extension/domain/<topic>.js`                       | `tests/unit/domain/<topic>.test.mjs`                                                 |
| A `chrome.*` call                                | `extension/services/<api>.js`                       | `tests/unit/services/<api>.test.mjs`, using the fake in `tests/unit/fake-chrome.mjs` |
| A reusable DOM piece (takes data, returns nodes) | `extension/ui/<piece>.js`                           | A scenario in `tests/e2e/scenarios/ui.js`                                            |
| Shared page state or an action that saves it     | `extension/state/`                                  | Through the scenarios of the views that use it                                       |
| A screen or part of a screen                     | `extension/views/<screen>/`                         | A scenario in `tests/e2e/scenarios/<area>.js`                                        |
| Styles                                           | `extension/styles/ui/` or `extension/styles/views/` | `tests/unit/styles.test.mjs` checks the links and their order                        |

## Code style

- [Prettier](https://prettier.io) formats the code (`.prettierrc.json`). The pre-commit hook formats staged files for you; run `npm run format` to format everything, or `npm run format:check` to check only.
- 2-space indent, single quotes, semicolons.
- Early returns. No classes.
- Match the code around your change.
- Colors only through the tokens in `styles/tokens.css`. Do not change the env colors: PROD orange, TEST blue, STAGE purple, LOCAL green.
- UI text in sentence case with plain verbs ("Save", not "Submit").
- Interactive elements at least 28 px tall in lists, 36 px in toolbars and 44 px for primary actions. Keep `:focus-visible` working.
- Every destructive action gets an undo toast (links, Home tiles) or a confirm (folders, sections, categories).

## Tests

Run the full check before you open a pull request. It takes about a minute.

```sh
./tests/run.sh               # syntax + unit + coverage gate + end-to-end
./tests/run.sh "sections"    # only e2e scenarios whose name contains "sections"
```

- Unit tests are in `tests/unit/<layer>/` and use `node --test`. Every file in `extension/domain/` and `extension/services/` needs its own `tests/unit/<layer>/<name>.test.mjs`; `tests/unit/architecture.test.mjs` fails when one is missing.
- Coverage gate: `tools/coverage-gate.mjs` (run by `./tests/run.sh` and CI, or `npm run coverage:gate`) fails when a `domain/` file is under 90 % line coverage or a `services/` file under 80 %. `npm run coverage` prints the table.
- `./tests/run.sh` serves the repo on port 8799 (`PORT=<n>` picks another) and stops with an error when the port is already taken.
- End-to-end scenarios are in `tests/e2e/scenarios/`. They run the real pages in headless Chrome with a fake `chrome.*` API.
- To watch one scenario run:
  ```sh
  python3 -I tests/serve.py 8799
  # open http://127.0.0.1:8799/tests/e2e/runner.html?only=<name>
  ```
- If you change rendering, listeners, timers or storage, also run `node tests/perf/memprobe.mjs`.

**Every behaviour change updates `business-logic.md` and adds or updates a test in the same pull request.** Never weaken a test to make it pass.

## Git hooks

`npm install` sets up these hooks with [Husky](https://typicode.github.io/husky/):

| Hook       | What it runs                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| pre-commit | Prettier on staged files ([lint-staged](https://github.com/lint-staged/lint-staged)), then the syntax check and unit tests (`npm run test:fast`) |
| commit-msg | [commitlint](https://commitlint.js.org) with the Conventional Commits rules                                                                      |
| pre-push   | The full suite (`./tests/run.sh`)                                                                                                                |

GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on every pull request: commit messages, `npm run format:check` and `./tests/run.sh`. A pull request into `main` can merge only when CI is green.

## Pull request checklist

- [ ] The change does one thing, and the title says what it is.
- [ ] The commit messages follow Conventional Commits.
- [ ] `./tests/run.sh` is green.
- [ ] `.claude/rules/business-logic.md` describes the new or changed behaviour.
- [ ] A test covers the new or changed behaviour.
- [ ] No new dependencies and no new permissions (or the reason is in the description).
- [ ] UI changes include a screenshot.
- [ ] The README is updated if the user-facing behaviour changed.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`, with the summary in the imperative mood. The commit-msg hook rejects other formats.

```
feat: add host sort to the folder page
fix(popup): match nested folders in the filter
docs: explain env labels in the README
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
