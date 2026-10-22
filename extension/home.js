import {
  imageSaveError,
  saveSettings,
  findById,
  tileIconSrcs,
  WEB_ICON,
  faviconUrl,
  letterIcon,
  normalizeUrl,
  hostOf,
  clockText,
  msToNextTick,
  h,
  svgIcon,
} from './lib/core.js';

let icons = null;
let bg = null;
let clockTimer = null;
let dragId = null;
let clockOpts = null;

export async function loadHomeAssets() {
  if (icons && bg !== null) return;
  const r = await chrome.storage.local.get(['homeIcons', 'homeBg']);
  icons = r.homeIcons || {};
  bg = r.homeBg || '';
}

export function homeBgUrl() {
  return bg || '';
}

export function homeIconMap() {
  return icons || {};
}

export function homeLinks(tree, settings) {
  const folder = findById(tree, settings.home.folderId);
  return { folder, links: (folder?.children || []).filter((c) => c.url) };
}

export async function setHomeBg(file) {
  const next = file ? await resizeImage(file, 1920) : '';
  if (next) await chrome.storage.local.set({ homeBg: next });
  else await chrome.storage.local.remove('homeBg');
  bg = next;
  return bg;
}

export function homeFolderParent(tree) {
  return tree.children?.[1] || tree.children?.[0] || tree;
}

export async function ensureHomeFolder(tree, settings) {
  const home = settings.home;
  if (home.folderId && findById(tree, home.folderId)) return { settings, created: false };
  const parentId = homeFolderParent(tree).id;
  const kids = await chrome.bookmarks.getChildren(parentId);
  const existing = kids.find((c) => !c.url && c.title === 'Home');
  const folder = existing || (await chrome.bookmarks.create({ parentId, title: 'Home' }));
  settings = await saveSettings({ home: { ...home, folderId: folder.id } });
  return { settings, created: !existing };
}

let globe = null;

function pixels(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 16, 16);
  return g.getImageData(0, 0, 16, 16).data.join();
}

function globePixels() {
  globe ||= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(pixels(img));
    img.onerror = () => resolve('');
    img.src = faviconUrl('https://favicon.invalid/', 64);
  });
  return globe;
}

export function homeIconImg(bm, box, iconMap = icons) {
  const srcs = tileIconSrcs(bm, iconMap);
  const favicon = faviconUrl('', 64).split('?')[0];
  const img = h('img', { class: 'wait', src: srcs.shift(), alt: '', loading: 'lazy', decoding: 'async' });
  const next = () => {
    const src = srcs.shift();
    if (src) {
      img.src = src;
      return;
    }
    img.remove();
    box.classList.add('letter');
    box.textContent = letterIcon(bm);
  };
  img.addEventListener('error', next);
  img.addEventListener('load', async () => {
    if (img.src.startsWith(WEB_ICON) && img.naturalWidth <= 16) return next();
    if (img.src.startsWith(favicon) && pixels(img) === (await globePixels())) return next();
    img.classList.remove('wait');
  });
  box.append(img);
  return box;
}

export function applyHomeVars(el, o) {
  el.style.setProperty('--home-bg', o.color);
  el.style.setProperty('--img-op', String(o.imgOpacity / 100));
  el.style.setProperty('--dark', String(o.dark / 100));
  el.style.setProperty('--blur', `${o.blur}px`);
  el.style.setProperty('--clock', `${o.clockSize}px`);
  el.style.setProperty('--tile', `${o.tileSize}px`);
  el.style.setProperty('--per-row', String(o.perRow));
  el.style.setProperty('--tiles-gap', `${o.tilesGap}px`);
  el.classList.toggle('no-labels', !o.labels);
}

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
  const grid = h('div', { class: 'home-tiles' });
  for (const bm of links) {
    const ic = homeIconImg(bm, h('span', { class: `ic ${icons[bm.id]?.startsWith('data:') ? 'custom' : ''}` }));
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
      grid.querySelectorAll('.drop-before').forEach((n) => n.classList.remove('drop-before'));
    });
    a.addEventListener('dragover', (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.drop-before').forEach((n) => n.classList.remove('drop-before'));
      a.classList.add('drop-before');
    });
    a.addEventListener('drop', async (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      const id = dragId;
      dragId = null;
      await chrome.bookmarks.move(id, { parentId: folder.id, index: bm.index });
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
    await chrome.bookmarks.move(id, { parentId: folder.id });
  });
  return grid;
}

async function saveIcons() {
  await chrome.storage.local.set({ homeIcons: icons });
}

function tileMenu(e, bm, ctx) {
  ctx.showMenu(e, [
    { label: 'Change icon…', icon: 'pencil', run: () => pickIcon(bm, ctx) },
    {
      label: 'Icon from URL…',
      run: async () => {
        const u = normalizeUrl(prompt('Icon image URL', icons[bm.id]?.startsWith('data:') ? '' : icons[bm.id] || ''));
        if (!u) return;
        icons[bm.id] = u;
        await saveIcons();
        ctx.rerender();
      },
    },
    ...(icons[bm.id]
      ? [
          {
            label: 'Use site icon',
            run: async () => {
              delete icons[bm.id];
              await saveIcons();
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
          await chrome.bookmarks.update(bm.id, { title: title.trim() || hostOf(url), url });
        } catch (err) {
          ctx.toast(`Couldn't save: ${err.message}`);
        }
      },
    },
    { label: 'Open in new tab', icon: 'external', run: () => chrome.tabs.create({ url: bm.url }) },
    '-',
    { label: 'Remove', icon: 'x', danger: true, run: () => removeTile(bm, ctx) },
  ]);
}

export async function removeTile(bm, ctx) {
  const icon = icons[bm.id];
  await chrome.bookmarks.remove(bm.id);
  ctx.toast(`Removed “${bm.title || hostOf(bm.url)}”`, {
    label: 'Undo',
    run: async () => {
      const back = await chrome.bookmarks.create({ parentId: bm.parentId, index: bm.index, title: bm.title, url: bm.url });
      if (icon) {
        icons[back.id] = icon;
        await saveIcons();
      }
    },
  });
  if (icon) {
    delete icons[bm.id];
    await saveIcons();
  }
}

export function homeLinksList(links, folder, ctx) {
  const list = h('div', { class: 'home-links', role: 'list' });
  for (const bm of links) {
    const name = bm.title || hostOf(bm.url);
    const mini = homeIconImg(bm, h('span', { class: 'mini' }));
    const row = h(
      'div',
      { class: 'home-link', role: 'listitem', draggable: true, dataset: { id: bm.id }, title: bm.url },
      h('span', { class: 'grip', 'aria-hidden': 'true' }, svgIcon('grip')),
      mini,
      h('span', { class: 'nm' }, name),
      h('button', { class: 'x', 'aria-label': `Remove ${name}`, title: 'Remove', onClick: () => removeTile(bm, ctx) }, svgIcon('x')),
    );
    row.addEventListener('dragstart', (e) => {
      if (e.target !== row) return;
      dragId = bm.id;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', bm.url);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      dragId = null;
      row.classList.remove('dragging');
      list.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
    });
    row.addEventListener('dragover', (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = row.getBoundingClientRect();
      list.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
      row.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
    });
    row.addEventListener('drop', async (e) => {
      if (!dragId || dragId === bm.id) return;
      e.preventDefault();
      const after = row.classList.contains('drop-after');
      const id = dragId;
      dragId = null;
      await chrome.bookmarks.move(id, { parentId: folder.id, index: bm.index + (after ? 1 : 0) });
    });
    list.append(row);
  }
  if (!links.length) list.append(h('p', { class: 'muted' }, 'No links yet. Add one below.'));

  const nameIn = h('input', { placeholder: 'Name', 'aria-label': 'New link name' });
  const urlIn = h('input', { placeholder: 'URL', 'aria-label': 'New link URL' });
  const form = h('form', { class: 'home-add', novalidate: true }, nameIn, urlIn, h('button', { class: 'btn primary sm', type: 'submit' }, 'Add link'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!folder) return;
    const url = normalizeUrl(urlIn.value);
    if (!url) {
      urlIn.focus();
      return;
    }
    const title = nameIn.value.trim() || hostOf(url).replace(/^www\./, '') || url;
    try {
      await chrome.bookmarks.create({ parentId: folder.id, title, url });
    } catch (err) {
      ctx.toast(`Couldn't add: ${err.message}`);
    }
  });
  return h('div', { class: 'home-links-box' }, list, form);
}

function pickIcon(bm, ctx) {
  const f = h('input', { type: 'file', accept: 'image/*' });
  f.addEventListener('change', async () => {
    const file = f.files[0];
    if (!file) return;
    const before = icons[bm.id];
    try {
      icons[bm.id] = await resizeImage(file, 128, 'image/png');
      await saveIcons();
      ctx.rerender();
    } catch (err) {
      if (before) icons[bm.id] = before;
      else delete icons[bm.id];
      ctx.toast(imageSaveError(err));
    }
  });
  f.click();
}

export async function resizeImage(file, max, type = 'image/jpeg', quality = 0.82) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c.toDataURL(type, quality);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(clockTimer);
  else if (clockOpts) startClock(clockOpts);
});
