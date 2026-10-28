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
