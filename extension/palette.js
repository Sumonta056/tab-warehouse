import { h, svgIcon, iconEl, highlight, searchLinks, detectEnv, linkBadge, displayUrl } from './lib/core.js';
import { TABS } from './settings.js';

const LINK_MAX = 30;
let open = null;

export function openPalette(ctx) {
  if (open) return open.focus();
  const back = document.activeElement;
  const actions = [
    { title: 'Home', icon: 'home', run: () => ctx.go('home') },
    { title: 'Board', icon: 'board', run: () => ctx.go('board') },
    ...TABS.map(([key, label]) => ({ title: `Settings › ${label}`, icon: 'gear', run: () => ctx.openSettings(key) })),
  ];
  const input = h('input', {
    type: 'text',
    id: 'palQ',
    class: 'pal-q',
    placeholder: 'Search links, folders and actions',
    autocomplete: 'off',
    spellcheck: 'false',
    role: 'combobox',
    'aria-expanded': 'true',
    'aria-controls': 'palList',
    'aria-autocomplete': 'list',
    'aria-label': 'Command palette',
  });
  const list = h('div', { class: 'pal-list', id: 'palList', role: 'listbox', 'aria-label': 'Results' });
  const kbd = (k, label) => h('span', {}, h('span', { class: 'kbd' }, k), ` ${label}`);
  const shade = h(
    'div',
    { class: 'pal-shade', id: 'palette' },
    h(
      'div',
      { class: 'pal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command palette' },
      input,
      list,
      h('div', { class: 'pal-foot' }, kbd('↑↓', 'move'), kbd('Enter', 'open'), kbd('⌘Enter', 'open in a background tab'), kbd('Esc', 'close')),
    ),
  );
  let items = [];
  let sel = 0;

  const build = (q) => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const ok = (s) => terms.every((t) => s.toLowerCase().includes(t));
    const links = q
      ? searchLinks(ctx.secs, q, ctx.linkMeta, ctx.settings.envRules)
          .slice(0, LINK_MAX)
          .map(({ bm, crumb }) => ({
            kind: 'link',
            bm,
            title: bm.title || displayUrl(bm.url),
            sub: `${crumb} · ${displayUrl(bm.url)}`,
            run: (bg) => ctx.openUrl(bm.url, bg),
          }))
      : [];
    const folders = ctx.secs
      .filter((s) => ok(s.title))
      .map((s) => ({ kind: 'folder', title: s.title, sub: `${s.all.length} link${s.all.length === 1 ? '' : 's'}`, icon: 'board', run: () => ctx.select(s) }));
    return [...links, ...folders, ...actions.filter((a) => ok(a.title)).map((a) => ({ kind: 'action', ...a }))];
  };

  const mark = () => {
    list.querySelectorAll('.pal-item').forEach((o, i) => {
      o.classList.toggle('sel', i === sel);
      o.setAttribute('aria-selected', String(i === sel));
    });
    if (items.length) {
      input.setAttribute('aria-activedescendant', `pal-o-${sel}`);
      list.querySelector('.pal-item.sel')?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const draw = () => {
    const q = input.value.trim();
    items = build(q);
    sel = 0;
    list.replaceChildren(
      ...items.map((it, i) => {
        const env = it.bm && detectEnv(it.bm, ctx.settings.envRules);
        const t = h('span', { class: 'pal-t' });
        const s = h('span', { class: 'pal-s' });
        highlight(t, it.title, q);
        highlight(s, it.sub || '', q);
        return h(
          'div',
          { class: 'pal-item', id: `pal-o-${i}`, role: 'option', dataset: { i, kind: it.kind }, title: it.bm?.url },
          it.bm ? iconEl(it.bm, ctx.settings.showFavicons) : h('span', { class: 'ico pal-sym' }, svgIcon(it.icon)),
          h('span', { class: 'pal-txt' }, t, it.sub ? s : ''),
          it.bm ? linkBadge(env, it.bm.url, ctx.settings.customTags) : h('span', { class: 'pal-kind' }, it.kind === 'folder' ? 'Folder' : 'Go to'),
        );
      }),
    );
    if (!items.length) list.append(h('div', { class: 'pal-empty' }, 'Nothing matches. Try part of a name, host or note.'));
    mark();
  };

  const close = () => {
    shade.remove();
    open = null;
    back?.focus?.({ preventScroll: true });
  };
  const choose = (i, bg) => {
    const it = items[i];
    if (!it) return;
    close();
    it.run(bg && it.kind === 'link');
  };

  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = Math.max(0, Math.min(items.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
      mark();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(sel, e.metaKey || e.ctrlKey || e.shiftKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') e.preventDefault();
  });
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('mousemove', (e) => {
    const o = e.target.closest('.pal-item');
    if (o && +o.dataset.i !== sel) {
      sel = +o.dataset.i;
      mark();
    }
  });
  list.addEventListener('click', (e) => {
    const o = e.target.closest('.pal-item');
    if (o) choose(+o.dataset.i, e.metaKey || e.ctrlKey || e.shiftKey);
  });
  shade.addEventListener('mousedown', (e) => {
    if (e.target === shade) close();
  });

  document.body.append(shade);
  draw();
  input.focus();
  open = { focus: () => input.focus() };
}
