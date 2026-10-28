import { NOTE_MAX } from '../constants/limits.js';
import { PRIS } from '../constants/priority.js';
import { isDay, isDue } from './due.js';

export function cleanMeta(m) {
  if (!m || typeof m !== 'object') return null;
  const out = {};
  const note = typeof m.note === 'string' ? m.note.trim().slice(0, NOTE_MAX) : '';
  if (note) out.note = note;
  if (PRIS.includes(m.pri)) out.pri = m.pri;
  if (isDue(m.due)) out.due = m.due;
  if (out.due && isDay(m.done)) out.done = m.done;
  return Object.keys(out).length ? out : null;
}

export function withoutDone(m) {
  return cleanMeta({ ...m, done: undefined });
}

export function priGroups(sorted, meta) {
  const groups = [...PRIS, null].map((pri) => ({ pri, links: [] }));
  for (const bm of sorted) {
    const i = PRIS.indexOf(meta[bm.id]?.pri);
    groups[i < 0 ? PRIS.length : i].links.push(bm);
  }
  return groups.filter((g) => g.links.length);
}

export function priFirst(sorted, meta) {
  return priGroups(sorted, meta).flatMap((g) => g.links);
}
