import { loadSettings, getTree, resolveRoot, sections, loadLinkMeta, omniboxSuggestions, omniboxTarget } from './lib/core.js';

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
