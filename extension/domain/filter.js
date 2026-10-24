import { dueState } from './due.js';
import { matchLink } from './search.js';

export function priMatch(meta, priF, now) {
  if (priF === 'all') return true;
  if (priF === 'note') return !!meta?.note;
  if (priF === 'due') return !!meta?.due;
  if (priF === 'overdue') return dueState(meta?.due, now) === 'overdue';
  return meta?.pri === priF;
}

export function linkMatcher(linkMeta, filterQ, priF, now) {
  return (bm) => matchLink(bm, linkMeta[bm.id]?.note, filterQ) && priMatch(linkMeta[bm.id], priF, now);
}

export function isFiltering(filterQ, priF) {
  return !!filterQ || priF !== 'all';
}

export function hasMeta(links, linkMeta) {
  return links.some((bm) => linkMeta[bm.id]);
}
