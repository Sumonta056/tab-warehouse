const quiet = (p) => p?.catch?.(() => {});

export function setBadge(tabId, { text, color, title }) {
  const at = tabId == null ? {} : { tabId };
  quiet(chrome.action.setBadgeBackgroundColor({ ...at, color }));
  quiet(chrome.action.setBadgeText({ ...at, text }));
  quiet(chrome.action.setTitle({ ...at, title }));
}

export function clearBadge(tabId) {
  const at = tabId == null ? {} : { tabId };
  quiet(chrome.action.setBadgeText({ ...at, text: '' }));
  quiet(chrome.action.setTitle({ ...at, title: chrome.runtime.getManifest().action.default_title }));
}

export function openPopup() {
  return chrome.action.openPopup();
}
