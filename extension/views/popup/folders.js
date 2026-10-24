import { folderItems, saveLabel } from '../../domain/popup.js';
import { h, svgIcon } from '../../ui/dom.js';
import { popup, target } from '../../state/popup-state.js';
import { save } from './save.js';

const list = () => document.querySelector('#folders');

export function renderFolders() {
  const { folders, query } = popup;
  const t = query.toLowerCase();
  popup.items = folderItems(folders, query);
  const cursor = Math.max(
    0,
    popup.items.findIndex((x) => x.key === popup.selId),
  );
  const box = list();
  box.replaceChildren();
  popup.items.forEach((x, i) => {
    const el = x.create
      ? h(
          'button',
          { class: 'folder create', role: 'option', tabindex: '-1' },
          svgIcon('plus'),
          `Create "${x.create}"`,
          h('span', { class: 'n' }, `in ${folders[0].title}`),
        )
      : h(
          'button',
          { class: 'folder', role: 'option', tabindex: '-1', title: x.f.path, style: { paddingLeft: `${10 + (t ? 0 : x.f.depth * 14)}px` } },
          t ? x.f.path : x.f.title,
          h('span', { class: 'n' }, String(x.f.count)),
        );
    el.addEventListener('click', () => {
      setCursor(i);
      document.querySelector('#q').focus();
    });
    el.addEventListener('dblclick', save);
    box.append(el);
  });
  setCursor(cursor);
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
