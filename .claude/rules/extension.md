---
description: Chrome MV3 constraints that apply to every file in this repo
---

# Chrome extension rules

- Manifest V3 only. `background.js` is a module service worker for the `tw` omnibox and the `quick-save` / `palette` commands; it is an entry point and only wires services to domain functions.
- Only `services/` calls `chrome.*` (checked by `tests/unit/architecture.test.mjs`). Everything else gets Chrome data through a service function, so domain code stays pure and every service is unit-tested against `tests/unit/fake-chrome.mjs`.
- Pages are `chrome-extension://` documents: no inline `<script>` and no inline event handlers (`onclick="..."`) — CSP blocks them. Attach listeners in JS (`h()` supports `onClick`).
- No remote code. No CDN `<script>` tags. Fonts come from the system stack in `styles/tokens.css`.
- `chrome.*` calls are promise-based; always `await` them and keep UI-blocking work out of event listeners.
- Opening a URL from the new-tab page: `<a target="_blank" rel="noopener">` for plain clicks; `chrome.tabs.create({ url, active })` when you need background tabs or are inside the popup.
- Favicons come from `chrome.runtime.getURL('/_favicon/?pageUrl=…&size=32')` (needs the `favicon` permission). Always provide the letter-icon fallback via `iconEl()`.
- When adding a permission, add it to `manifest.json` _and_ to the "Permissions" section of README.md with one line explaining why.
- Load unpacked from `extension/` (it holds `manifest.json`). Reload cycle after edits: `chrome://extensions` → ↻ on the card → open a new tab. The popup reloads on each open without a card refresh unless `manifest.json` changed.
- `draggable` must be the string `"true"` (`h()` handles this); `draggable=""` means _auto_, which is off for everything except `<a>` and `<img>`. Put `draggable` on the element that receives `dragstart`, not on a child `<span>` inside a `<button>`.
- Releases ship `dist/`, built by `tools/build.mjs` (esbuild, never minified). Load `dist/` unpacked (after `npm run build`) to try exactly what ships; a file Chrome loads by path (not by `import`) must be in `COPY` in `tools/build.mjs`.
