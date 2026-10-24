import { themeVars } from '../domain/theme.js';

export function applyTheme(theme, el = document.documentElement) {
  for (const [k, v] of Object.entries(themeVars(theme))) el.style.setProperty(k, v);
}
