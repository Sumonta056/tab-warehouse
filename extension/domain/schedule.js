import { DUE_GROUPS } from '../constants/due.js';
import { dueState, parseDue } from './due.js';
import { searchLinks } from './search.js';

export function scheduleGroups(secs, meta = {}, now = new Date()) {
  const dated = searchLinks(secs, '', meta)
    .map((hit) => ({ ...hit, p: parseDue(meta[hit.bm.id]?.due) }))
    .filter((x) => x.p)
    .sort((a, b) => +(a.p.at || a.p.day) - +(b.p.at || b.p.day) || !!a.p.at - !!b.p.at);
  return DUE_GROUPS.map(([state, name]) => ({
    state,
    name,
    items: dated.filter((x) => dueState(meta[x.bm.id].due, now) === state).map(({ bm, s, crumb }) => ({ bm, s, crumb })),
  })).filter((g) => g.items.length);
}
