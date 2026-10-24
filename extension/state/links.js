import { setLinkMeta, loadLinkMeta, saveLinkMeta } from '../services/storage.js';
import { createBookmark, removeBookmark } from '../services/bookmarks.js';
import { flatten } from '../domain/tree.js';
import { state, setState } from './page-state.js';

export async function patchLinkMeta(id, patch) {
  setState({ linkMeta: await setLinkMeta(id, { ...state.linkMeta[id], ...patch }) });
}

export async function replaceLinkMeta(id, meta) {
  setState({ linkMeta: await setLinkMeta(id, meta) });
}

export async function deleteLinks(bms) {
  const gone = bms.map((bm) => ({ bm, meta: state.linkMeta[bm.id] }));
  for (const { bm, meta } of gone) {
    await removeBookmark(bm.id);
    if (meta) await replaceLinkMeta(bm.id, null);
  }
  return async () => {
    for (const { bm, meta } of [...gone].sort((a, b) => a.bm.index - b.bm.index)) {
      const back = await createBookmark({ parentId: bm.parentId, index: bm.index, title: bm.title, url: bm.url });
      if (meta) await replaceLinkMeta(back.id, meta);
    }
  };
}

export async function pruneLinkMeta() {
  const ids = new Set(flatten(state.tree).map((b) => b.id));
  const all = await loadLinkMeta();
  const gone = Object.keys(all).filter((id) => !ids.has(id));
  if (!gone.length) return;
  gone.forEach((id) => delete all[id]);
  setState({ linkMeta: all });
  await saveLinkMeta(all);
}
