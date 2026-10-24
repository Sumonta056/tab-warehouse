import { PALETTE_MSG } from '../constants/commands.js';
import { searchLinks } from './search.js';

export function isPaletteRequest(msg, tabId) {
  return msg?.type === PALETTE_MSG && tabId != null && msg.tabId === tabId;
}

export async function paletteCommand(tabId, send) {
  if (tabId == null) return 'none';
  const ok = await Promise.resolve()
    .then(() => send({ type: PALETTE_MSG, tabId }))
    .catch(() => false);
  return ok === true ? 'palette' : 'none';
}

export function paletteResults(q, secs, places, linkMeta, rules, max) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const ok = (s) => terms.every((t) => s.toLowerCase().includes(t));
  return {
    links: q ? searchLinks(secs, q, linkMeta, rules).slice(0, max) : [],
    folders: secs.filter((s) => ok(s.title)),
    places: places.filter((a) => ok(a.title)),
  };
}
