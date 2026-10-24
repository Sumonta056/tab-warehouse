import { hostOf, normalizeUrl } from '../../domain/url.js';
import { createBookmark, moveBookmark } from '../../services/bookmarks.js';
import { h, svgIcon } from '../../ui/dom.js';
import { homeIconImg } from '../../ui/home-icon.js';
import { homeIconMap, removeHomeLink } from '../../state/home-assets.js';

let dragId = null;

export function homeLinksList(links, folder, ctx) {
  const list = h('div', { class: 'home-links', role: 'list' });
  const unmark = () => list.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
  const remove = (bm) => removeHomeLink(bm, (undo) => ctx.toast(`Removed “${bm.title || hostOf(bm.url)}”`, { label: 'Undo', run: undo }));
  for (const bm of links) {
    const name = bm.title || hostOf(bm.url);
    const mini = homeIconImg(bm, h('span', { class: 'mini' }), homeIconMap());
    const row = h(
      'div',
      { class: 'home-link', role: 'listitem', draggable: true, dataset: { id: bm.id }, title: bm.url },
      h('span', { class: 'grip', 'aria-hidden': 'true' }, svgIcon('grip')),
      mini,
      h('span', { class: 'nm' }, name),
      h('button', { class: 'x', 'aria-label': `Remove ${name}`, title: 'Remove', onClick: () => remove(bm) }, svgIcon('x')),
    );
    row.addEventListener('dragstart', (e) => {
      if (e.target !== row) return;
      dragId = bm.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', bm.url);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      dragId = null;
      row.classList.remove('dragging');
      unmark();
    });
    row.addEventListener('dragover', (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = row.getBoundingClientRect();
      unmark();
      row.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
    });
    row.addEventListener('drop', async (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      const after = row.classList.contains('drop-after');
      const id = dragId;
      dragId = null;
      await moveBookmark(id, { parentId: folder.id, index: bm.index + (after ? 1 : 0) });
    });
    list.append(row);
  }
  if (!links.length) list.append(h('p', { class: 'muted' }, 'No links yet. Add one below.'));

  const nameIn = h('input', { placeholder: 'Name', 'aria-label': 'New link name' });
  const urlIn = h('input', { placeholder: 'URL', 'aria-label': 'New link URL' });
  const form = h('form', { class: 'home-add', novalidate: true }, nameIn, urlIn, h('button', { class: 'btn primary sm', type: 'submit' }, 'Add link'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!folder) return;
    const url = normalizeUrl(urlIn.value);
    if (!url) {
      urlIn.focus();
      return;
    }
    const title = nameIn.value.trim() || hostOf(url).replace(/^www\./, '') || url;
    try {
      await createBookmark({ parentId: folder.id, title, url });
    } catch (err) {
      ctx.toast(`Couldn't add: ${err.message}`);
    }
  });
  return h('div', { class: 'home-links-box' }, list, form);
}
