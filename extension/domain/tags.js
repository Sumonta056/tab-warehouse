import { ENVS, ENV_NAMES } from '../constants/envs.js';
import { TAG_COLORS, TAG_PLAIN_MAX, TAG_RESERVED } from '../constants/tags.js';

export function tagNameError(name, taken = []) {
  if (!/^[A-Z0-9]{1,8}$/.test(name)) return 'Use 1 to 8 capital letters or digits.';
  if (TAG_RESERVED.includes(name)) return `${name} is a built-in name.`;
  if (taken.includes(name)) return `There is already a tag ${name}.`;
  return '';
}

export function cleanTags(list) {
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const name = typeof t?.name === 'string' ? t.name.trim().toUpperCase() : '';
    const taken = out.map((x) => x.name);
    if (tagNameError(name, taken)) continue;
    out.push({
      name,
      plain: typeof t.plain === 'string' ? t.plain.trim().slice(0, TAG_PLAIN_MAX) : '',
      color: TAG_COLORS.includes(t.color) ? t.color : TAG_COLORS[0],
    });
  }
  return out;
}

export function tagNames(settings) {
  return [...ENVS, ...(settings?.customTags || []).map((t) => t.name)];
}

export function tagPlain(settings, name) {
  return ENV_NAMES[name] || (settings?.customTags || []).find((t) => t.name === name)?.plain || name;
}
