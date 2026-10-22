---
description: Gotchas when calling chrome.bookmarks
paths:
  - 'newtab.js'
  - 'lib/core.js'
---

# chrome.bookmarks gotchas

- `getTree()` returns `[root]`; the invisible root's children are Bookmarks bar, Other bookmarks, Mobile bookmarks (ids `1`, `2`, `3` on desktop Chrome, but don't hard-code them — use `resolveRoot()`).
- Folders have no `url`; links have one. A node's `index` is its position in its parent and is what "Manual" sort uses.
- `move(id, { parentId, index })` within the **same** parent interprets `index` as the pre-removal position: pass the drop target's current `index` to land before it, `index + 1` to land after. Omit `index` to append.
- `update(id, { title, url })` rejects invalid URLs — normalise with `https://` when no scheme and surface the error in a toast.
- `remove(id)` works on links and empty folders; `removeTree(id)` for folders with children. Always confirm `removeTree`.
- Events fire for changes made anywhere (bookmark manager, sync, other windows). The listeners in `bindGlobal()` call `refresh()`, which rebuilds `secs` and re-renders; don't keep stale node references across a refresh.
- Bookmarks created by `create()` get `dateAdded` in ms; "Date added" sort uses it, newest first.
