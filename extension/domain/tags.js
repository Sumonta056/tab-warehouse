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

export function renameTag(rules, map, old, name) {
  return {
    rules: rules.map((r) => (r.env === old ? { ...r, env: name } : r)),
    map: map.map((r) => {
      if (!(old in r)) return r;
      const { [old]: host, ...rest } = r;
      return { ...rest, [name]: host };
    }),
  };
}

export function removeTag(rules, map, name) {
  return {
    rules: rules.filter((r) => r.env !== name),
    map: map
      .map((r) => {
        const { [name]: _, ...rest } = r;
        return rest;
      })
      .filter((r) => Object.values(r).some(Boolean)),
  };
}

export function firstFreeColor(tags, colors) {
  return colors.find((col) => !tags.some((t) => t.color === col)) || colors[0];
}

export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return null;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function dropIndex(from, target, after) {
  const to = target + (after ? 1 : 0);
  return from < to ? to - 1 : to;
}
