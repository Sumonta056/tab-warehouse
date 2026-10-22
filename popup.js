import { loadSettings, saveSettings, applyTheme, getTree, resolveRoot, detectEnv, isGithub, hostOf, iconEl, h, svgIcon } from './lib/core.js';

const $ = (s) => document.querySelector(s);
const q = $('#q');
const list = $('#folders');
const saveBtn = $('#save');
$('#searchIcon').append(svgIcon('search'));

let settings, root, tab, titleEl, targetEl, badgeEl;
let folders = [], items = [], cursor = 0, selId = null, mode = 'page', query = '', titleEdited = false, busy = false;

async function boot() {
  settings = await loadSettings();
  applyTheme(settings.theme);
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await loadFolders();
  selId = settings.lastSaveFolder;
  renderPage();
  renderModes();
  renderFolders();
  await renderExists();
  q.focus();
}

const linkCount = (n) => (n.children || []).filter(c => c.url).length;

async function loadFolders() {
  root = resolveRoot(await getTree(), settings);
  const rootTitle = root.title || 'Bookmarks';
  folders = [{ id: root.id, title: rootTitle, path: rootTitle, depth: 0, count: linkCount(root) }];
  const walk = (n, path, depth) => {
    for (const c of n.children || []) {
      if (c.url) continue;
      const p = [...path, c.title || '(untitled)'];
      folders.push({ id: c.id, title: p[p.length - 1], path: p.join(' › '), depth, count: linkCount(c) });
      walk(c, p, depth + 1);
    }
  };
  walk(root, [rootTitle], 1);
}

function siteUrl() {
  try { const u = new URL(tab.url); return /^https?:$/.test(u.protocol) ? `${u.origin}/` : null; } catch { return null; }
}
function targetUrl() { return mode === 'site' ? siteUrl() : tab?.url || null; }
function defaultTitle() { return mode === 'site' ? hostOf(tab.url) : tab.title || tab.url; }

function renderPage() {
  const page = $('#page');
  if (!tab?.url) { page.replaceChildren(h('span', { class: 'muted' }, 'No tab to save. Open a page and try again.')); return; }
  titleEl = h('input', { class: 'field', 'aria-label': 'Title', autocomplete: 'off', onInput: () => { titleEdited = true; updateBadge(); } });
  titleEl.value = defaultTitle();
  targetEl = h('span', { class: 'target' });
  badgeEl = h('span');
  page.replaceChildren(iconEl({ title: tab.title, url: tab.url }, settings.showFavicons), h('span', { class: 'txt' }, titleEl, targetEl), badgeEl);
  updateTarget();
}

function updateTarget() {
  if (!targetEl) return;
  targetEl.textContent = targetUrl() || '';
  updateBadge();
}

function updateBadge() {
  const bm = { title: titleEl.value, url: targetUrl() || '' };
  const env = detectEnv(bm, settings.envRules);
  const tag = env || (isGithub(bm.url) ? 'GH' : null);
  badgeEl.replaceChildren();
  badgeEl.className = tag ? `badge ${tag}` : '';
  if (tag) badgeEl.textContent = tag;
}

function renderModes() {
  const c = $('#modes');
  const site = siteUrl();
  c.replaceChildren(
    h('button', { class: `chip ${mode === 'page' ? 'on' : ''}`, 'aria-pressed': String(mode === 'page'), onClick: () => setMode('page') }, 'This page'),
    h('button', { class: `chip ${mode === 'site' ? 'on' : ''}`, 'aria-pressed': String(mode === 'site'), disabled: !site, title: site || 'This page has no website address', onClick: () => setMode('site') }, 'Whole site'));
}

async function setMode(m) {
  mode = m;
  if (!titleEdited && titleEl) titleEl.value = defaultTitle();
  renderModes();
  updateTarget();
  await renderExists();
  q.focus();
}

function renderFolders() {
  const t = query.toLowerCase();
  const shown = t ? folders.filter(f => f.path.toLowerCase().includes(t)) : folders;
  items = shown.map(f => ({ key: f.id, f }));
  if (t && !folders.some(f => f.title.toLowerCase() === t)) items.push({ key: 'create', create: query });
  cursor = Math.max(0, items.findIndex(x => x.key === selId));
  list.replaceChildren();
  items.forEach((x, i) => {
    const el = x.create
      ? h('button', { class: 'folder create', role: 'option', tabindex: '-1' }, svgIcon('plus'), `Create "${x.create}"`, h('span', { class: 'n' }, `in ${folders[0].title}`))
      : h('button', { class: 'folder', role: 'option', tabindex: '-1', title: x.f.path, style: { paddingLeft: `${10 + (t ? 0 : x.f.depth * 14)}px` } },
          t ? x.f.path : x.f.title, h('span', { class: 'n' }, String(x.f.count)));
    el.addEventListener('click', () => { setCursor(i); q.focus(); });
    el.addEventListener('dblclick', save);
    list.append(el);
  });
  setCursor(cursor);
}

function setCursor(i) {
  cursor = Math.max(0, Math.min(items.length - 1, i));
  selId = items[cursor]?.key ?? null;
  list.querySelectorAll('.folder').forEach((el, k) => {
    el.classList.toggle('on', k === cursor);
    el.setAttribute('aria-selected', String(k === cursor));
  });
  list.querySelector('.folder.on')?.scrollIntoView({ block: 'nearest' });
  updateSaveBtn();
}

function updateSaveBtn() {
  const x = items[cursor];
  saveBtn.replaceChildren(svgIcon('save'), !x ? 'Save' : x.create ? `Create "${x.create}" and save` : `Save to ${x.f.title}`);
  saveBtn.disabled = busy || !x || !targetUrl();
}

async function renderExists() {
  const box = $('#exists');
  box.replaceChildren();
  const url = targetUrl();
  if (!url) return;
  let hits = [];
  try { hits = (await chrome.bookmarks.search({ url })).filter(b => b.url); } catch { return; }
  for (const b of hits.slice(0, 3)) {
    const parent = folders.find(f => f.id === b.parentId);
    box.append(h('div', { class: 'exists' },
      h('span', {}, 'Already in ', h('strong', {}, parent?.path || 'another folder')),
      h('button', { class: 'btn sm', onClick: () => remove(b) }, 'Remove')));
  }
}

async function remove(b) {
  await chrome.bookmarks.remove(b.id);
  await refresh();
  toast('Bookmark removed', async () => {
    await chrome.bookmarks.create({ parentId: b.parentId, index: b.index, title: b.title, url: b.url });
    await refresh();
  });
}

async function refresh() {
  await loadFolders();
  renderFolders();
  await renderExists();
}

let toastTimer;
function toast(msg, undo) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: 'toast', role: 'status' }, msg,
    undo && h('button', { onClick: async () => { el.remove(); await undo(); } }, 'Undo'));
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), 8000);
}

function status(msg, err = false) {
  const s = $('#status');
  s.textContent = msg;
  s.classList.toggle('err', err);
}

async function save() {
  const x = items[cursor];
  const url = targetUrl();
  if (busy || !x || !url) return;
  busy = true;
  updateSaveBtn();
  try {
    const parentId = x.create ? (await chrome.bookmarks.create({ parentId: root.id, title: x.create })).id : x.f.id;
    await chrome.bookmarks.create({ parentId, title: titleEl.value.trim() || url, url });
    await saveSettings({ lastSaveFolder: parentId });
    status(`Saved to ${x.create || x.f.title}`);
    setTimeout(() => window.close(), 900);
  } catch (e) {
    busy = false;
    updateSaveBtn();
    status(`Could not save: ${e.message}`, true);
  }
}

let t;
q.addEventListener('input', () => {
  clearTimeout(t);
  t = setTimeout(() => {
    query = q.value.trim();
    selId = query ? null : settings.lastSaveFolder;
    renderFolders();
  }, 60);
});
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(cursor + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(cursor - 1); }
  else if (e.key === 'Escape' && q.value) { e.preventDefault(); q.value = ''; query = ''; selId = settings.lastSaveFolder; renderFolders(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(); }
});

saveBtn.addEventListener('click', save);
$('#openBoard').addEventListener('click', () => { chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') }); window.close(); });

boot();
