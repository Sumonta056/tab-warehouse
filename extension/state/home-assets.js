import { createBookmark, removeBookmark } from '../services/bookmarks.js';
import { loadHomeStore, saveHomeBg, saveHomeIcons } from '../services/storage.js';
import { resizeImage } from '../ui/image.js';

let icons = null;
let bg = null;

export async function loadHomeAssets() {
  if (icons && bg !== null) return;
  ({ icons, bg } = await loadHomeStore());
}

export function homeBgUrl() {
  return bg || '';
}

export function homeIconMap() {
  return icons || {};
}

export async function setHomeBg(file) {
  const next = file ? await resizeImage(file, 1920) : '';
  await saveHomeBg(next);
  bg = next;
  return bg;
}

export async function setHomeIcon(id, value) {
  const before = icons[id];
  if (value) icons[id] = value;
  else delete icons[id];
  try {
    await saveHomeIcons(icons);
  } catch (err) {
    if (before) icons[id] = before;
    else delete icons[id];
    throw err;
  }
}

export async function removeHomeLink(bm, announce) {
  const icon = icons[bm.id];
  await removeBookmark(bm.id);
  announce(async () => {
    const back = await createBookmark({ parentId: bm.parentId, index: bm.index, title: bm.title, url: bm.url });
    if (icon) await setHomeIcon(back.id, icon);
  });
  if (icon) await setHomeIcon(bm.id, null);
}
