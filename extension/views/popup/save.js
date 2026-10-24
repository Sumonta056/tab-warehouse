import { gcalUrl } from '../../domain/due.js';
import { createBookmark } from '../../services/bookmarks.js';
import { saveSettings, setLinkMeta } from '../../services/storage.js';
import { openTab } from '../../services/tabs.js';
import { popup, target } from '../../state/popup-state.js';
import { updateSaveBtn } from './folders.js';
import { status } from './page.js';

export async function save() {
  const x = popup.items[popup.cursor];
  const url = target();
  if (popup.busy || !x || !url) return;
  popup.busy = true;
  updateSaveBtn();
  const { titleEl, noteEl, dueEl, pri, tab } = popup;
  try {
    const parentId = x.create ? (await createBookmark({ parentId: popup.root.id, title: x.create })).id : x.f.id;
    const bm = await createBookmark({ parentId, title: titleEl.value.trim() || url, url });
    const due = dueEl.value();
    if (pri || noteEl.value.trim() || due) await setLinkMeta(bm.id, { pri, note: noteEl.value, due });
    await saveSettings({ lastSaveFolder: parentId });
    status(`Saved to ${x.create || x.f.title}`);
    if (dueEl.calendar()) await openTab({ url: gcalUrl({ title: bm.title, url, note: noteEl.value.trim(), due }), index: tab.index + 1 });
    setTimeout(() => window.close(), 900);
  } catch (e) {
    popup.busy = false;
    updateSaveBtn();
    status(`Could not save: ${e.message}`, true);
  }
}
