import { FONT_SCALE, SIDE_WIDTH } from '../constants/limits.js';

export function clampFont(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return FONT_SCALE.initial;
  return Math.round(Math.max(FONT_SCALE.min, Math.min(FONT_SCALE.max, n)));
}

export function clampSideWidth(w) {
  const n = Number(w);
  if (!Number.isFinite(n)) return SIDE_WIDTH.initial;
  return Math.round(Math.max(SIDE_WIDTH.min, Math.min(SIDE_WIDTH.max, n)));
}
