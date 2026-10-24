import {
  loadSettings,
  getTree,
  resolveRoot,
  sections,
  loadLinkMeta,
  omniboxSuggestions,
  omniboxTarget,
  quickSave,
  quickSaveBadge,
  paletteCommand,
} from './lib/core.js';
import { QUICK_BADGE_MS } from './constants/limits.js';

chrome.omnibox.setDefaultSuggestion({ description: 'Search Tab Warehouse for <match>%s</match>' });

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const [settings, tree, meta] = await Promise.all([loadSettings(), getTree(), loadLinkMeta()]);
  const secs = sections(resolveRoot(tree, settings), settings.order, [settings.home.folderId]);
  suggest(omniboxSuggestions(secs, text, meta, settings.envRules));
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = omniboxTarget(text, chrome.runtime.getURL('newtab.html'));
  if (disposition === 'currentTab') chrome.tabs.update({ url });
  else chrome.tabs.create({ url, active: disposition === 'newForegroundTab' });
});

const badgeTimers = new Map();
const quiet = (p) => p?.catch?.(() => {});

function flashBadge(tabId, { text, color, title }) {
  const at = tabId == null ? {} : { tabId };
  quiet(chrome.action.setBadgeBackgroundColor({ ...at, color }));
  quiet(chrome.action.setBadgeText({ ...at, text }));
  quiet(chrome.action.setTitle({ ...at, title }));
  clearTimeout(badgeTimers.get(tabId));
  badgeTimers.set(
    tabId,
    setTimeout(() => {
      badgeTimers.delete(tabId);
      quiet(chrome.action.setBadgeText({ ...at, text: '' }));
      quiet(chrome.action.setTitle({ ...at, title: chrome.runtime.getManifest().action.default_title }));
    }, QUICK_BADGE_MS),
  );
}

async function quickSaveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [settings, tree] = await Promise.all([loadSettings(), getTree()]);
  let r = quickSave(settings, tree, tab);
  if (r.kind === 'dup') {
    try {
      await chrome.action.openPopup();
      return;
    } catch {}
  }
  if (r.kind === 'save') {
    try {
      await chrome.bookmarks.create({ parentId: r.parentId, title: r.title, url: r.url });
    } catch (e) {
      r = { kind: 'error', message: e.message };
    }
  }
  flashBadge(tab?.id, quickSaveBadge(r));
}

async function paletteTab(tab) {
  const id = tab?.id ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  return paletteCommand(id, (msg) => chrome.runtime.sendMessage(msg));
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'quick-save') return quickSaveTab();
  if (command === 'palette') return paletteTab(tab);
});
