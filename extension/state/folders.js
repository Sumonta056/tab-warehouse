import { saveSettings } from '../services/storage.js';
import { sections } from '../domain/tree.js';
import { folderPrefs as prefsOf, catOf, orderMove, orderIntoCategory, withCategory } from '../domain/folders.js';
import { state, setState } from './page-state.js';

export function folderPrefs(id) {
  return prefsOf(state.settings.folders, id);
}

export async function saveFolderPrefs(id, patch) {
  state.settings.folders[id] = { ...folderPrefs(id), ...patch };
  await saveSettings({ folders: state.settings.folders });
}

export async function saveOrder(ids) {
  state.settings.order = ids;
  await saveSettings({ order: ids });
  setState({ secs: sections(state.root, ids, [state.settings.home.folderId]) });
}

export async function moveFolder(id, targetId, after) {
  const { settings } = state;
  const ids = orderMove(state.secs, id, targetId, after);
  if (catOf(settings, id) !== catOf(settings, targetId)) {
    const folderCat = withCategory(settings.folderCat, id, catOf(settings, targetId));
    settings.folderCat = folderCat;
    await saveSettings({ folderCat });
  }
  await saveOrder(ids);
}

export async function moveToCategory(s, target) {
  const { settings } = state;
  const folderCat = withCategory(settings.folderCat, s.id, target);
  settings.folderCat = folderCat;
  const ids = orderIntoCategory(settings, state.secs, s.id, target);
  await saveSettings({ folderCat });
  await saveOrder(ids);
}

export async function saveCats(patch) {
  Object.assign(state.settings, patch);
  await saveSettings(patch);
}

export function queueSave(patch) {
  state.saveQueue = state.saveQueue.then(async () => {
    setState({ settings: await saveSettings(patch) });
  });
  return state.saveQueue;
}
