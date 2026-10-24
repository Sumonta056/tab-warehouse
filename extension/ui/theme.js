import { themeVars, sideLookVars } from '../domain/theme.js';
import { clampFont } from '../domain/sizes.js';

export function applyTheme(theme, el = document.documentElement) {
  for (const [k, v] of Object.entries(themeVars(theme))) el.style.setProperty(k, v);
}

export function applySideLook(look, bgUrl) {
  for (const [k, v] of Object.entries(sideLookVars(look, bgUrl))) document.documentElement.style.setProperty(k, v);
}

export function applyFontSize(s) {
  const root = document.documentElement.style;
  root.setProperty('--fs-side', String(clampFont(s.fontSide) / 100));
  root.setProperty('--fs-page', String(clampFont(s.fontPage) / 100));
  root.setProperty('--fs-board', String(clampFont(s.fontBoard) / 100));
}

export function applyHomeVars(el, o) {
  el.style.setProperty('--home-bg', o.color);
  el.style.setProperty('--img-op', String(o.imgOpacity / 100));
  el.style.setProperty('--dark', String(o.dark / 100));
  el.style.setProperty('--blur', `${o.blur}px`);
  el.style.setProperty('--clock', `${o.clockSize}px`);
  el.style.setProperty('--tile', `${o.tileSize}px`);
  el.style.setProperty('--per-row', String(o.perRow));
  el.style.setProperty('--tiles-gap', `${o.tilesGap}px`);
  el.classList.toggle('no-labels', !o.labels);
}
