import { PALETTE_MSG } from '../constants/commands.js';

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
