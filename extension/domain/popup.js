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
