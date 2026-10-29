import { detectEnv } from './env.js';
import { allParts } from './tree.js';

export function matchLink(bm, note, q) {
  if (!q) return true;
  const hay = `${bm.title} ${bm.url} ${note || ''}`.toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export function crumbText(names) {
  return names.length > 3 ? `${names[0]} › … › ${names.slice(-2).join(' › ')}` : names.join(' › ');
}

export function searchLinks(secs, query, meta = {}, rules = []) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const s of secs) {
    const byId = new Map(allParts(s).map((pt) => [pt.id, pt]));
    for (const bm of s.all) {
      const part = byId.get(bm.parentId);
      const names = part ? [s.title, ...part.path] : [s.title];
      const hay = `${bm.title} ${bm.url} ${names.join(' › ')} ${meta[bm.id]?.note || ''} ${detectEnv(bm, rules)}`.toLowerCase();
      if (terms.every((t) => hay.includes(t))) hits.push({ bm, s, crumb: crumbText(names) });
    }
  }
  return hits;
}

export function matchTitleUrl(bm, q) {
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => `${bm.title} ${bm.url}`.toLowerCase().includes(t));
}
