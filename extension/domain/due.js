import { DUE_SOON_DAYS, MONTHS, WEEKDAYS } from '../constants/due.js';

const pad2 = (n) => String(n).padStart(2, '0');

export function parseDue(due) {
  const m = typeof due === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(due);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const day = new Date(y, mo - 1, d);
  if (day.getFullYear() !== y || day.getMonth() !== mo - 1 || day.getDate() !== d) return null;
  if (m[4] === undefined) return { day, at: null };
  const [hh, mm] = [+m[4], +m[5]];
  if (hh > 23 || mm > 59) return null;
  return { day, at: new Date(y, mo - 1, d, hh, mm) };
}

export function isDue(due) {
  return !!parseDue(due);
}

const daysBetween = (a, b) => Math.round((b - a) / 864e5);

const startOfDay = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate());

export function dueState(due, now = new Date()) {
  const p = parseDue(due);
  if (!p) return null;
  const today = startOfDay(now);
  if (p.at ? p.at < now : p.day < today) return 'overdue';
  if (+p.day === +today) return 'today';
  return daysBetween(today, p.day) <= DUE_SOON_DAYS ? 'soon' : 'later';
}

export function dueLabel(due, now = new Date()) {
  const p = parseDue(due);
  if (!p) return '';
  const time = p.at ? `${pad2(p.at.getHours())}:${pad2(p.at.getMinutes())}` : '';
  const withTime = (s) => (time ? `${s} ${time}` : s);
  const date = `${p.day.getDate()} ${MONTHS[p.day.getMonth()]}`;
  const state = dueState(due, now);
  if (state === 'overdue') {
    const late = daysBetween(p.day, startOfDay(now));
    if (!late) return `Overdue · today ${time}`;
    return `${withTime(`Overdue · ${date}`)} (${late} ${late === 1 ? 'day' : 'days'})`;
  }
  if (state === 'today') return time ? `Today ${time}` : 'Due today';
  if (state === 'soon') return withTime(`Due ${WEEKDAYS[p.day.getDay()]} ${date}`);
  return withTime(`Due ${date} ${p.day.getFullYear()}`);
}

export function gcalUrl({ title, url, note, due }) {
  const p = parseDue(due);
  if (!p) return '';
  const ymd = (t) => `${t.getFullYear()}${pad2(t.getMonth() + 1)}${pad2(t.getDate())}`;
  const stamp = (t) => `${ymd(t)}T${pad2(t.getHours())}${pad2(t.getMinutes())}00`;
  let dates;
  if (p.at) {
    dates = `${stamp(p.at)}/${stamp(new Date(p.at.getTime() + 30 * 60000))}`;
  } else {
    const next = new Date(p.day);
    next.setDate(next.getDate() + 1);
    dates = `${ymd(p.day)}/${ymd(next)}`;
  }
  const details = [note, url].filter(Boolean).join('\n\n');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title || url, dates, details });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function dueQuickDate(days, now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}
