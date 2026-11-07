import { loadSettings, loadLinkMeta } from './services/storage.js';
import { getTree, createBookmark, onBookmarksChanged } from './services/bookmarks.js';
import { activeTab, activeTabs, getTab, onTabActivated, onTabLoaded, openTab, updateTab } from './services/tabs.js';
import { extensionUrl, sendMessage } from './services/runtime.js';
import { onCommand } from './services/commands.js';
import { setDefaultSuggestion, onOmniboxInput, onOmniboxEnter } from './services/omnibox.js';
import { setBadge, clearBadge, openPopup, openPopupWith } from './services/action.js';
import { resolveRoot, sections } from './domain/tree.js';
import { omniboxSuggestions, omniboxTarget } from './domain/omnibox.js';
import { quickSave, quickSaveBadge } from './domain/quick-save.js';
import { paletteCommand } from './domain/palette.js';
import { savedMark, savedMarkBadge } from './domain/saved-mark.js';
import { folderChoices } from './domain/popup.js';
import { QUICK_BADGE_MS, SAVED_MARK_MS } from './constants/limits.js';
import { PALETTE_POPUP, SAVE_POPUP } from './constants/commands.js';

setDefaultSuggestion('Search Tab Warehouse for <match>%s</match>');

onOmniboxInput(async (text, suggest) => {
  const [settings, tree, meta] = await Promise.all([loadSettings(), getTree(), loadLinkMeta()]);
  const secs = sections(resolveRoot(tree, settings), settings.order, [settings.home.folderId]);
  suggest(omniboxSuggestions(secs, text, meta, settings.envRules));
});

onOmniboxEnter((text, disposition) => {
  const url = omniboxTarget(text, extensionUrl('newtab.html'));
  if (disposition === 'currentTab') updateTab({ url });
  else openTab({ url, active: disposition === 'newForegroundTab' });
});

const badgeTimers = new Map();

async function updateSavedMark(tab, onlySet = false) {
  if (tab?.id == null || badgeTimers.has(tab.id)) return;
  const [settings, tree] = await Promise.all([loadSettings(), getTree()]);
  const folders = folderChoices(resolveRoot(tree, settings));
  const badge = savedMarkBadge(savedMark(tree, tab.url, folders));
  if (badgeTimers.has(tab.id)) return;
  if (badge) setBadge(tab.id, badge);
  else if (!onlySet) clearBadge(tab.id);
}

function flashBadge(tabId, badge) {
  setBadge(tabId, badge);
  clearTimeout(badgeTimers.get(tabId));
  badgeTimers.set(
    tabId,
    setTimeout(async () => {
      badgeTimers.delete(tabId);
      try {
        await updateSavedMark(await getTab(tabId));
      } catch {
        clearBadge(tabId);
      }
    }, QUICK_BADGE_MS),
  );
}

onTabActivated(async (tabId) => {
  try {
    await updateSavedMark(await getTab(tabId));
  } catch {}
});

onTabLoaded((tab) => updateSavedMark(tab).catch(() => {}));

let markTimer;
onBookmarksChanged(() => {
  clearTimeout(markTimer);
  markTimer = setTimeout(async () => {
    try {
      for (const tab of await activeTabs()) await updateSavedMark(tab);
    } catch {}
  }, SAVED_MARK_MS);
});

activeTabs()
  .then((tabs) => Promise.all(tabs.map((tab) => updateSavedMark(tab, true))))
  .catch(() => {});

async function quickSaveTab() {
  const tab = await activeTab();
  const [settings, tree] = await Promise.all([loadSettings(), getTree()]);
  let r = quickSave(settings, tree, tab);
  if (r.kind === 'dup') {
    try {
      await openPopup();
      return;
    } catch {}
  }
  if (r.kind === 'save') {
    try {
      await createBookmark({ parentId: r.parentId, title: r.title, url: r.url });
    } catch (e) {
      r = { kind: 'error', message: e.message };
    }
  }
  flashBadge(tab?.id, quickSaveBadge(r));
}

async function paletteTab(tab) {
  const id = tab?.id ?? (await activeTab())?.id;
  const r = await paletteCommand(id, (msg) => sendMessage(msg));
  if (r !== 'palette') return r;
  await openPopupWith(id, PALETTE_POPUP, SAVE_POPUP).catch(() => {});
  return r;
}

onCommand((command, tab) => {
  if (command === 'quick-save') return quickSaveTab();
  if (command === 'palette') return paletteTab(tab);
});
