---
name: web-store
description: Publish or update Tab Warehouse on the Chrome Web Store — build the store ZIP, refresh the listing text and images, and fill in the Package, Store listing, Privacy and Distribution tabs. Use when asked to publish to the Web Store, update the store listing, write permission justifications or answer a store review.
---

# Web Store

The listing text and the dashboard answers are in [listing.md](listing.md). Keep that file true to the shipped version; it is the only copy.

1. Release first with `/release`. The store needs a `version` in `extension/manifest.json` that is higher than the version in the store.
2. Build the upload from the committed tree (`tools/package.sh` exports `HEAD`, bundles it with `tools/build.mjs` into `dist/` and zips that):
   ```
   ./tools/package.sh --store
   ```
   It writes `tab-warehouse-<version>-store.zip` with `manifest.json` at the ZIP root (the store rejects a nested folder). The code is bundled but not minified or renamed, so it meets the store's readability rule; never add `minify` to `tools/build.mjs`. If a reviewer asks for the source, point to the public repository: `extension/` is the source and `npm run build` makes the same files.
3. Make `listing.md` match the release:
   - Read the new `CHANGELOG.md` entry. Add each user-visible feature to the **Description**, under its section. Remove features that no longer exist.
   - Update the version in the first paragraph of `listing.md`.
   - The **Summary** is the `description` in `extension/manifest.json` (max 132 characters). Change it there, not only in `listing.md`.
   - Compare `permissions` in `extension/manifest.json` with the **Permission justification** table. Every permission needs one row. A new permission also needs a line in README.md › Permissions.
   - Add any new local data to the `storage` row. Bookmark titles and URLs are never stored.
4. Images: when the UI changed, take new screenshots for `store/screenshot-1.png` … `-5` (1280×800 PNG) and `store/promo-small-440x280.png`. Use neutral sample data only (`example.com`, `shop.example.com`); see `/update-website` for the demo data.
5. Upload in the Developer Dashboard › Package › Upload new package. Then copy each field of `listing.md` into its tab: Store listing, Privacy, Distribution.
6. Submit for review. If the reviewer asks a question, answer from `listing.md` and add the answer there for next time.
7. Commit the changed `listing.md`, `store/` images and `manifest.json` together.
