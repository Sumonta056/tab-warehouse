export function openTab(props) {
  return chrome.tabs.create(props);
}

export function updateTab(props, tabId) {
  return tabId == null ? chrome.tabs.update(props) : chrome.tabs.update(tabId, props);
}

export async function currentTabId() {
  return (await chrome.tabs.getCurrent?.())?.id;
}

export async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export function listTabs() {
  return chrome.tabs.query({});
}

export function onTabsChanged(fn) {
  chrome.tabs.onCreated.addListener(fn);
  chrome.tabs.onRemoved.addListener(fn);
  chrome.tabs.onUpdated.addListener((id, info) => {
    if (info.url) fn();
  });
}
