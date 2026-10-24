import { ENVS } from '../constants/envs.js';
import { detectEnv } from './env.js';
import { displayUrl, hostOf, pathKey } from './url.js';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function sortLinks(links, sort, rules, tags = ENVS) {
  const cmp = collator.compare;
  const by = (key, compare) =>
    links
      .map((bm) => [key(bm), bm])
      .sort((a, b) => compare(a[0], b[0]))
      .map((x) => x[1]);
  switch (sort) {
    case 'name':
      return by((bm) => bm.title || displayUrl(bm.url), cmp);
    case 'url':
      return by((bm) => displayUrl(bm.url), cmp);
    case 'host':
      return by(
        (bm) => [hostOf(bm.url), pathKey(bm.url)],
        (a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]),
      );
    case 'added':
      return [...links].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    case 'env':
      return by(
        (bm) => {
          const i = tags.indexOf(detectEnv(bm, rules));
          return [i < 0 ? tags.length : i, pathKey(bm.url)];
        },
        (a, b) => a[0] - b[0] || cmp(a[1], b[1]),
      );
    default:
      return [...links].sort((a, b) => (a.index || 0) - (b.index || 0));
  }
}
