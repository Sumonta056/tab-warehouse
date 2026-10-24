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
