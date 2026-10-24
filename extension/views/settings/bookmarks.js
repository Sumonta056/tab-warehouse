import { folderList } from '../../domain/tree.js';
import { h } from '../../ui/dom.js';
import { card, toggle } from './controls.js';

export function bookmarks(c) {
  const s = c.settings;
  const sel = h(
    'select',
    { id: 'rootSelect', 'aria-label': 'Root folder' },
    ...folderList(c.tree).map((f) => h('option', { value: f.id, selected: f.id === c.root.id }, `${'  '.repeat(f.depth)}${f.title}`)),
  );
  sel.addEventListener('change', async () => {
    await c.save({ rootId: sel.value });
    await c.refresh();
  });
  return h(
    'div',
    { class: 'set-grid one' },
    h(
      'div',
      { class: 'set-col' },
      card('Root folder', 'Its subfolders become the sidebar folders.', sel),
      card(
        'Display',
        null,
        toggle('Site favicons', s.showFavicons, (v) => c.save({ showFavicons: v })),
      ),
      card(
        'Sidebar order',
        'Order and categories are saved in this extension, not in Chrome.',
        h('button', { type: 'button', class: 'btn sm', id: 'resetOrder', onClick: () => c.resetOrder() }, 'Reset sidebar order'),
      ),
    ),
  );
}
