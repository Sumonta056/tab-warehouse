import { ICON_MAX } from '../constants/limits.js';
import { MARK_COLORS } from '../constants/themes.js';

export function cleanMark(v) {
  if (MARK_COLORS.includes(v)) return v;
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
}

export function markAttrs(color, dataset = null) {
  const c = cleanMark(color);
  if (!c) return { dataset };
  const custom = c.startsWith('#');
  return { dataset: { ...dataset, color: custom ? 'custom' : c }, style: custom ? { '--c': c } : null };
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function cleanIcon(v) {
  if (typeof v !== 'string') return null;
  const first = segmenter.segment(v.trim())[Symbol.iterator]().next().value?.segment;
  return first && first.length <= ICON_MAX && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(first) ? first : null;
}

export function withMark(map, id, value, clean = cleanMark) {
  const out = { ...map };
  const c = clean(value);
  if (c) out[id] = c;
  else delete out[id];
  return out;
}

export function markOf(color, icon) {
  const c = cleanMark(color);
  const i = cleanIcon(icon);
  return { ...(c ? { color: c } : {}), ...(i ? { icon: i } : {}) };
}

const MARK_MAPS = ['folderColors', 'folderIcons', 'partColors', 'partIcons'];

export function staleMarks(settings, folderIds) {
  const patch = {};
  for (const key of MARK_MAPS) {
    const map = settings[key] || {};
    if (Object.keys(map).some((id) => !folderIds.has(id))) patch[key] = Object.fromEntries(Object.entries(map).filter(([id]) => folderIds.has(id)));
  }
  return Object.keys(patch).length ? patch : null;
}
