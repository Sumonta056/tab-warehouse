import { GOOGLE_APPS, GOOGLE_DOCS, GSTATIC, WEB_ICON } from '../constants/urls.js';
import { hostOf } from './url.js';

export function googleIcon(url) {
  const host = hostOf(url);
  let app = GOOGLE_APPS[host];
  if (!app && host === 'docs.google.com') {
    try {
      app = GOOGLE_DOCS[new URL(url).pathname.split('/')[1]] || 'docs';
    } catch {
      app = 'docs';
    }
  }
  return app ? `${GSTATIC}${app}_2020q4_48dp.png` : null;
}

export function webIconUrls(pageUrl) {
  try {
    const u = new URL(pageUrl);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /^[\d.]+$/.test(u.hostname)) return [];
    return [...new Set([u.hostname, u.hostname.replace(/^www\./, '')])].map((d) => `${WEB_ICON}?domain=${encodeURIComponent(d)}&sz=64`);
  } catch {
    return [];
  }
}

export function letterIcon(bm) {
  const host = hostOf(bm.url);
  if (host.includes('github')) return 'gh';
  if (host.startsWith('localhost') || host.startsWith('127.')) return ':' + (host.split(':')[1] || 'l').slice(0, 2);
  if (host.includes('aws')) return 'aws';
  if (host.includes('argo')) return 'A';
  return (bm.title || host || '?').trim().slice(0, 2);
}
