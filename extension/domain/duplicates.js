import { TRACKING } from '../constants/urls.js';

export function dupKey(url, loose = false) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (loose) {
    const params = new URLSearchParams(u.search);
    [...params.keys()].filter((k) => TRACKING.test(k)).forEach((k) => params.delete(k));
    u.search = params.toString();
    u.hash = '';
  }
  return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}${u.search}${u.hash}`;
}

export function findDuplicates(links, loose = false) {
  const byKey = new Map();
  for (const bm of links) {
    const k = dupKey(bm.url, loose);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(bm);
  }
  return [...byKey].filter(([, list]) => list.length > 1).map(([key, list]) => ({ key, links: list.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0)) }));
}

export function findSaved(tree, url) {
  const key = dupKey(url, true);
  const out = [];
  const walk = (n, path) => {
    for (const c of n.children || []) {
      if (c.url) {
        if (dupKey(c.url, true) === key) out.push({ ...c, path: path.join(' › ') });
      } else walk(c, [...path, c.title || '(untitled)']);
    }
  };
  walk(tree, []);
  return out;
}
