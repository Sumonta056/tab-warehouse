import { MARK_COLORS, MARK_ICONS } from '../constants/themes.js';
import { cleanIcon } from '../domain/marks.js';
import { h, svgIcon } from './dom.js';
import { toast } from './toast.js';

let openMenu = null;

export function menuOpen() {
  return !!openMenu;
}

export function showMenu(e, items) {
  closeMenu();
  const m = h('div', { class: 'menu', role: 'menu' });
  for (const it of items) {
    if (it === '-') {
      m.append(h('hr'));
      continue;
    }
    if (it.swatches) {
      m.append(
        h(
          'div',
          { class: 'swatches', role: 'group', 'aria-label': 'Color' },
          ...[null, ...MARK_COLORS].map((c) =>
            h('button', {
              class: `sw ${c ? '' : 'none'} ${it.value === c ? 'on' : ''}`,
              dataset: c ? { color: c } : null,
              role: 'menuitemradio',
              'aria-checked': String(it.value === c),
              'aria-label': c ? `${c[0].toUpperCase()}${c.slice(1)}` : 'Default color',
              title: c ? `${c[0].toUpperCase()}${c.slice(1)}` : 'Default',
              onClick: () => {
                closeMenu();
                it.pick(c);
              },
            }),
          ),
          customSwatch(it),
        ),
      );
      continue;
    }
    if (it.icons) {
      m.append(iconRow(it));
      continue;
    }
    m.append(
      h(
        'button',
        {
          class: it.danger ? 'danger' : '',
          role: 'menuitem',
          onClick: () => {
            closeMenu();
            it.run();
          },
        },
        it.icon ? svgIcon(it.icon) : null,
        it.label,
      ),
    );
  }
  document.body.append(m);
  m.style.left = `${Math.min(e.clientX, window.innerWidth - m.offsetWidth - 8)}px`;
  m.style.top = `${Math.min(e.clientY, window.innerHeight - m.offsetHeight - 8)}px`;
  openMenu = m;
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }));
}

function iconRow(it) {
  let t;
  let last = it.value || null;
  const pick = (v, close) => {
    clearTimeout(t);
    if (close) closeMenu();
    if (v === last) return;
    last = v;
    it.pick(v);
  };
  const box = h('input', {
    type: 'text',
    class: 'ico-in',
    value: it.value || '',
    placeholder: 'Emoji',
    'aria-label': 'Icon: type or paste one emoji',
    title: 'Type or paste one emoji (⌃⌘Space opens the emoji picker on a Mac)',
    autocomplete: 'off',
    onClick: (e) => e.stopPropagation(),
    onInput: () => {
      clearTimeout(t);
      const v = cleanIcon(box.value);
      if (v) t = setTimeout(() => pick(v), 300);
    },
    onKeydown: (e) => {
      if (e.key === 'Escape') closeMenu();
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = cleanIcon(box.value);
      if (v || !box.value.trim()) pick(v, true);
      else toast('Type or paste one emoji.');
    },
  });
  return h(
    'div',
    { class: 'icons', role: 'group', 'aria-label': 'Icon' },
    h(
      'div',
      { class: 'ico-row' },
      ...MARK_ICONS.map((x) =>
        h(
          'button',
          {
            class: `ico ${it.value === x ? 'on' : ''}`,
            role: 'menuitemradio',
            'aria-checked': String(it.value === x),
            'aria-label': `Icon ${x}`,
            onClick: () => pick(x, true),
          },
          x,
        ),
      ),
    ),
    h(
      'div',
      { class: 'ico-row' },
      box,
      it.value ? h('button', { class: 'ico-clr', 'aria-label': 'Remove icon', title: 'Remove icon', onClick: () => pick(null, true) }, svgIcon('x')) : null,
    ),
  );
}

function customSwatch(it) {
  const hex = it.value?.startsWith('#') ? it.value : null;
  let t;
  return h('input', {
    type: 'color',
    class: `sw custom ${hex ? 'on' : ''}`,
    value: hex || '#8ab4f8',
    'aria-label': 'Custom color',
    title: 'Custom color',
    onClick: (e) => e.stopPropagation(),
    onInput: (e) => {
      clearTimeout(t);
      t = setTimeout(() => it.pick(e.target.value), 300);
    },
    onChange: (e) => {
      clearTimeout(t);
      closeMenu();
      it.pick(e.target.value);
    },
  });
}

export function closeMenu() {
  document.removeEventListener('click', closeMenu);
  openMenu?.remove();
  openMenu = null;
}
