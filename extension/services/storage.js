import { cleanMeta } from '../domain/meta.js';
import { withDefaults } from '../domain/settings.js';

export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return withDefaults(settings);
}

export async function saveSettings(patch) {
  const cur = await loadSettings();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function loadLinkMeta() {
  const { linkMeta } = await chrome.storage.local.get('linkMeta');
  return linkMeta || {};
}

export async function setLinkMeta(id, m) {
  const all = await loadLinkMeta();
  const clean = cleanMeta(m);
  if (clean) all[id] = clean;
  else delete all[id];
  await chrome.storage.local.set({ linkMeta: all });
  return all;
}
