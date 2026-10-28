import { PALETTE_MSG, PALETTE_GO_MSG } from '../constants/commands.js';
import { findView } from './folders.js';
import { searchLinks } from './search.js';

const forTab = (msg, type, tabId) => msg?.type === type && tabId != null && msg.tabId === tabId;

export function isPaletteRequest(msg, tabId) {
  return forTab(msg, PALETTE_MSG, tabId);
}

export function isPaletteGo(msg, tabId) {
  return forTab(msg, PALETTE_GO_MSG, tabId);
}

export function paletteGoMsg(tabId, target) {
  return { type: PALETTE_GO_MSG, tabId, ...target };
}

export function paletteGoTarget(msg, pages, secs) {
  if (msg.settings) return { settings: msg.settings };
  return findView(msg.view, pages, secs);
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
