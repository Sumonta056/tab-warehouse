---
name: perf-check
description: Measure RAM use, look for memory leaks and slow renders, and run the security checklist on the real extension. Use when asked "how much RAM", "any leak", "performance check", "security check", "audit", or before a release that changed rendering, listeners, timers, storage, permissions or import.
---

# Performance, leak and security check

Two parts: a measured run on the real extension (`tests/perf/memprobe.mjs`) and a static security checklist. Report numbers, not guesses.

## 1. Measured run

```
node tests/perf/memprobe.mjs                    # 1000 links, 300 cycles (~1 min)
LINKS=5000 node tests/perf/memprobe.mjs         # large profile (~2 min)
CYCLES=600 node tests/perf/memprobe.mjs         # longer leak run
```

What it does:

1. Starts headless **Chrome for Testing** with the extension loaded unpacked (branded Google Chrome ignores `--load-extension` since v137). It looks in `~/Library/Caches/ms-playwright/chromium-*`; else set `CHROME=/path`. Install with `npx playwright install chromium`.
2. Talks to Chrome over `--remote-debugging-pipe` (no npm, no websocket library).
3. Opens the new tab (`chrome-extension://…/newtab.html`), seeds `My Links` with 20 folders, each with one section, using the **real** `chrome.bookmarks`.
4. Runs N cycles: switch folder, open a link menu, change sort, Home → Settings → back every 10th cycle, create + remove a bookmark (one debounced `refresh()` each).
5. Forces GC twice before every reading. Reads JS heap, DOM nodes, event listeners (`Performance.getMetrics`) and the extension process memory (macOS `footprint`, else `ps` RSS).

Exit code: `0` all checks pass, `1` a check failed, `2` setup error. The last line is `PERF_RESULT {json}`.

### Checks and how to read them

| Check                               | Meaning when it fails                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| DOM nodes stable in 2nd half        | Detached or duplicated elements survive a re-render: a leak.                                        |
| Listeners stable in 2nd half        | A listener is added on `document`/`window`/a kept element per render and never removed.             |
| JS heap growth in 2nd half < 0.3 MB | Something keeps references (arrays, maps, closures). First-half growth is V8 warm-up and is normal. |
| Folder render < 50 ms               | The full re-render is too slow for the folder size.                                                 |
| No page errors                      | An exception was thrown during the run.                                                             |

Process memory is reported but not checked: Chrome keeps freed pages for reuse, so it rises then flattens. Compare it to the last run in the table below; it only signals a leak if it keeps rising with `CYCLES=600`.

### Finding a leak when a check fails

1. Rerun with fewer steps: edit the `CYCLE` body in `tests/perf/memprobe.mjs` to keep only one action (nav, menu, sort, settings, create/remove) and see which one grows.
2. Search the code that action reaches for: `document.addEventListener`, `window.addEventListener`, `chrome.*.addListener` outside `bindGlobal()`, `setInterval`, `setTimeout` without `clearTimeout`, module-level arrays/maps that only grow, `URL.createObjectURL` without `revokeObjectURL`.
3. For object detail use the Chrome DevTools MCP: `take_heapsnapshot` before and after, compare `Detached` nodes.
4. Fix, add a regression scenario if the behaviour changed, run `./tests/run.sh` and this check again.

### Baseline (2026-10-23, release 2.4.0, Chrome for Testing 1243, Apple Silicon)

| State                        | JS heap | DOM nodes | Listeners | Process  |
| ---------------------------- | ------- | --------- | --------- | -------- |
| Home, no bookmarks           | 0.95 MB | 294       | 38        | 52 MB    |
| 1000 links, after 300 cycles | 2.05 MB | 2480      | 934       | 89–98 MB |
| 5000 links, after 300 cycles | 3.5 MB  | 7631      | 2884      | 148 MB   |

The 5000-link row is from 2026-10-22 (2.3.0). The DOM node count after 1000 links moves between 2478 and 2480 from run to run, so the "DOM nodes stable" check can fail by ±2 without a leak; rerun before you look for one. Folder render: 4–5 ms at 50 rows (3.9 ms in 2.3.0), 16 ms at 250 rows. Sorting 5000 links in Node: env 10 ms, name 10 ms, url 9 ms, host 12 ms. Update this table when a change moves the numbers on purpose.

## 2. Security checklist

Run these and read every hit:

```
grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" -r extension --include=*.js
grep -nE "https?://" -r extension --include=*.js
grep -n '"permissions"\|content_security_policy\|host_permissions' extension/manifest.json
```

| Rule                                                                                                                                                                  | Where                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Bookmark titles/URLs never reach `innerHTML`; only `svgIcon()` uses it, with fixed strings.                                                                           | `ui/dom.js`                               |
| No `content_security_policy` key in the manifest (keep the strict MV3 default). No remote scripts.                                                                    | `manifest.json`                           |
| Each permission is used and is the narrowest one. The popup reads the active tab through `activeTab`; do not add `tabs` back (it shows "Read your browsing history"). | `manifest.json`, `popup.js`               |
| Links opened from the page use `rel="noopener"`.                                                                                                                      | `newtab.js`, `home.js`                    |
| CSS `url("…")` only gets `canvas.toDataURL` output, never user text.                                                                                                  | `home.js`, `domain/theme.js sideLookVars` |
| Import validates the shape of `preferences` (envRules, hostMap, folders) before `saveSettings`.                                                                       | `domain/transfer.js cleanImport`          |
| HTML export escapes titles and URLs.                                                                                                                                  | `domain/transfer.js esc`                  |
| Remote requests from Home (gstatic, default icon URLs, "Icon from URL") are known and listed.                                                                         | `home.js`, `domain/icons.js googleIcon`   |
| `chrome.storage.local` stays under 10 MB (no `unlimitedStorage`); write failures show a correct message.                                                              | `home.js setHomeBg / saveIcons`           |

## Report format

1. One line verdict: leak yes/no, RAM range, security issues count.
2. The metrics table from the run, next to the baseline.
3. Findings, highest risk first, each with `file:line`, impact, and the fix.
4. Ask before changing code.
