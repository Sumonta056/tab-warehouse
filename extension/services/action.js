const quiet = (p) => p?.catch?.(() => {});
let queue = Promise.resolve();

function inQueue(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
}

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
  return inQueue(() => chrome.action.openPopup());
}

export function openPopupWith(tabId, popup, back) {
  const at = tabId == null ? {} : { tabId };
  return inQueue(async () => {
    await chrome.action.setPopup({ ...at, popup });
    try {
      return await chrome.action.openPopup();
    } finally {
      await quiet(chrome.action.setPopup({ ...at, popup: back }));
    }
  });
}
