import { dupKey } from './duplicates.js';

export function openKeys(tabs) {
  return new Set(tabs.filter((t) => t.url).map((t) => dupKey(t.url, true)));
}

export function isOpen(keys, url) {
  return !!url && keys.has(dupKey(url, true));
}
