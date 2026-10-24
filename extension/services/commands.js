export async function getCommands() {
  return (await chrome.commands?.getAll?.()) || [];
}

export function omniboxKeyword() {
  return chrome.runtime.getManifest?.()?.omnibox?.keyword;
}

export function onCommand(fn) {
  chrome.commands.onCommand.addListener(fn);
}
