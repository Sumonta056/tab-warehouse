import { SORTS } from '../../constants/sorts.js';
import { markAttrs } from '../../domain/marks.js';
import { updateBookmark } from '../../services/bookmarks.js';
import { h, markIcon, svgIcon } from '../../ui/dom.js';
import { seg } from '../../ui/seg.js';
import { state, setState } from '../../state/page-state.js';
import { folderPrefs } from '../../state/folders.js';
import { renderBody } from './body.js';
import { addLink } from './edit.js';
import { folderMenu } from './menus.js';

export function renderFolder(page, ctx) {
  const s = state.current;
  const p = folderPrefs(s.id);

  const title = h(
    'h2',
    {
      ...markAttrs(!s.virtual && state.settings.folderColors[s.id]),
      title: s.virtual ? '' : 'Double-click to rename',
      onDblclick: () => !s.virtual && renameFolder(ctx, s, title),
    },
    s.virtual ? null : markIcon(state.settings.folderIcons[s.id]),
    s.title,
  );
  page.append(
    h(
      'div',
      { class: 'head' },
      title,
      s.virtual
        ? null
        : h(
            'button',
            { class: 'btn ghost sm icon', 'aria-label': 'Rename folder', title: 'Rename folder', onClick: () => renameFolder(ctx, s, title) },
            svgIcon('pencil'),
          ),
      h('span', { class: 'cnt mono muted' }, `${s.all.length} link${s.all.length === 1 ? '' : 's'}`),
      h('button', { class: 'btn primary add', onClick: () => addLink(s) }, '+ Add link'),
      h(
        'button',
        {
          class: 'btn icon sm',
          style: { minHeight: '36px', minWidth: '36px', borderRadius: '8px' },
          'aria-label': 'Folder menu',
          onClick: (e) => folderMenu(ctx, e, s),
        },
        svgIcon('more'),
      ),
    ),
  );

  const sortSel = h(
    'select',
    { 'aria-label': 'Sort', onChange: (e) => ctx.setFolderPrefs(s.id, { sort: e.target.value }) },
    ...Object.entries(SORTS).map(([v, l]) => h('option', { value: v, selected: v === p.sort }, l)),
  );
  const fIn = h('input', { type: 'search', placeholder: 'Filter this folder…', value: state.filterQ, autocomplete: 'off' });
  let t;
  fIn.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      setState({ filterQ: fIn.value.trim().toLowerCase() });
      renderBody(ctx);
    }, 60);
  });
  fIn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fIn.value = '';
      setState({ filterQ: '' });
      renderBody(ctx);
    }
  });
  page.append(
    h(
      'div',
      { class: 'toolbar' },
      h('label', { class: 'search' }, h('span', { class: 'sr' }, 'Filter this folder'), svgIcon('search'), fIn),
      h('label', { class: 'sel' }, 'Sort', sortSel),
      seg(
        'View',
        [
          ['list', 'List'],
          ['matrix', 'Tag matrix'],
        ],
        p.view,
        (v) => ctx.setFolderPrefs(s.id, { view: v }),
      ),
      seg(
        'Show',
        [
          ['title', 'Title'],
          ['url', 'URL'],
        ],
        p.show,
        (v) => ctx.setFolderPrefs(s.id, { show: v }),
      ),
    ),
  );

  page.append(h('div', { id: 'body' }));
  renderBody(ctx);
}

export function renameFolder(ctx, s, h2) {
  const input = h('input', { type: 'text', value: s.title });
  h2.replaceChildren(input);
  input.focus();
  input.select();
  const commit = async () => {
    const t = input.value.trim();
    if (t && t !== s.title) await updateBookmark(s.id, { title: t });
    else ctx.renderPage();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      input.value = s.title;
      input.blur();
    }
  });
}
