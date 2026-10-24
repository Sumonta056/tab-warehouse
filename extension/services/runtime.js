export function onMessage(fn) {
  chrome.runtime.onMessage?.addListener(fn);
}
