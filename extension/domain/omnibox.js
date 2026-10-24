import { OMNI_MAX } from '../constants/limits.js';
import { detectEnv } from './env.js';
import { searchLinks } from './search.js';
import { displayUrl } from './url.js';

export function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

function xmlMatch(text, terms) {
  if (!terms.length) return xmlEscape(text);
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text
    .split(re)
    .map((part, i) => (i % 2 ? `<match>${xmlEscape(part)}</match>` : xmlEscape(part)))
    .join('');
}

export function omniboxSuggestions(secs, text, meta = {}, rules = [], max = OMNI_MAX) {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const inTitle = (bm) => terms.every((t) => (bm.title || '').toLowerCase().includes(t));
  return searchLinks(secs, text, meta, rules)
    .sort((a, b) => inTitle(b.bm) - inTitle(a.bm))
    .slice(0, max)
    .map(({ bm, crumb }) => {
      const label = [detectEnv(bm, rules), crumb].filter(Boolean).join(' · ');
      return {
        content: bm.url,
        description: `${xmlMatch(bm.title || displayUrl(bm.url), terms)} <dim>${xmlEscape(label)}</dim> <url>${xmlMatch(displayUrl(bm.url), terms)}</url>`,
      };
    });
}

export function omniboxTarget(text, newtabUrl) {
  const t = text.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `${newtabUrl}?q=${encodeURIComponent(t)}`;
}
