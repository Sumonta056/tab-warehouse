# Chrome Web Store listing

Copy these fields into the Developer Dashboard. Images are in `store/`. Build the upload with `./tools/package.sh --store`.

## Package

- File: `tab-warehouse-<version>-store.zip` (`manifest.json` at the ZIP root).
- Each upload needs a higher `version` in `extension/manifest.json`.

## Store listing tab

**Category:** Productivity › Tools

**Language:** English

**Summary** (from the manifest, 128 / 132 characters):

> Bookmark manager and new tab page for developers: folders, full URLs, PROD/TEST/STAGE/LOCAL env tags, env matrix, drag and drop.

**Description:**

```
Tab Warehouse turns your Chrome bookmarks into a warehouse: a new tab page with a clock and your favourite sites, a folder view that shows every URL in full, and a Board with every folder side by side.

Built for developers who keep the same page open in many versions: live, test, staging and localhost.

WHY TAB WAREHOUSE
• Every URL in full. Nothing is cut, so you always see which host you are about to open.
• Environment tags. Each link gets a PROD, TEST, STAGE or LOCAL badge from rules you write.
• Env matrix. See the same page across all environments in one table, and jump from TEST to PROD in one click.
• No lock-in. Your links stay real Chrome bookmarks. They sync with your Google account and show in Chrome's bookmark manager. Remove the extension and nothing is lost.

HOME
• A large clock, the date and your site tiles on every new tab.
• Your own background image, with darkness, blur, clock size, icon size and icons per row.
• Drag tiles to reorder. Change an icon, edit or remove a tile (with undo).

SIDEBAR
• One entry per folder, with link counts and search across all folders.
• Drag folders into your own order and group them into colored categories.
• Drop a link on a folder to move it there.
• Resizable, with a solid color or a blurred copy of your Home background.

BOARD
• Every folder as a column of cards, side by side, grouped by category.
• Drag cards between folders and sections. Add, delete and filter links in place.

FOLDER PAGE
• Sort by manual order, name, URL, environment, date added or host.
• Sections: split a folder into groups such as "In progress" or "Blocked". Each section is a real subfolder.
• Inline edit, right-click menus, a filter, Open all and Copy all URLs.

SAVE THE CURRENT TAB
• Press Ctrl+Shift+B (⌘⇧B on Mac) to save the current tab into any folder, or create a new folder by name.

SETTINGS AND BACKUP
• Accent color, text size, your name in the header.
• Export to JSON or HTML (Chrome's bookmark format). Import merges and skips links you already have.

PRIVACY
No server, no account, no analytics and no tracking. Your bookmarks stay in Chrome. Free and open source (MIT).

Website and live demo: https://sumonta056.github.io/tab-warehouse/
Source code: https://github.com/Sumonta056/tab-warehouse
```

**Graphic assets:**

| Field                | File                            |
| -------------------- | ------------------------------- |
| Store icon (128×128) | `extension/icons/icon128.png`   |
| Screenshots          | `store/screenshot-1.png` … `-5` |
| Small promo tile     | `store/promo-small-440x280.png` |
| Marquee promo tile   | Not needed (optional)           |

**Additional fields:**

- Official URL: none (it needs a verified domain in Google Search Console).
- Homepage URL: `https://sumonta056.github.io/tab-warehouse/`
- Support URL: `https://github.com/Sumonta056/tab-warehouse/issues`
- Mature content: No.

## Privacy tab

**Single purpose:**

```
Tab Warehouse replaces the new tab page with a bookmark manager: it shows, organises and edits the user's Chrome bookmarks, and saves the current tab as a bookmark.
```

**Permission justification:**

| Permission  | Justification                                                                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bookmarks` | The extension is a bookmark manager. It reads the bookmark tree to show folders and links, and creates, edits, moves and deletes bookmarks when the user asks.               |
| `storage`   | Saves the user's preferences on the device: sidebar order, categories, environment rules, Home look, custom icons and the Home background image. No bookmark data is stored. |
| `favicon`   | Shows each site's icon next to its link, from Chrome's own favicon cache.                                                                                                    |
| `activeTab` | When the user clicks the toolbar button or presses Ctrl+Shift+B, the popup reads the current tab's title and URL so the user can save it as a bookmark.                      |

**Host permissions:** none.

**Remote code:** No, I am not using remote code.

**Data usage** (what the extension collects):

- Tick **Web history** (bookmarks are a list of visited sites). The data stays on the device and is never sent to the developer.
- Leave all other boxes empty.
- Tick all 3 certifications:
  - I do not sell or transfer user data to third parties, outside of the approved use cases.
  - I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  - I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://sumonta056.github.io/tab-warehouse/privacy.html`

## Distribution tab

- Payments: Free.
- Visibility: Public (or Unlisted for a first test).
- Regions: All regions.
