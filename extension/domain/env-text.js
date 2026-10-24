import { ENVS } from '../constants/envs.js';
import { SITES_HEAD, TAG_COLORS, TAG_PLAIN_MAX } from '../constants/tags.js';
import { tagNameError } from './tags.js';

export function envText(rules, hostMap, customTags = []) {
  const cols = [...ENVS, ...customTags.map((t) => t.name)];
  return [
    ...(customTags.length ? ['# Tags: NAME color plain name', ...customTags.map((t) => `${t.name} ${t.color} ${t.plain}`.trim()), ''] : []),
    '# Tags by address: text-in-address TAG (first match wins)',
    ...rules.map((r) => `${r.pattern} ${r.env}`),
    '',
    `# Same site in each version: ${cols.join(' ')} (- for none)`,
    ...hostMap.map((r) => cols.map((e) => r[e] || '-').join(' ')),
  ].join('\n');
}

export function parseEnvText(text, known = []) {
  const lines = (text || '').split('\n').map((raw) => raw.trim());
  const tags = [];
  let cols = ENVS;
  let skipped = 0;
  const rest = [];
  for (const line of lines) {
    const head = line.match(SITES_HEAD);
    if (head) cols = head[1].split(/\s+/).filter(Boolean);
    const parts = line.split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0].startsWith('#')) continue;
    if (parts.length >= 2 && TAG_COLORS.includes(parts[1].toLowerCase())) {
      const [name, color, ...plain] = parts;
      const taken = tags.map((t) => t.name);
      if (known.includes(name)) continue;
      if (tagNameError(name, taken)) skipped++;
      else tags.push({ name, plain: plain.join(' ').slice(0, TAG_PLAIN_MAX), color: color.toLowerCase() });
      continue;
    }
    rest.push(parts);
  }
  const names = [...ENVS, ...known, ...tags.map((t) => t.name)];
  const rules = [],
    hostMap = [];
  for (const parts of rest) {
    const env = (parts[1] || '').toUpperCase();
    const row =
      parts.length === cols.length &&
      Object.fromEntries(cols.flatMap((e, i) => (names.includes(e) ? [[e, parts[i] === '-' ? '' : parts[i].toLowerCase()]] : [])));
    if (parts.length === 2 && names.includes(env)) rules.push({ pattern: parts[0].toLowerCase(), env });
    else if (row && Object.values(row).some(Boolean)) hostMap.push(row);
    else skipped++;
  }
  return { rules, hostMap, tags, skipped };
}
