import { detectEnv } from './env.js';

export function matchLink(bm, note, q) {
  if (!q) return true;
  const hay = `${bm.title} ${bm.url} ${note || ''}`.toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export function searchLinks(secs, query, meta = {}, rules = []) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const s of secs)
    for (const bm of s.all) {
      const part = s.parts.find((pt) => pt.id === bm.parentId);
      const crumb = part ? `${s.title} › ${part.title}` : s.title;
      const hay = `${bm.title} ${bm.url} ${crumb} ${meta[bm.id]?.note || ''} ${detectEnv(bm, rules)}`.toLowerCase();
      if (terms.every((t) => hay.includes(t))) hits.push({ bm, s, crumb });
    }
  return hits;
}

export function matchTitleUrl(bm, q) {
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => `${bm.title} ${bm.url}`.toLowerCase().includes(t));
}
