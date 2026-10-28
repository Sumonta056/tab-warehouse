import { TODAY_CNT_MAX, TODAY_NAME, TODAY_STATES } from '../constants/due.js';
import { dueQuickDate, isDay, isDue } from './due.js';
import { cleanMeta } from './meta.js';
import { scheduleGroups } from './schedule.js';

export function dayKey(now = new Date()) {
  return dueQuickDate(0, now);
}

export function isDueToday(due, now = new Date()) {
  return isDue(due) && due.slice(0, 10) === dayKey(now);
}

export function todayList(secs, meta = {}, now = new Date()) {
  return scheduleGroups(secs, meta, now)
    .filter((g) => TODAY_STATES.includes(g.state))
    .flatMap((g) => g.items.map((x) => ({ ...x, state: g.state })));
}

export function todayCount(list) {
  const open = list.filter((x) => x.state !== 'done');
  return { n: open.length, overdue: open.some((x) => x.state === 'overdue') };
}

export function todayBadge({ n, overdue }) {
  const late = overdue ? ', some overdue' : '';
  return {
    text: n > TODAY_CNT_MAX ? `${TODAY_CNT_MAX}+` : n ? String(n) : '',
    label: n ? `${TODAY_NAME}, ${n} open${late}` : TODAY_NAME,
    title: n ? `${TODAY_NAME} · ${n} open${late} · links due today and later` : `${TODAY_NAME} · links due today and later`,
  };
}

export function upNext(list, skip = 0) {
  const open = list.filter((x) => x.state !== 'done');
  if (!open.length) return null;
  const at = skip % open.length;
  return { ...open[at], k: list.length - open.length + at + 1, m: list.length, open: open.length };
}

export function sweepDone(secs, meta = {}, now = new Date()) {
  const today = dayKey(now);
  return secs.flatMap((s) => s.all).filter((bm) => isDay(meta[bm.id]?.done) && meta[bm.id].done < today);
}

export function undoneMeta(m) {
  return cleanMeta({ note: m?.note, pri: m?.pri });
}

export function sweptText(n) {
  return n === 1 ? 'Deleted 1 done link' : `Deleted ${n} done links`;
}
