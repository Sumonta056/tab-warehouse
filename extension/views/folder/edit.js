import { NOTE_MAX } from '../../constants/limits.js';
import { displayUrl, withScheme } from '../../domain/url.js';
import { createBookmark, updateBookmark } from '../../services/bookmarks.js';
import { h } from '../../ui/dom.js';
import { priPicker, duePicker } from '../../ui/pickers.js';
import { toast } from '../../ui/toast.js';
import { state, setState } from '../../state/page-state.js';
import { replaceLinkMeta } from '../../state/links.js';
import { openCalendar } from './actions.js';
import { renderBody } from './body.js';

export function startEdit(ctx, bm, row, focus = null) {
  if (state.editingId) return;
  setState({ editingId: bm.id });
  const meta = state.linkMeta[bm.id] || {};
  let pri = meta.pri || null;
  const titleIn = h('input', { type: 'text', value: bm.title || '' });
  const urlIn = h('input', { type: 'url', class: 'url-in', value: bm.url || '' });
  const noteIn = h('textarea', { class: 'note-in', rows: '2', maxlength: String(NOTE_MAX), placeholder: 'Why you saved it, what to check…' });
  noteIn.value = meta.note || '';
  const dueIn = duePicker(meta.due);
  const cancel = () => {
    setState({ editingId: null });
    renderBody(ctx);
  };
  const form = h(
    'form',
    { class: 'edit', novalidate: true },
    h('label', {}, 'Title', titleIn),
    h('label', {}, 'URL', urlIn),
    h(
      'div',
      { class: 'edit-pri' },
      'Priority',
      priPicker(pri, (v) => (pri = v)),
    ),
    h('label', {}, 'Note', noteIn),
    h('div', { class: 'edit-due' }, 'Due date', dueIn.el),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'btn sm primary', type: 'submit' }, 'Save'),
      h('button', { class: 'btn sm', type: 'button', onClick: cancel }, 'Cancel'),
    ),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = withScheme(urlIn.value.trim());
    setState({ editingId: null });
    try {
      await updateBookmark(bm.id, { title: titleIn.value.trim(), url });
      await replaceLinkMeta(bm.id, { pri, note: noteIn.value, due: dueIn.value() });
      renderBody(ctx);
      toast('Saved');
      if (dueIn.calendar()) openCalendar({ title: titleIn.value.trim(), url }, state.linkMeta[bm.id]);
    } catch (err) {
      toast(`Couldn't save: ${err.message}`);
      renderBody(ctx);
    }
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancel();
  });
  form.addEventListener('click', (e) => e.stopPropagation());
  row.draggable = false;
  row.removeAttribute('href');
  row.querySelector('.txt').replaceWith(form);
  row.querySelector('.acts')?.remove();
  row.querySelector('.pri-bar')?.remove();
  if (focus === 'due') return dueIn.focus();
  const first = focus === 'note' ? noteIn : titleIn;
  first.focus();
  first.select();
}

export function addLink(s) {
  if (state.editingId) return;
  const body = document.querySelector('#body');
  if (!body) return;
  const titleIn = h('input', { type: 'text', placeholder: 'Title (optional)' });
  const urlIn = h('input', { type: 'url', class: 'url-in', placeholder: 'https://…' });
  const form = h(
    'form',
    { class: 'edit', novalidate: true, style: { padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px', marginBottom: '8px' } },
    h('label', {}, 'Title', titleIn),
    h('label', {}, 'URL', urlIn),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'btn sm primary', type: 'submit' }, 'Add'),
      h(
        'button',
        {
          class: 'btn sm',
          type: 'button',
          onClick: () => {
            setState({ editingId: null });
            form.remove();
          },
        },
        'Cancel',
      ),
    ),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = urlIn.value.trim();
    if (!raw) {
      urlIn.focus();
      return;
    }
    const url = withScheme(raw);
    setState({ editingId: null });
    await createBookmark({ parentId: s.node.id, title: titleIn.value.trim() || displayUrl(url), url });
    toast('Added');
  });
  setState({ editingId: 'new' });
  body.prepend(form);
  urlIn.focus();
}
