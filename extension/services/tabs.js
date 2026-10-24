export function openTab(props) {
  return chrome.tabs.create(props);
}

export function updateTab(props) {
  return chrome.tabs.update(props);
}

export async function currentTabId() {
  return (await chrome.tabs.getCurrent?.())?.id;
}
