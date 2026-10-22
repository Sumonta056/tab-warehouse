---
description: Visual and interaction conventions for newtab + popup
paths:
  - "newtab.*"
  - "popup.*"
  - "lib/shared.css"
---

# UI rules

- Build DOM with `h()` from `lib/core.js`. Text goes in as text nodes (never `innerHTML`) because titles and URLs are user content.
- Reuse `.row`, `.badge`, `.btn`, `.chip`, `.seg`, `.sel`, `.menu`, `.toast`, `.edit` before inventing a class. New shared classes go in `lib/shared.css`; page-only classes in `newtab.css`.
- Colors only via `var(--…)` tokens. Env mapping is fixed: PROD orange · TEST blue · STAGE purple · LOCAL green · GH grey.
- Long URLs must wrap (`word-break: break-all`) and the row must grow with them — never truncate in the folder page. Truncation is allowed only in the popup.
- In URL mode, show the title under the URL **only if it differs** (`sameAsUrl()`), otherwise it prints twice.
- Every clickable thing: ≥ 28 px (dense), ≥ 36 px (toolbar), ≥ 44 px (primary). Keep `:focus-visible` outlines; never `outline: none` without a replacement.
- Keyboard: `⌘K`/`/` focus search, `Esc` clears/closes, `Enter` opens first hit, `j`/`k` move folders. Don't take those over for something else.
- Per-folder preferences (`sort`, `view`, `show`, collapsed groups) are saved through `setFolderPrefs()`; global ones through `saveSettings()`. Never save bookmark content.
- Destructive actions: links → undo toast (8 s); folders → `confirm()`.
- Copy: sentence case, plain verbs, no exclamation marks, no "Successfully …". Empty and error states say what to do next.
