import { cleanMark, markAttrs, withMark } from '../../domain/marks.js';
import { priFirst } from '../../domain/meta.js';
import { sortLinks } from '../../domain/sort.js';
import { tagNames } from '../../domain/tags.js';
import { isFiltering } from '../../domain/filter.js';
import { createBookmark, moveBookmark, removeBookmark, updateBookmark } from '../../services/bookmarks.js';
import { saveSettings } from '../../services/storage.js';
import { h, svgIcon } from '../../ui/dom.js';
import { clearMarks, headerDrag, markInto, unmarkOnLeave } from '../../ui/dnd.js';
import { showMenu } from '../../ui/menu.js';
import { toast } from '../../ui/toast.js';
import { state } from '../../state/page-state.js';
import { renderBody } from './body.js';
import { renderRow } from './row.js';

export function renderParts(ctx, body, s, p, match) {
  const { settings } = state;
  const list = h('div', { class: 'list' });
  const groups = [...s.parts, { id: `none:${s.id}`, title: 'No section', node: s.node, links: s.links, none: true }];
  for (const g of groups) {
    const links = g.links.filter(match);
    if (isFiltering(state.filterQ, state.priF) && !links.length) continue;
    const closed = !!p.closed[g.id];
    list.append(partHeader(ctx, g, s, p, closed, links.length));
    if (!closed)
      priFirst(sortLinks(links, p.sort, settings.envRules, tagNames(settings)), state.linkMeta).forEach((bm) => list.append(renderRow(ctx, bm, s, p)));
  }
  body.append(list);
  if (p.sort !== 'manual')
    body.append(h('div', { class: 'subnote' }, 'Reordering by drag is only available in Manual sort. Dragging onto a section header still moves the link.'));
}

function partHeader(ctx, g, s, p, closed, count) {
  const chev = svgIcon('chevron');
  chev.classList.add('chev');
  const color = !g.none && cleanMark(state.settings.partColors[g.id]);
  const el = h(
    'div',
    {
      class: `grp part ${closed ? 'closed' : ''} ${g.none ? 'NONE' : ''}`,
      ...markAttrs(color),
      draggable: !g.none,
      title: g.none ? null : 'Drag to reorder sections',
    },
    h(
      'button',
      { class: 'part-toggle', 'aria-expanded': String(!closed), onClick: () => ctx.setFolderPrefs(s.id, { closed: { ...p.closed, [g.id]: !closed } }) },
      chev,
      color ? h('span', { class: 'dot' }) : null,
      g.title,
    ),
    h('span', { class: 'line' }),
    h('span', {}, String(count)),
    g.none
      ? h('span', { class: 'slot' })
      : h(
          'button',
          {
            class: 'more',
            'aria-label': `Section menu for ${g.title}`,
            title: 'More',
            onClick: (e) => {
              e.stopPropagation();
              partMenu(ctx, e, g, s);
            },
          },
          svgIcon('more'),
        ),
  );
  if (!g.none) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      partMenu(ctx, e, g, s);
    });
    headerDrag(el, state, 'part', g.id, (from, after) => moveBookmark(from, { parentId: s.id, index: g.node.index + (after ? 1 : 0) }));
  }
  el.addEventListener('dragover', (e) => {
    const { drag } = state;
    if (drag?.kind !== 'link' || drag.parentId === g.node.id) return;
    markInto(el, e);
  });
  unmarkOnLeave(el, 'drop-into');
  el.addEventListener('drop', async (e) => {
    if (state.drag?.kind !== 'link') return;
    e.preventDefault();
    clearMarks();
    await moveBookmark(state.drag.id, { parentId: g.node.id });
    toast(`Moved to ${g.title}`);
  });
  return el;
}

function partMenu(ctx, e, g, s) {
  const i = s.parts.indexOf(g);
  showMenu(e, [
    {
      swatches: true,
      value: state.settings.partColors[g.id] || null,
      pick: async (color) => {
        const partColors = withMark(state.settings.partColors, g.id, color);
        state.settings.partColors = partColors;
        await saveSettings({ partColors });
        renderBody(ctx);
      },
    },
    '-',
    {
      label: 'Rename section',
      icon: 'pencil',
      run: async () => {
        const title = prompt('Section name', g.title)?.trim();
        if (title && title !== g.title) await updateBookmark(g.id, { title });
      },
    },
    ...(i > 0 ? [{ label: 'Move up', run: () => moveBookmark(g.id, { parentId: s.id, index: s.parts[i - 1].node.index }) }] : []),
    ...(i < s.parts.length - 1 ? [{ label: 'Move down', run: () => moveBookmark(g.id, { parentId: s.id, index: s.parts[i + 1].node.index + 1 }) }] : []),
    '-',
    {
      label: 'Delete section…',
      icon: 'x',
      danger: true,
      run: async () => {
        if (!confirm(`Delete section "${g.title}"? Its ${g.links.length} ${g.links.length === 1 ? 'link moves' : 'links move'} to No section.`)) return;
        for (const c of g.node.children || []) await moveBookmark(c.id, { parentId: s.id });
        await removeBookmark(g.id);
        toast(`Section "${g.title}" deleted`);
      },
    },
  ]);
}

export async function newPart(s) {
  const title = prompt('Section name')?.trim();
  if (!title) return;
  await createBookmark({ parentId: s.id, title });
}
