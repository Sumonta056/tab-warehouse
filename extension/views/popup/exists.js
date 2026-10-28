import { folderChoices } from '../../domain/popup.js';
import { resolveRoot } from '../../domain/tree.js';
import { findSaved } from '../../domain/duplicates.js';
import { withoutDone } from '../../domain/meta.js';
import { getTree, createBookmark, removeBookmark } from '../../services/bookmarks.js';
import { loadLinkMeta, setLinkMeta } from '../../services/storage.js';
import { h } from '../../ui/dom.js';
import { popup, target } from '../../state/popup-state.js';
import { renderFolders, updateSaveBtn } from './folders.js';

export async function loadFolders() {
  popup.root = resolveRoot(await getTree(), popup.settings);
  popup.folders = folderChoices(popup.root);
}

export async function renderExists() {
  const box = document.querySelector('#exists');
  const url = target();
  let hits = [];
  if (url) {
    try {
      hits = findSaved(await getTree(), url);
    } catch {
      hits = [];
    }
  }
  if (url !== target()) return;
  box.replaceChildren();
  popup.dup = hits.length > 0;
  updateSaveBtn();
  if (!popup.dup) return;
  box.append(
    h(
      'div',
      { class: 'dup-warn', role: 'note' },
      ...hits
        .slice(0, 3)
        .map((b) =>
          h(
            'div',
            { class: 'exists' },
            h(
              'span',
              { class: 'where' },
              h(
                'span',
                { class: 'path' },
                'Already saved in ',
                h('strong', {}, popup.folders.find((f) => f.id === b.parentId)?.path || b.path || 'another folder'),
              ),
              b.url !== url && h('span', { class: 'addr', title: b.url }, b.url),
            ),
            h('button', { class: 'btn sm', onClick: () => remove(b) }, 'Remove'),
          ),
        ),
    ),
  );
}

async function remove(b) {
  const had = (await loadLinkMeta())[b.id];
  const meta = withoutDone(had);
  await removeBookmark(b.id);
  if (had) await setLinkMeta(b.id, null);
  await refresh();
  toast('Bookmark removed', async () => {
    const back = await createBookmark({ parentId: b.parentId, index: b.index, title: b.title, url: b.url });
    if (meta) await setLinkMeta(back.id, meta);
    await refresh();
  });
}

async function refresh() {
  await loadFolders();
  renderFolders();
  await renderExists();
}

let toastTimer;
function toast(msg, undo) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = h(
    'div',
    { class: 'toast', role: 'status' },
    msg,
    undo &&
      h(
        'button',
        {
          onClick: async () => {
            el.remove();
            await undo();
          },
        },
        'Undo',
      ),
  );
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), 8000);
}
