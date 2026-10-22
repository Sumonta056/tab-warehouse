---
description: Chrome MV3 constraints that apply to every file in this repo
---

# Chrome extension rules

- Manifest V3 only. No `background` service worker is needed today; add one only for alarms/omnibox/context menus, and declare why.
- Pages are `chrome-extension://` documents: no inline `<script>` and no inline event handlers (`onclick="..."`) — CSP blocks them. Attach listeners in JS (`h()` supports `onClick`).
- No remote code. No CDN `<script>` tags. Fonts come from the system stack in `lib/shared.css`.
- `chrome.*` calls are promise-based; always `await` them and keep UI-blocking work out of event listeners.
- Opening a URL from the new-tab page: `<a target="_blank" rel="noopener">` for plain clicks; `chrome.tabs.create({ url, active })` when you need background tabs or are inside the popup.
- Favicons come from `chrome.runtime.getURL('/_favicon/?pageUrl=…&size=32')` (needs the `favicon` permission). Always provide the letter-icon fallback via `iconEl()`.
- When adding a permission, add it to `manifest.json` *and* to the "Permissions" section of README.md with one line explaining why.
- Reload cycle after edits: `chrome://extensions` → ↻ on the card → open a new tab. The popup reloads on each open without a card refresh unless `manifest.json` changed.
- `draggable` must be the string `"true"` (`h()` handles this); `draggable=""` means *auto*, which is off for everything except `<a>` and `<img>`. Put `draggable` on the element that receives `dragstart`, not on a child `<span>` inside a `<button>`.
