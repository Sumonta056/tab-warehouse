import { setLinkMeta, loadLinkMeta, saveLinkMeta } from '../services/storage.js';
import { createBookmark, removeBookmark } from '../services/bookmarks.js';
import { flatten } from '../domain/tree.js';
import { withoutDone } from '../domain/meta.js';
import { dayKey, sweepDone, undoneMeta } from '../domain/today.js';
import { state, setState } from './page-state.js';

export async function patchLinkMeta(id, patch) {
  setState({ linkMeta: await setLinkMeta(id, { ...state.linkMeta[id], ...patch }) });
}

export async function replaceLinkMeta(id, meta) {
  setState({ linkMeta: await setLinkMeta(id, meta) });
}

function restorer(gone) {
  return async () => {
    for (const { bm, meta } of [...gone].sort((a, b) => a.bm.index - b.bm.index)) {
      const back = await createBookmark({ parentId: bm.parentId, index: bm.index, title: bm.title, url: bm.url });
      if (meta) await replaceLinkMeta(back.id, meta);
    }
  };
}

export async function deleteLinks(bms) {
  const gone = bms.map((bm) => ({ bm, had: !!state.linkMeta[bm.id], meta: withoutDone(state.linkMeta[bm.id]) }));
  for (const { bm, had } of gone) {
    await removeBookmark(bm.id);
    if (had) await replaceLinkMeta(bm.id, null);
  }
  return restorer(gone);
}

export function setDone(id, on, now = new Date()) {
  return patchLinkMeta(id, { done: on ? dayKey(now) : undefined });
}

export function addToToday(id, now = new Date()) {
  return patchLinkMeta(id, { due: dayKey(now), done: undefined });
}

let sweeping = false;

export async function sweepDoneLinks(secs, now = new Date()) {
  if (sweeping) return null;
  sweeping = true;
  try {
    const all = await loadLinkMeta();
    const old = sweepDone(secs, all, now);
    if (!old.length) return null;
    const gone = [];
    for (const bm of old) {
      const ok = await removeBookmark(bm.id).then(
        () => true,
        () => false,
      );
      if (ok) gone.push({ bm, meta: undoneMeta(all[bm.id]) });
    }
    const fresh = await loadLinkMeta();
    old.forEach((bm) => delete fresh[bm.id]);
    await saveLinkMeta(fresh);
    setState({ linkMeta: fresh });
    return gone.length ? { n: gone.length, undo: restorer(gone) } : null;
  } finally {
    sweeping = false;
  }
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
