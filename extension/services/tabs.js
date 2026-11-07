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

export async function activeTabs() {
  return chrome.tabs.query({ active: true });
}

export function getTab(id) {
  return chrome.tabs.get(id);
}

export function onTabActivated(fn) {
  chrome.tabs.onActivated.addListener((info) => fn(info.tabId));
}

export function onTabLoaded(fn) {
  chrome.tabs.onUpdated.addListener((id, info, tab) => {
    if (info.url || info.status === 'complete') fn(tab);
  });
}
