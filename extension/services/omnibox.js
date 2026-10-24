export function setDefaultSuggestion(description) {
  chrome.omnibox.setDefaultSuggestion({ description });
}

export function onOmniboxInput(fn) {
  chrome.omnibox.onInputChanged.addListener(fn);
}

export function onOmniboxEnter(fn) {
  chrome.omnibox.onInputEntered.addListener(fn);
}
