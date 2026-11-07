import { visibleFolders, folderArrow, folderAncestors, saveLabel } from '../../domain/popup.js';
import { h, svgIcon } from '../../ui/dom.js';
import { popup, target } from '../../state/popup-state.js';
import { save } from './save.js';

const list = () => document.querySelector('#folders');

export function openTo(id) {
  for (const a of folderAncestors(popup.folders, id)) popup.open.add(a);
}

export function renderFolders() {
  const { folders, query } = popup;
  popup.items = visibleFolders(folders, popup.open, query);
  const cursor = Math.max(
    0,
    popup.items.findIndex((x) => x.key === popup.selId),
  );
  const box = list();
  box.replaceChildren();
  popup.items.forEach((x, i) => {
    const el = x.create
      ? createRow(x, folders)
      : x.tree
        ? treeRow(x)
        : h('div', { class: 'folder', role: 'option', title: x.f.path }, rowText(x.f.path, x.f.count));
    el.addEventListener('click', (e) => {
      if (e.target.closest('.fold')) return;
      setCursor(i);
      document.querySelector('#q').focus();
    });
    el.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.fold')) save();
    });
    box.append(el);
  });
  setCursor(cursor);
}

function rowText(text, count) {
  return [h('span', { class: 't' }, text), h('span', { class: 'n' }, String(count))];
}

function createRow(x, folders) {
  return h(
    'div',
    { class: 'folder create', role: 'option' },
    svgIcon('plus'),
    h('span', { class: 't' }, `Create "${x.create}"`),
    h('span', { class: 'n' }, `in ${folders[0].title}`),
  );
}

function treeRow(x) {
  const { f } = x;
  const fold =
    x.kids && f.depth > 0
      ? h(
          'button',
          {
            type: 'button',
            class: 'fold',
            tabindex: '-1',
            'aria-label': `${x.open ? 'Collapse' : 'Expand'} ${f.title}`,
            'aria-expanded': String(x.open),
            onClick: () => toggle(x.key, !x.open),
          },
          x.open ? '▾' : '▸',
        )
      : f.depth > 0 && h('span', { class: 'fold-sp', 'aria-hidden': 'true' });
  return h(
    'div',
    { class: 'folder', role: 'option', title: f.path, style: { paddingLeft: `${f.depth ? (f.depth - 1) * 14 : 10}px` } },
    fold,
    ...rowText(f.title, f.count),
  );
}

function toggle(id, open) {
  if (open) popup.open.add(id);
  else {
    popup.open.delete(id);
    if (folderAncestors(popup.folders, popup.selId).includes(id)) popup.selId = id;
  }
  renderFolders();
  document.querySelector('#q').focus();
}

export function arrowKey(key) {
  const act = folderArrow(popup.items, popup.cursor, key);
  if (!act) return false;
  if (act.open) toggle(act.open, true);
  else if (act.close) toggle(act.close, false);
  else setCursor(act.cursor);
  return true;
}

export function setCursor(i) {
  popup.cursor = Math.max(0, Math.min(popup.items.length - 1, i));
  popup.selId = popup.items[popup.cursor]?.key ?? null;
  const box = list();
  box.querySelectorAll('.folder').forEach((el, k) => {
    el.classList.toggle('on', k === popup.cursor);
    el.setAttribute('aria-selected', String(k === popup.cursor));
  });
  box.querySelector('.folder.on')?.scrollIntoView({ block: 'nearest' });
  updateSaveBtn();
}

export function updateSaveBtn() {
  const btn = document.querySelector('#save');
  const x = popup.items[popup.cursor];
  const label = saveLabel(x, popup.dup);
  btn.replaceChildren(svgIcon('save'), h('span', {}, label));
  btn.title = label;
  btn.disabled = popup.busy || !x || !target();
}
