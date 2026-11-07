import { CHIP_MAX } from '../constants/limits.js';
import { hostOf } from './url.js';

const linkCount = (n) => (n.children || []).filter((c) => c.url).length;

export function folderChoices(root) {
  const rootTitle = root.title || 'Bookmarks';
  const folders = [{ id: root.id, title: rootTitle, path: rootTitle, depth: 0, count: linkCount(root) }];
  const walk = (n, path, depth) => {
    for (const c of n.children || []) {
      if (c.url) continue;
      const p = [...path, c.title || '(untitled)'];
      folders.push({ id: c.id, title: p[p.length - 1], path: p.join(' › '), depth, count: linkCount(c) });
      walk(c, p, depth + 1);
    }
  };
  walk(root, [rootTitle], 1);
  return folders;
}

export function siteUrl(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? `${u.origin}/` : null;
  } catch {
    return null;
  }
}

export function targetUrl(mode, tab) {
  return mode === 'site' ? siteUrl(tab?.url) : tab?.url || null;
}

export function defaultTitle(mode, tab) {
  return mode === 'site' ? hostOf(tab.url) : tab.title || tab.url;
}

export function folderItems(folders, query) {
  const t = query.toLowerCase();
  const shown = t ? folders.filter((f) => f.path.toLowerCase().includes(t)) : folders;
  const items = shown.map((f) => ({ key: f.id, f }));
  if (t && !folders.some((f) => f.title.toLowerCase() === t)) items.push({ key: 'create', create: query });
  return items;
}

export function saveLabel(x, dup) {
  if (!x) return 'Save';
  return x.create ? `Create "${x.create}" and save` : `${dup ? 'Save again' : 'Save'} to ${x.f.title}`;
}

export function savedPath(folders, hit) {
  return folders.find((f) => f.id === hit.parentId)?.path || hit.path || 'another folder';
}

export function savedSummary(folders, hits) {
  if (!hits.length) return null;
  const hit = hits[0];
  const title = folders.find((f) => f.id === hit.parentId)?.title || hit.path?.split(' › ').at(-1) || 'another folder';
  return { text: `Saved in ${title}`, more: hits.length > 1 ? ` +${hits.length - 1} more` : '' };
}

export function folderAncestors(folders, id) {
  let i = folders.findIndex((f) => f.id === id);
  if (i < 0) return [];
  const out = [];
  let depth = folders[i].depth;
  for (i -= 1; i >= 0 && depth > 0; i -= 1) {
    if (folders[i].depth !== depth - 1) continue;
    out.unshift(folders[i].id);
    depth -= 1;
  }
  return out;
}

export function visibleFolders(folders, open, query) {
  if (query.trim()) return folderItems(folders, query.trim());
  const items = [];
  const parents = [];
  let hideBelow = Infinity;
  folders.forEach((f, i) => {
    parents.length = f.depth;
    const parent = parents[f.depth - 1] ?? null;
    parents[f.depth] = f.id;
    if (f.depth > hideBelow) return;
    hideBelow = Infinity;
    const kids = folders[i + 1]?.depth > f.depth;
    const isOpen = f.depth === 0 || (kids && open.has(f.id));
    items.push({ key: f.id, f, parent, kids, open: isOpen, tree: true });
    if (kids && !isOpen) hideBelow = f.depth;
  });
  return items;
}

export function folderArrow(items, i, key) {
  const x = items[i];
  if (!x?.tree) return null;
  const toggles = x.kids && x.f.depth > 0;
  if (key === 'ArrowRight') return toggles && !x.open ? { open: x.key } : null;
  if (key !== 'ArrowLeft') return null;
  if (toggles && x.open) return { close: x.key };
  const at = items.findIndex((y) => y.key === x.parent);
  return at < 0 ? null : { cursor: at };
}

export function chipIds(pins, recent, validIds, max = CHIP_MAX) {
  const pinned = (pins || []).filter((id) => validIds.has(id));
  const rest = (recent || []).filter((id) => validIds.has(id) && !pinned.includes(id));
  return [...new Set([...pinned, ...rest])].slice(0, max);
}

export function pushRecent(recent, id, max = CHIP_MAX) {
  return [id, ...(recent || []).filter((x) => x !== id)].slice(0, max);
}

export function togglePin(pins, id, max = CHIP_MAX) {
  const list = pins || [];
  if (list.includes(id)) return { pins: list.filter((x) => x !== id) };
  if (list.length >= max) return { pins: list, error: `You can pin up to ${max} folders.` };
  return { pins: [...list, id] };
}

export function togglePinIn(pins, id, validIds, max = CHIP_MAX) {
  return togglePin(
    (pins || []).filter((x) => validIds.has(x)),
    id,
    max,
  );
}

export function saveChips(folders, settings) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const pins = settings.savePins || [];
  return chipIds(pins, settings.saveRecent, new Set(byId.keys())).map((id, i) => {
    const f = byId.get(id);
    const pinned = pins.includes(id);
    return { id, title: f.title, pinned, n: i + 1, tip: `${f.path} · ${pinned ? 'pinned' : 'recent'} · Alt+${i + 1}` };
  });
}

export function staleSaveFolders(settings, folderIds) {
  const patch = {};
  for (const key of ['savePins', 'saveRecent']) {
    const list = settings[key] || [];
    if (list.some((id) => !folderIds.has(id))) patch[key] = list.filter((id) => folderIds.has(id));
  }
  return Object.keys(patch).length ? patch : null;
}
