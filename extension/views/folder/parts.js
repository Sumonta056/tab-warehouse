import { cleanIcon, cleanMark, markAttrs } from '../../domain/marks.js';
import { partSiblings } from '../../domain/folders.js';
import { priFirst } from '../../domain/meta.js';
import { sortLinks } from '../../domain/sort.js';
import { tagNames } from '../../domain/tags.js';
import { allParts, findById } from '../../domain/tree.js';
import { isFiltering } from '../../domain/filter.js';
import { createBookmark, moveBookmark, removeBookmark, updateBookmark } from '../../services/bookmarks.js';
import { h, markIcon, svgIcon } from '../../ui/dom.js';
import { clearMarks, headerDrag, markInto, unmarkOnLeave } from '../../ui/dnd.js';
import { showMenu } from '../../ui/menu.js';
import { toast } from '../../ui/toast.js';
import { state } from '../../state/page-state.js';
import { saveMark } from '../../state/folders.js';
import { renderBody } from './body.js';
import { renderRow } from './row.js';

export function renderParts(ctx, body, s, p, match) {
  const { settings } = state;
  const list = h('div', { class: 'list' });
  const filtering = isFiltering(state.filterQ, state.priF);
  const drawRows = (links, depth) =>
    priFirst(sortLinks(links, p.sort, settings.envRules, tagNames(settings)), state.linkMeta).forEach((bm) => {
      const row = renderRow(ctx, bm, s, p);
      row.dataset.depth = String(depth);
      list.append(row);
    });
  const drawPart = (g) => {
    const count = g.all.filter(match).length;
    if (filtering && !count) return;
    const depth = Math.min(g.depth, 3);
    const closed = !!p.closed[g.id];
    list.append(partHeader(ctx, g, s, p, closed, count, depth));
    if (closed) return;
    drawRows(g.links.filter(match), depth);
    g.parts.forEach(drawPart);
  };
  s.parts.forEach(drawPart);
  const none = { id: `none:${s.id}`, title: 'No section', node: s.node, links: s.links, none: true };
  const links = s.links.filter(match);
  if (!filtering || links.length) {
    const closed = !!p.closed[none.id];
    list.append(partHeader(ctx, none, s, p, closed, links.length, 0));
    if (!closed) drawRows(links, 0);
  }
  body.append(list);
  if (p.sort !== 'manual')
    body.append(h('div', { class: 'subnote' }, 'Reordering by drag is only available in Manual sort. Dragging onto a section header still moves the link.'));
}

function partHeader(ctx, g, s, p, closed, count, depth) {
  const chev = svgIcon('chevron');
  chev.classList.add('chev');
  const color = !g.none && cleanMark(state.settings.partColors[g.id]);
  const el = h(
    'div',
    {
      class: `grp part ${closed ? 'closed' : ''} ${g.none ? 'NONE' : ''}`,
      ...markAttrs(color, { depth: String(depth) }),
      draggable: !g.none,
      title: g.none ? null : 'Drag to reorder sections',
    },
    h(
      'button',
      { class: 'part-toggle', 'aria-expanded': String(!closed), onClick: () => ctx.setFolderPrefs(s.id, { closed: { ...p.closed, [g.id]: !closed } }) },
      chev,
      color ? h('span', { class: 'dot' }) : null,
      g.none ? null : markIcon(state.settings.partIcons[g.id]),
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
    headerDrag(
      el,
      state,
      'part',
      g.id,
      (from, after) => moveBookmark(from, { parentId: g.node.parentId, index: g.node.index + (after ? 1 : 0) }),
      (fromId) => !findById(allParts(s).find((x) => x.id === fromId)?.node, g.id),
    );
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
  const sibs = partSiblings(s, g);
  const i = sibs.indexOf(g);
  const parentId = g.node.parentId;
  showMenu(e, [
    {
      swatches: true,
      value: state.settings.partColors[g.id] || null,
      pick: async (color) => {
        await saveMark('partColors', g.id, color);
        renderBody(ctx);
      },
    },
    {
      icons: true,
      value: state.settings.partIcons[g.id] || null,
      pick: async (icon) => {
        await saveMark('partIcons', g.id, icon, cleanIcon);
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
    { label: 'New section inside', icon: 'plus', run: () => newPart(g) },
    ...(i > 0 ? [{ label: 'Move up', run: () => moveBookmark(g.id, { parentId, index: sibs[i - 1].node.index }) }] : []),
    ...(i < sibs.length - 1 ? [{ label: 'Move down', run: () => moveBookmark(g.id, { parentId, index: sibs[i + 1].node.index + 1 }) }] : []),
    '-',
    {
      label: 'Delete section…',
      icon: 'x',
      danger: true,
      run: async () => {
        if (!confirm(deleteText(g, s))) return;
        for (const c of g.node.children || []) await moveBookmark(c.id, { parentId });
        await removeBookmark(g.id);
        toast(`Section "${g.title}" deleted`);
      },
    },
  ]);
}

function deleteText(g, s) {
  const n = g.links.length;
  const m = g.parts.length;
  const dest = g.depth === 0 ? 'No section' : allParts(s).find((x) => x.id === g.node.parentId)?.title;
  if (!m) return `Delete section "${g.title}"? Its ${n} ${n === 1 ? 'link moves' : 'links move'} to ${dest}.`;
  return `Delete section "${g.title}"? Its ${n} ${n === 1 ? 'link' : 'links'} and ${m} ${m === 1 ? 'section' : 'sections'} move to ${dest}.`;
}

export async function newPart(s) {
  const title = prompt('Section name')?.trim();
  if (!title) return;
  await createBookmark({ parentId: s.id, title });
}
