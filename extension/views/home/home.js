import { clockText, msToNextTick } from '../../domain/clock.js';
import { imageSaveError } from '../../domain/errors.js';
import { homeLinks, editableIconUrl } from '../../domain/home.js';
import { normalizeUrl, hostOf } from '../../domain/url.js';
import { moveBookmark, updateBookmark } from '../../services/bookmarks.js';
import { openTab } from '../../services/tabs.js';
import { h } from '../../ui/dom.js';
import { homeIconImg } from '../../ui/home-icon.js';
import { resizeImage } from '../../ui/image.js';
import { applyHomeVars } from '../../ui/theme.js';
import { homeBgUrl, homeIconMap, setHomeIcon, removeHomeLink } from '../../state/home-assets.js';

let clockTimer = null;
let dragId = null;
let clockOpts = null;

function startClock(o) {
  clearTimeout(clockTimer);
  clockOpts = o;
  const clock = document.getElementById('homeClock');
  const date = document.getElementById('homeDate');
  if (!clock || !clock.isConnected || document.hidden) return;
  const now = new Date();
  const t = clockText(now, o);
  if (clock.textContent !== t) clock.textContent = t;
  const d = o.date ? now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  if (date.textContent !== d) date.textContent = d;
  clockTimer = setTimeout(() => startClock(o), msToNextTick(now, o.seconds));
}

export function renderHome(page, ctx) {
  const o = ctx.settings.home;
  const { folder, links } = homeLinks(ctx.tree, ctx.settings);
  const bg = homeBgUrl();

  const bgEl = h('div', { class: 'home-bg' });
  if (bg) bgEl.style.backgroundImage = `url("${bg}")`;
  const home = h(
    'section',
    { class: 'home', id: 'home', 'aria-label': 'Home' },
    bgEl,
    h('div', { class: 'home-shade' }),
    h(
      'div',
      { class: 'home-content' },
      h('div', { class: 'home-clock', id: 'homeClock' }),
      h('div', { class: 'home-date', id: 'homeDate' }),
      renderTiles(links, folder, ctx),
      links.length
        ? null
        : h(
            'p',
            { class: 'home-empty' },
            'Add the sites you use most in Settings › Home page. They are saved in the bookmark folder “Home”, so you can also edit them in Chrome.',
          ),
    ),
  );
  applyHomeVars(home, o);
  page.append(home);
  startClock(o);
}

function renderTiles(links, folder, ctx) {
  const o = ctx.settings.home;
  const icons = homeIconMap();
  const grid = h('div', { class: 'home-tiles' });
  const unmark = () => grid.querySelectorAll('.drop-before').forEach((n) => n.classList.remove('drop-before'));
  for (const bm of links) {
    const ic = homeIconImg(bm, h('span', { class: `ic ${icons[bm.id]?.startsWith('data:') ? 'custom' : ''}` }), icons);
    const a = h(
      'a',
      {
        class: 'tile',
        href: bm.url,
        title: `${bm.title}\n${bm.url}`,
        draggable: true,
        dataset: { id: bm.id },
        target: o.newTab ? '_blank' : null,
        rel: o.newTab ? 'noopener' : null,
      },
      ic,
      h('span', { class: 'lbl' }, bm.title || hostOf(bm.url)),
    );
    a.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      tileMenu(e, bm, ctx);
    });
    a.addEventListener('dragstart', (e) => {
      dragId = bm.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', bm.url);
      a.classList.add('dragging');
    });
    a.addEventListener('dragend', () => {
      dragId = null;
      a.classList.remove('dragging');
      unmark();
    });
    a.addEventListener('dragover', (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      unmark();
      a.classList.add('drop-before');
    });
    a.addEventListener('drop', async (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      const id = dragId;
      dragId = null;
      await moveBookmark(id, { parentId: folder.id, index: bm.index });
    });
    grid.append(a);
  }
  grid.addEventListener('dragover', (e) => {
    if (!dragId || e.target !== grid) return;
    e.preventDefault();
  });
  grid.addEventListener('drop', async (e) => {
    if (!dragId || e.target !== grid) return;
    e.preventDefault();
    const id = dragId;
    dragId = null;
    await moveBookmark(id, { parentId: folder.id });
  });
  return grid;
}

function tileMenu(e, bm, ctx) {
  const icons = homeIconMap();
  ctx.showMenu(e, [
    { label: 'Change icon…', icon: 'pencil', run: () => pickIcon(bm, ctx) },
    {
      label: 'Icon from URL…',
      run: async () => {
        const u = normalizeUrl(prompt('Icon image URL', editableIconUrl(icons[bm.id])));
        if (!u) return;
        await setHomeIcon(bm.id, u);
        ctx.rerender();
      },
    },
    ...(icons[bm.id]
      ? [
          {
            label: 'Use site icon',
            run: async () => {
              await setHomeIcon(bm.id, null);
              ctx.rerender();
            },
          },
        ]
      : []),
    {
      label: 'Edit name / URL',
      icon: 'pencil',
      run: async () => {
        const title = prompt('Name', bm.title);
        if (title == null) return;
        const url = normalizeUrl(prompt('URL', bm.url));
        if (!url) return;
        try {
          await updateBookmark(bm.id, { title: title.trim() || hostOf(url), url });
        } catch (err) {
          ctx.toast(`Couldn't save: ${err.message}`);
        }
      },
    },
    { label: 'Open in new tab', icon: 'external', run: () => openTab({ url: bm.url }) },
    '-',
    {
      label: 'Remove',
      icon: 'x',
      danger: true,
      run: () => removeHomeLink(bm, (undo) => ctx.toast(`Removed “${bm.title || hostOf(bm.url)}”`, { label: 'Undo', run: undo })),
    },
  ]);
}

function pickIcon(bm, ctx) {
  const f = h('input', { type: 'file', accept: 'image/*' });
  f.addEventListener('change', async () => {
    const file = f.files[0];
    if (!file) return;
    try {
      await setHomeIcon(bm.id, await resizeImage(file, 128, 'image/png'));
      ctx.rerender();
    } catch (err) {
      ctx.toast(imageSaveError(err));
    }
  });
  f.click();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(clockTimer);
  else if (clockOpts) startClock(clockOpts);
});
