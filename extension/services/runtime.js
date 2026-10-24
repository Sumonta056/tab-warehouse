export function onMessage(fn) {
  chrome.runtime.onMessage?.addListener(fn);
}

export function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

export function extensionUrl(path) {
  return chrome.runtime.getURL(path);
}
