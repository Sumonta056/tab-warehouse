import { PRI_NAMES } from '../../constants/priority.js';
import { detectEnv } from '../../domain/env.js';
import { dueChip } from '../../domain/due.js';
import { isOpen } from '../../domain/open-tabs.js';
import { sameAsUrl, displayUrl } from '../../domain/url.js';
import { moveBookmark } from '../../services/bookmarks.js';
import { linkBadge, openBadge } from '../../ui/badges.js';
import { h, svgIcon, highlight } from '../../ui/dom.js';
import { clearMarks, markHalf } from '../../ui/dnd.js';
import { iconEl } from '../../ui/icons.js';
import { state } from '../../state/page-state.js';
import { deleteLink, setPri, tickLink } from './actions.js';
import { startEdit } from './edit.js';
import { linkMenu } from './menus.js';

export function renderRow(ctx, bm, s, p, { crumb = null, q = state.filterQ, check = false } = {}) {
  const { settings } = state;
  const env = detectEnv(bm, settings.envRules);
  const dup = sameAsUrl(bm.title, bm.url);
  const meta = state.linkMeta[bm.id];
  const chip = dueChip(meta);
  const done = chip?.state === 'done';
  const row = h('a', {
    class: `row ${p.show === 'url' ? 'url-mode' : ''} ${meta?.pri ? `pri-${meta.pri}` : ''} ${done ? 'done' : ''}`,
    href: bm.url,
    target: '_blank',
    rel: 'noopener',
    draggable: true,
    dataset: { id: bm.id },
  });
  if (meta?.pri)
    row.append(h('span', { class: 'pri-bar', title: `${PRI_NAMES[meta.pri]} priority` }, h('span', { class: 'sr' }, `${PRI_NAMES[meta.pri]} priority`)));
  if (check)
    row.append(
      h(
        'button',
        {
          class: 'chk',
          role: 'checkbox',
          'aria-checked': String(done),
          'aria-label': `Done: ${bm.title || displayUrl(bm.url)}`,
          title: done ? 'Mark as not done' : 'Mark as done',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            tickLink(ctx, bm.id, !done);
          },
        },
        h('span', { class: 'box' }, svgIcon('check')),
      ),
    );
  row.append(h('span', { class: 'grip', 'aria-hidden': 'true' }, svgIcon('grip')));
  row.append(iconEl(bm, settings.showFavicons));
  const ttl = h('span', { class: 'ttl' });
  const url = h('span', { class: 'url' });
  if (p.show === 'url') {
    highlight(url, displayUrl(bm.url), q);
    if (!dup) highlight(ttl, bm.title, q);
  } else {
    highlight(ttl, bm.title || displayUrl(bm.url), q);
    if (!dup || !bm.title) highlight(url, displayUrl(bm.url), q);
  }
  const txt = h('span', { class: 'txt' }, ttl, url);
  if (meta?.note) {
    const note = h('span');
    highlight(note, meta.note, q);
    txt.append(h('span', { class: 'note' }, svgIcon('note'), note));
  }
  if (crumb) txt.append(h('span', { class: 'crumb' }, crumb));
  row.append(txt);
  if (isOpen(state.openKeys, bm.url)) row.append(openBadge());
  const badge = linkBadge(env, bm.url, settings.customTags);
  if (badge) row.append(badge);
  if (chip)
    row.append(
      h('span', { class: 'due-col' }, h('span', { class: `due-chip ${chip.state}`, title: meta.due }, svgIcon(done ? 'check' : 'calendar'), chip.label)),
    );
  const act = (cls, label, title, icon, run) =>
    h(
      'button',
      {
        class: cls,
        'aria-label': label,
        title,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          run(e);
        },
      },
      svgIcon(icon),
    );
  row.append(
    h(
      'span',
      { class: 'acts' },
      act('act', 'Edit title and URL', 'Edit title / URL', 'pencil', () => startEdit(ctx, bm, row)),
      act('act del', 'Delete link', 'Delete', 'trash', () => deleteLink(bm)),
      act('act more', 'Link menu', 'More', 'more', (e) => linkMenu(ctx, e, bm, row)),
    ),
  );
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    linkMenu(ctx, e, bm, row);
  });
  row.addEventListener('dblclick', (e) => {
    e.preventDefault();
    startEdit(ctx, bm, row);
  });
  row.addEventListener('click', (e) => {
    if (e.target.closest('.grip')) e.preventDefault();
    else if (check && !done && !e.target.closest('button')) tickLink(ctx, bm.id, true);
  });
  bindRowDrag(ctx, row, bm, p);
  return row;
}

function bindRowDrag(ctx, row, bm, p) {
  row.addEventListener('dragstart', (e) => {
    if (state.editingId) {
      e.preventDefault();
      return;
    }
    state.drag = { kind: 'link', id: bm.id, parentId: bm.parentId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bm.url);
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    clearMarks();
    state.drag = null;
  });
  row.addEventListener('dragover', (e) => {
    const { drag } = state;
    if (!drag || drag.kind !== 'link' || drag.id === bm.id || p.sort !== 'manual') return;
    markHalf(row, e);
  });
  row.addEventListener('drop', async (e) => {
    const { drag } = state;
    if (!drag || drag.kind !== 'link' || drag.id === bm.id) return;
    e.preventDefault();
    e.stopPropagation();
    const after = row.classList.contains('drop-after');
    const id = drag.id;
    clearMarks();
    await moveBookmark(id, { parentId: bm.parentId, index: bm.index + (after ? 1 : 0) });
    const pri = state.linkMeta[bm.id]?.pri || null;
    if (row.closest('.list')?.dataset.pri === 'groups' && (state.linkMeta[id]?.pri || null) !== pri) await setPri(ctx, id, pri);
  });
}
