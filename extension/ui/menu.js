import { MARK_COLORS } from '../constants/themes.js';
import { h, svgIcon } from './dom.js';

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
