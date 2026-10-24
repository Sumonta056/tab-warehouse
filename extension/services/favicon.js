import { googleIcon, webIconUrls } from '../domain/icons.js';

export function faviconUrl(pageUrl, size = 32) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', String(size));
  return u.toString();
}

export function tileIconSrcs(bm, iconMap) {
  let root = null;
  try {
    root = faviconUrl(new URL('/', bm.url).href, 64);
  } catch {}
  return [...new Set([iconMap[bm.id] || googleIcon(bm.url), faviconUrl(bm.url, 64), root, ...webIconUrls(bm.url)].filter(Boolean))];
}
