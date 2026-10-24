export async function getCommands() {
  return (await chrome.commands?.getAll?.()) || [];
}

export function omniboxKeyword() {
  return chrome.runtime.getManifest?.()?.omnibox?.keyword;
}
