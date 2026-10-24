---
name: release
description: Cut a release of the extension — bump version, sanity-check, produce the zip for loading unpacked or Web Store upload. Use when asked to package, zip, release, or bump the version.
---

# Release

1. Bump `version` in `extension/manifest.json` and `package.json` (semver; UI change = minor, fix = patch).
2. Run: `./tests/run.sh` — it must end with exit code 0 (syntax, unit, the e2e scenarios on `extension/` and the same scenarios on the `dist/` build). Do not release on red.
3. Confirm `extension/manifest.json` lists only `bookmarks storage favicon activeTab` unless a new permission was documented in README.md.
   Then run `npm run build` and `node tests/perf/memprobe.mjs dist` (see `/perf-check`). It must exit 0. Compare its table with the baseline in the perf-check skill; explain any large rise before you release.
4. Build and package the committed tree (it exports `HEAD`, runs `tools/build.mjs` on it and zips `dist/` plus LICENSE, so commit first; needs `npm install` for esbuild):
   ```
   ./tools/package.sh
   ```
   For the Chrome Web Store, run `./tools/package.sh --store`. It writes `tab-warehouse-<version>-store.zip` with `manifest.json` at the ZIP root (the store rejects a nested folder). Upload it in the Developer Dashboard › Package › Upload new package. For the store listing, images and the dashboard steps, run `/web-store`.
5. Load the zip's contents (the built `dist/`, not `extension/`) unpacked in a fresh Chrome profile and check: no errors on `chrome://extensions`, the new tab loads `newtab.js` + `newtab.css` only, new tab opens an empty Home with the _Add link_ tile and help text, Settings › Environments shows empty lists, the sidebar resizes, popup opens on `⌘⇧B` and saves the current tab, `⌘K` saves without the popup (green ✓ badge) and opens the popup on a duplicate, `⌘⇧K` on the new tab opens the palette, Settings › Shortcuts lists the three keys, a drag-reorder of the sidebar survives a reload.
6. Note what changed in README.md under a short "Changelog" entry.
7. Publishing the GitHub release triggers `.github/workflows/release-zip.yml`, which attaches `tab-warehouse-<version>.zip` (built by `tools/package.sh`) to the release. The website Download button uses that file. Check that the asset is there.
8. Run `/update-website` for any user-visible change in this release, and bump `softwareVersion` in the JSON-LD of `site/index.html`.
