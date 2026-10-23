import {
  loadSettings,
  saveSettings,
  applyTheme,
  getTree,
  resolveRoot,
  detectEnv,
  linkBadge,
  tagBadge,
  tagNames,
  tagPlain,
  hostOf,
  iconEl,
  h,
  svgIcon,
  priPicker,
  duePicker,
  gcalUrl,
  NOTE_MAX,
  loadLinkMeta,
  setLinkMeta,
  switchTargets,
  findSaved,
} from './lib/core.js';

const $ = (s) => document.querySelector(s);
const q = $('#q');
const list = $('#folders');
const saveBtn = $('#save');
$('#searchIcon').append(svgIcon('search'));

let settings, root, tab, titleEl, targetEl, badgeEl, noteEl, dueEl;
let pri = null;
let folders = [],
  items = [],
  cursor = 0,
  selId = null,
  mode = 'page',
  query = '',
  titleEdited = false,
  busy = false,
  dup = false;

async function boot() {
  settings = await loadSettings();
  applyTheme(settings.theme);
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await loadFolders();
  selId = settings.lastSaveFolder;
  renderPage();
  renderSwitch();
  renderMeta();
  renderModes();
  renderFolders();
  await renderExists();
  q.focus();
}

const linkCount = (n) => (n.children || []).filter((c) => c.url).length;

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
  try {
    const u = new URL(tab.url);
    return /^https?:$/.test(u.protocol) ? `${u.origin}/` : null;
  } catch {
    return null;
  }
}
function targetUrl() {
  return mode === 'site' ? siteUrl() : tab?.url || null;
}
function defaultTitle() {
  return mode === 'site' ? hostOf(tab.url) : tab.title || tab.url;
}

function renderPage() {
  const page = $('#page');
  if (!tab?.url) {
    page.replaceChildren(h('span', { class: 'muted' }, 'No tab to save. Open a page and try again.'));
    return;
  }
  titleEl = h('input', {
    class: 'field',
    'aria-label': 'Title',
    autocomplete: 'off',
    onInput: () => {
      titleEdited = true;
      updateBadge();
    },
  });
  titleEl.value = defaultTitle();
  targetEl = h('span', { class: 'target' });
  badgeEl = h('span');
  page.replaceChildren(iconEl({ title: tab.title, url: tab.url }, settings.showFavicons), h('span', { class: 'txt' }, titleEl, targetEl), badgeEl);
  updateTarget();
}

function renderSwitch() {
  if (!tab?.url) return;
  const box = $('#switch');
  const sw = switchTargets(tab.url, settings.hostMap, tagNames(settings));
  if (sw?.to.length)
    box.replaceChildren(
      h('span', { class: 'lbl' }, 'Open this page in'),
      ...sw.to.map(({ env, url }) =>
        h(
          'button',
          { class: 'env-go', title: url, dataset: { env }, onClick: (e) => openEnv(url, e.shiftKey || e.metaKey || e.ctrlKey) },
          tagBadge(env, settings.customTags),
          h('span', { class: 'u' }, url),
          h('span', { class: 'n' }, tagPlain(settings, env)),
        ),
      ),
    );
  else if (!sw && detectEnv({ title: tab.title, url: tab.url }, settings.envRules))
    box.replaceChildren(h('span', { class: 'switch-hint' }, 'To open this page in your other versions, add this site in Settings › Tags.'));
  else return;
  box.hidden = false;
}

async function openEnv(url, bg) {
  await chrome.tabs.create({ url, index: tab.index + 1, active: !bg });
  if (bg) status('Opened in a background tab');
  else window.close();
}

function renderMeta() {
  if (!tab?.url) return;
  noteEl = h('input', {
    id: 'note',
    class: 'field note-line',
    type: 'text',
    autocomplete: 'off',
    maxlength: String(NOTE_MAX),
    placeholder: 'Add a note…',
    'aria-label': 'Note',
  });
  dueEl = duePicker('');
  dueEl.el.id = 'duePick';
  dueEl.el.hidden = true;
  const dueBtn = h(
    'button',
    {
      type: 'button',
      id: 'dueBtn',
      class: 'due-btn',
      'aria-expanded': 'false',
      'aria-controls': 'duePick',
      onClick: () => {
        const open = dueEl.el.hidden;
        dueEl.el.hidden = !open;
        dueBtn.setAttribute('aria-expanded', String(open));
        dueBtn.classList.toggle('on', open);
        document.body.classList.toggle('due-open', open);
        if (open) dueEl.date.focus();
        else dueEl.reset();
      },
    },
    svgIcon('calendar'),
    'Due',
  );
  $('#meta').replaceChildren(
    h(
      'div',
      { class: 'pri-row' },
      priPicker(pri, (p) => (pri = p)),
      dueBtn,
    ),
    h('div', { class: 'opt-row' }, noteEl, h('div', { class: 'modes', id: 'modes', role: 'group', 'aria-label': 'Save' })),
    dueEl.el,
  );
}

function updateTarget() {
  if (!targetEl) return;
  targetEl.textContent = targetUrl() || '';
  updateBadge();
}

function updateBadge() {
  const bm = { title: titleEl.value, url: targetUrl() || '' };
  const env = detectEnv(bm, settings.envRules);
  const badge = linkBadge(env, bm.url, settings.customTags) || h('span');
  badgeEl.replaceWith(badge);
  badgeEl = badge;
}

function renderModes() {
  const c = $('#modes');
  if (!c) return;
  const site = siteUrl();
  c.replaceChildren(
    h(
      'button',
      { class: `chip ${mode === 'page' ? 'on' : ''}`, 'aria-pressed': String(mode === 'page'), title: 'Save this page', onClick: () => setMode('page') },
      'Page',
    ),
    h(
      'button',
      {
        class: `chip ${mode === 'site' ? 'on' : ''}`,
        'aria-pressed': String(mode === 'site'),
        disabled: !site,
        title: site ? `Save the whole site: ${site}` : 'This page has no website address',
        onClick: () => setMode('site'),
      },
      'Site',
    ),
  );
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
  const shown = t ? folders.filter((f) => f.path.toLowerCase().includes(t)) : folders;
  items = shown.map((f) => ({ key: f.id, f }));
  if (t && !folders.some((f) => f.title.toLowerCase() === t)) items.push({ key: 'create', create: query });
  cursor = Math.max(
    0,
    items.findIndex((x) => x.key === selId),
  );
  list.replaceChildren();
  items.forEach((x, i) => {
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
      q.focus();
    });
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
  const label = !x ? 'Save' : x.create ? `Create "${x.create}" and save` : `${dup ? 'Save again' : 'Save'} to ${x.f.title}`;
  saveBtn.replaceChildren(svgIcon('save'), h('span', {}, label));
  saveBtn.title = label;
  saveBtn.disabled = busy || !x || !targetUrl();
}

async function renderExists() {
  const box = $('#exists');
  const url = targetUrl();
  let hits = [];
  if (url) {
    try {
      hits = findSaved(await getTree(), url);
    } catch {
      hits = [];
    }
  }
  if (url !== targetUrl()) return;
  box.replaceChildren();
  dup = hits.length > 0;
  updateSaveBtn();
  if (!dup) return;
  box.append(
    h(
      'div',
      { class: 'dup-warn', role: 'note' },
      ...hits
        .slice(0, 3)
        .map((b) =>
          h(
            'div',
            { class: 'exists' },
            h(
              'span',
              { class: 'where' },
              h('span', { class: 'path' }, 'Already saved in ', h('strong', {}, folders.find((f) => f.id === b.parentId)?.path || b.path || 'another folder')),
              b.url !== url && h('span', { class: 'addr', title: b.url }, b.url),
            ),
            h('button', { class: 'btn sm', onClick: () => remove(b) }, 'Remove'),
          ),
        ),
    ),
  );
}

async function remove(b) {
  const meta = (await loadLinkMeta())[b.id];
  await chrome.bookmarks.remove(b.id);
  if (meta) await setLinkMeta(b.id, null);
  await refresh();
  toast('Bookmark removed', async () => {
    const back = await chrome.bookmarks.create({ parentId: b.parentId, index: b.index, title: b.title, url: b.url });
    if (meta) await setLinkMeta(back.id, meta);
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
  const el = h(
    'div',
    { class: 'toast', role: 'status' },
    msg,
    undo &&
      h(
        'button',
        {
          onClick: async () => {
            el.remove();
            await undo();
          },
        },
        'Undo',
      ),
  );
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
    const bm = await chrome.bookmarks.create({ parentId, title: titleEl.value.trim() || url, url });
    const due = dueEl.value();
    if (pri || noteEl.value.trim() || due) await setLinkMeta(bm.id, { pri, note: noteEl.value, due });
    await saveSettings({ lastSaveFolder: parentId });
    status(`Saved to ${x.create || x.f.title}`);
    if (dueEl.calendar()) await chrome.tabs.create({ url: gcalUrl({ title: bm.title, url, note: noteEl.value.trim(), due }), index: tab.index + 1 });
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
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setCursor(cursor + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setCursor(cursor - 1);
  } else if (e.key === 'Escape' && q.value) {
    e.preventDefault();
    q.value = '';
    query = '';
    selId = settings.lastSaveFolder;
    renderFolders();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault();
    save();
  }
});

saveBtn.addEventListener('click', save);
$('#openBoard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
  window.close();
});

boot();
