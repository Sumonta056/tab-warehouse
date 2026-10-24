import { ENVS } from '../constants/envs.js';
import { detectEnv } from './env.js';
import { pathKey } from './url.js';
import { deriveUrl } from './derive.js';

export function buildMatrix(links, rules, tags = ENVS) {
  const rows = new Map();
  const rest = [];
  for (const bm of links) {
    const env = detectEnv(bm, rules);
    const key = pathKey(bm.url);
    if (!tags.includes(env) || !key) {
      rest.push(bm);
      continue;
    }
    const base = key.split('?')[0];
    const row = rows.get(base) || { key: base, cells: Object.fromEntries(tags.map((t) => [t, []])) };
    row.cells[env].push(bm);
    rows.set(base, row);
  }
  return { rows: [...rows.values()].sort((a, b) => a.key.localeCompare(b.key)), rest };
}

export function matrixLinks(row, tags) {
  return tags.flatMap((env) => row.cells[env]);
}

export function matrixMissing(row, tags, hostMap) {
  const any = matrixLinks(row, tags)[0];
  return tags
    .filter((env) => !row.cells[env].length)
    .map((env) => ({ env, url: any && deriveUrl(any.url, env, hostMap, tags) }))
    .filter((x) => x.url);
}

export function queryLabel(url) {
  const key = pathKey(url);
  return key.includes('?') ? `open ?${key.split('?')[1]}` : 'open';
}
