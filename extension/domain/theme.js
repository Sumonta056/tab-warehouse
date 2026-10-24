import { THEMES } from '../constants/themes.js';

export function themeVars(theme) {
  let t = THEMES[theme];
  if (!t && /^#[0-9a-f]{6}$/i.test(theme || '')) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.slice(i, i + 2), 16));
    const light = 0.299 * r + 0.587 * g + 0.114 * b > 140;
    t = [theme, `color-mix(in srgb, ${theme} 24%, #1b1b1b)`, `color-mix(in srgb, ${theme} 40%, #fff)`, light ? '#111' : '#fff'];
  }
  t ||= THEMES.blue;
  return { '--accent': t[0], '--accent-bg': t[1], '--accent-text': t[2], '--accent-ink': t[3] };
}

export function sideLookVars(look, image) {
  const img = look.mode === 'image' && !!image;
  return {
    '--side-color': look.color,
    '--side-dark': img ? String(look.dark / 100) : '1',
    '--side-blur': `${img ? look.blur : 0}px`,
    '--side-img': img ? `url("${image}")` : 'none',
  };
}
