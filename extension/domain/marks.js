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

export function withMark(map, id, color) {
  const out = { ...map };
  const c = cleanMark(color);
  if (c) out[id] = c;
  else delete out[id];
  return out;
}
