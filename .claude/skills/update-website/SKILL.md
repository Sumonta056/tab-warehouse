---
name: update-website
description: Update the GitHub Pages website (site/), its live demo, its screenshots and README.md after a feature, setting or UI change ships. Use when asked to "update the website", "update the site/README for the new feature", "refresh screenshots", or after /add-feature or /release changed something a user can see.
---

# Update the website and README

The website lives in `site/` and deploys to `https://sumonta056.github.io/tab-warehouse/` through `.github/workflows/pages.yml` after CI passes on `main`. The live demo runs the real extension files from the **last commit** (`site/build.sh` uses `git archive HEAD`) with a fake `chrome.*` API in `site/demo/demo-chrome.js`.

**Before you start:** the feature must be committed. Uncommitted extension code does not appear in the demo or in the screenshots. Plan the edits and get approval before you change files. Never commit without being asked.

## 1. Find what changed

- `git log --oneline <last site commit>..HEAD` and `git diff <last site commit>..HEAD -- .claude/rules/business-logic.md` list the new behaviour.
- `CHANGELOG.md` names user-visible changes.
- Ignore internal changes (tests, refactors, CI). The site describes what a user sees.

## 2. Map each change to the places it shows

| Area changed                       | Website (`site/index.html`)               | Screenshot(s)        | README.md section              |
| ---------------------------------- | ----------------------------------------- | -------------------- | ------------------------------ |
| Home (clock, tiles, background)    | feature "Home page"                       | `home-demo.png`      | Features › Home                |
| Sidebar, categories, drag and drop | feature "Categories and drag and drop"    | `sprint.png`         | Features › Sidebar             |
| Folder page, sections, sort        | feature "Folders and sections"            | `sections.png`       | Features › Folder page         |
| Tag matrix, derive                 | feature "Tag matrix"                      | `env-matrix.png`     | Features › Tags                |
| Tags, tags by address, sites       | section "How tags work" + Settings tab    | `settings-tags.png`  | Features › Tags                |
| Palette, search, `tw`              | feature "Command palette and search"      | `palette.png`        | Search and command palette     |
| Popup                              | feature "Save the current tab"            | `popup.png`          | Features › Popup               |
| Any Settings tab                   | `SETTINGS` array in `site/site.js`        | `settings-<tab>.png` | Features › Settings and backup |
| New view (e.g. a new page)         | a new `.feature` block (alternate `flip`) | new `<name>.png`     | new Features subsection        |
| Keyboard shortcut                  | "Keyboard shortcuts" table                | —                    | Keyboard shortcuts             |
| Permission                         | "Privacy and permissions" table           | —                    | Privacy and permissions        |
| Version bump                       | JSON-LD `softwareVersion` in `<head>`     | —                    | Changelog (done by `/release`) |

`home.png` and `folder.png` are the owner's own screenshots. Never replace them unless asked; all other screenshots come from the demo, so they never show personal data.

## 3. Give the demo the data it needs

If the new feature needs sample data (a new setting, a folder shape, a section), add it to `sampleTree()` or `sampleSettings()` in `site/demo/demo-chrome.js`. If the extension calls a `chrome.*` method the stub does not have, add it there. Keep sample hosts on `example.com` / `localhost:3000` so the Settings › Tags **Try it** samples still match.

## 4. Build and look

```sh
./site/build.sh && python3 -I tests/serve.py 8811 _site
```

Open `http://127.0.0.1:8811/` and `http://127.0.0.1:8811/demo/newtab.html`. Check the console: the only expected errors are 404s for `/_favicon/` (the demo has no Chrome favicon cache).

## 5. Recapture the screenshots that changed

Use Chrome DevTools MCP (own tab, close it at the end):

1. `new_page` → `http://127.0.0.1:8811/demo/newtab.html`, `resize_page` to **1440 × 880** (device scale 2 gives 2880 px).
2. Drive the state with `evaluate_script` (click sidebar items or tabs by their text, type into `#q` and dispatch `input`), wait about 450 ms after each click, then `take_screenshot` with `filePath` = `site/screenshots/<name>.png`.
3. Shrink: `sips --resampleWidth 1800 site/screenshots/<name>.png`.
4. The popup is 420 px wide. The MCP window cannot go below 500 px, so use headless Chrome for it:
   ```sh
   P=$(mktemp -d); "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --user-data-dir="$P" \
     --hide-scrollbars --force-device-scale-factor=2 --window-size=420,634 --virtual-time-budget=3000 \
     --screenshot="$PWD/site/screenshots/popup.png" http://127.0.0.1:8811/demo/popup.html; rm -rf "$P"
   ```
5. Read every new screenshot. It must show the new feature, with no half-loaded icons and no other session's unfinished UI.
6. Update the `width` / `height` attributes of the `<img>` tags if the image size changed.

## 6. Write the text

- Website and README use the same words for the same thing. Sentence case, plain verbs, short sentences, no "Successfully".
- Each feature block: one `<h3>`, one or two sentences, at most 4 list items. Do not add long step-by-step instructions.
- New screenshots get a real `alt` text that says what the picture shows.
- README: add the feature under the matching Features subsection and put its screenshot after that subsection, as the existing ones are. Do not edit the Changelog section; `/release` owns it.
- If the feature changes what the product is, update the `<meta name="description">`, `og:description`, `twitter:description` and the JSON-LD `description` in `site/index.html` too. Keep the `<title>` as `Tab Warehouse`.

## 7. Check

1. `npx prettier --write site README.md` then `npm run format:check`.
2. `./site/build.sh` succeeds, and the demo pages in `_site/demo/` contain `demo-chrome.js` and `noindex`.
3. Open the site at 1440 px and at phone width (390 px): no horizontal scroll, every image loads, the demo switches between **New tab page** and **Popup**, a popup save shows up in the new tab page, **Reset demo** restores the sample data.
4. Lighthouse (`lighthouse_audit`, mobile): SEO and Accessibility stay at 100.
5. `./tests/run.sh` is green (the site does not change extension code, but the hooks run it).

Report what changed on the site, which screenshots you replaced and anything you could not verify. Ask before you commit; the commit type is `docs(site): …` for text and screenshots, `feat(site): …` for new site behaviour.
