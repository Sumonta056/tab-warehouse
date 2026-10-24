import { COMMAND_LABELS } from '../constants/commands.js';

export function commandLabel(cmd) {
  return COMMAND_LABELS[cmd?.name] || cmd?.description || cmd?.name || '';
}

export function shortcutKeys(shortcut) {
  const s = (shortcut || '').trim();
  if (!s) return [];
  if (s.includes('+'))
    return s
      .split('+')
      .map((k) => k.trim())
      .filter(Boolean);
  const mods = s.match(/^[⌘⇧⌥⌃]*/)[0];
  const rest = s.slice(mods.length);
  return [...mods, ...(rest ? [rest] : [])];
}

export function isMac(platform) {
  return /mac/i.test(platform || '');
}
