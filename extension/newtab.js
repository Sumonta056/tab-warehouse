import {
  loadSettings,
  saveSettings,
  getTree,
  resolveRoot,
  sections,
  sortLinks,
  buildMatrix,
  detectEnv,
  deriveUrl,
  isGithub,
  sameAsUrl,
  displayUrl,
  pathKey,
  hostOf,
  h,
  svgIcon,
  iconEl,
  highlight,
  ENVS,
  SORTS,
  findById,
  clampSideWidth,
  SIDE_WIDTH,
  applyTheme,
  sideLookVars,
  brandName,
  clampFont,
  flatten,
  PRIS,
  PRI_NAMES,
  NOTE_MAX,
  priGroups,
  priFirst,
  matchLink,
  priPicker,
  loadLinkMeta,
  setLinkMeta,
  searchLinks,
} from './lib/core.js';
import { renderHome, ensureHomeFolder, loadHomeAssets, homeBgUrl } from './home.js';
import { renderSettings, setSettingsTab } from './settings.js';
import { openPalette } from './palette.js';
import { renderBoard } from './board.js';

const $ = (s) => document.querySelector(s);
const nav = $('#nav');
const page = $('#page');
const qInput = $('#q');

let settings,
  tree,
  root,
  secs = [];
let current = null; // selected section
let query = ''; // global search (sidebar box)
let filterQ = ''; // folder-local filter
let priF = 'all';
let linkMeta = {};
let editingId = null;
let openMenu = null;
let drag = null; // { kind: 'link'|'folder', id, parentId }
const HOME = { id: 'home', title: 'Home', home: true, links: [], parts: [], all: [] };
const SETTINGS = { id: 'settings', title: 'Settings', settings: true, links: [], parts: [], all: [] };
const BOARD = { id: 'board', title: 'Board', board: true, links: [], parts: [], all: [] };
let beforeSettings = null;
let saveQueue = Promise.resolve();

$('#searchIcon').append(svgIcon('search'));
$('#gearIcon').append(svgIcon('gear'));
$('#plusIcon').append(svgIcon('plus'));
$('#catIcon').append(svgIcon('plus'));
$('#homeIcon').append(svgIcon('home'));
$('#boardIcon').append(svgIcon('board'));
$('#ghIcon').append(svgIcon('github'));
$('#webIcon').append(svgIcon('globe'));
$('#fabIcon').append(svgIcon('home'));

/* ================= boot / data ================= */
async function boot() {
  settings = await loadSettings();
  applyTheme(settings.theme);
  setSideWidth(settings.sideWidth);
  await loadHomeAssets();
  applySideLook(settings.sideLook);
  applyFontSize(settings);
  linkMeta = await loadLinkMeta();
  current = HOME;
  await refresh();
  bindGlobal();
  bindHomeButtons();
  bindResizer();
}

async function refresh() {
  tree = await getTree();
  if (!findById(tree, settings.home.folderId)) {
    ({ settings } = await ensureHomeFolder(tree, settings));
    tree = await getTree();
  }
  root = resolveRoot(tree, settings);
  secs = sections(root, settings.order, [settings.home.folderId]);
  await pruneLinkMeta();
  renderBrand();
  current = current?.home ? HOME : current?.settings ? SETTINGS : current?.board ? BOARD : secs.find((s) => s.id === current?.id) || HOME;
  renderNav();
  renderPage();
}

async function pruneLinkMeta() {
  const ids = new Set(flatten(tree).map((b) => b.id));
  const all = await loadLinkMeta();
  const gone = Object.keys(all).filter((id) => !ids.has(id));
  if (!gone.length) return;
  gone.forEach((id) => delete all[id]);
  linkMeta = all;
  await chrome.storage.local.set({ linkMeta: all });
}

function renderBrand() {
  const name = brandName(settings);
  $('#brandTitle').textContent = name;
  document.title = name;
}

function folderPrefs(id) {
  return { sort: 'manual', view: 'list', show: 'title', closed: {}, ...(settings.folders[id] || {}) };
}
async function setFolderPrefs(id, patch) {
  settings.folders[id] = { ...folderPrefs(id), ...patch };
  await saveSettings({ folders: settings.folders });
  renderPage();
}

/* ================= sidebar ================= */
function catId(folderId) {
  const c = settings.folderCat[folderId];
  return settings.categories.some((x) => x.id === c) ? c : null;
}

function groups() {
  const real = secs.filter((s) => !s.virtual);
  return [
    ...settings.categories.map((cat) => ({ cat, items: real.filter((s) => catId(s.id) === cat.id) })),
    { cat: null, items: real.filter((s) => !catId(s.id)) },
  ];
}

function navOrder() {
  if (!settings.categories.length) return [HOME, BOARD, ...secs];
  return [HOME, BOARD, ...groups().flatMap((g) => (g.cat?.closed ? [] : g.items)), ...secs.filter((s) => s.virtual)];
}

function bindHomeButtons() {
  const btn = $('#homeBtn');
  btn.addEventListener('click', () => {
    if (query) clearQuery();
    select(HOME);
  });
  bindNavDrag(btn, {
    ...HOME,
    virtual: true,
    get node() {
      return { id: settings.home.folderId };
    },
  });
  $('#boardBtn').addEventListener('click', () => {
    if (query) clearQuery();
    select(BOARD);
  });
  $('#homeFab').addEventListener('click', () => {
    if (query) clearQuery();
    select(HOME);
  });
}

function clearQuery() {
  qInput.value = '';
  query = '';
}

function renderNav() {
  const on = !!current?.home;
  $('#homeBtn').classList.toggle('on', on);
  $('#homeBtn').setAttribute('aria-current', on ? 'page' : 'false');
  const onBoard = !!current?.board;
  $('#boardBtn').classList.toggle('on', onBoard);
  $('#boardBtn').setAttribute('aria-current', onBoard ? 'page' : 'false');
  $('#settingsBtn').classList.toggle('on', !!current?.settings);
  $('#settingsBtn').setAttribute('aria-pressed', String(!!current?.settings));
  nav.replaceChildren();
  if (!settings.categories.length) {
    secs.forEach((s) => nav.append(navItem(s)));
    return;
  }
  for (const g of groups()) {
    if (!g.cat && !g.items.length) continue;
    nav.append(catHeader(g));
    if (g.cat?.closed) continue;
    g.items.forEach((s) => nav.append(navItem(s)));
    if (g.cat && !g.items.length) nav.append(h('div', { class: 'cat-empty' }, 'Drag folders here'));
  }
  secs.filter((s) => s.virtual).forEach((s) => nav.append(navItem(s)));
}

function navItem(s) {
  const el = h(
    'button',
    {
      class: `nav ${s.id === current?.id ? 'on' : ''} ${s.virtual ? 'unsorted' : ''}`,
      dataset: { id: s.id },
      draggable: !s.virtual,
      title: s.virtual ? 'Loose links directly under the root' : 'Drag to reorder · Alt+↑/↓ to move',
      onClick: () => select(s),
      onKeydown: (e) => {
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          moveSection(s, e.key === 'ArrowUp' ? -1 : 1);
        }
      },
    },
    h('span', { class: 'grip', 'aria-hidden': 'true' }, svgIcon('grip')),
    h('span', { class: 't' }, s.title),
    h('span', { class: 'n' }, String(s.all.length)),
  );
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    folderMenu(e, s);
  });
  bindNavDrag(el, s);
  return el;
}

const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

function headerDrag(el, kind, id, onDrop) {
  el.addEventListener('dragstart', (e) => {
    if (e.target !== el) return;
    drag = { kind, id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    requestAnimationFrame(() => el.classList.add('dragging'));
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    clearMarks();
    drag = null;
  });
  el.addEventListener('dragover', (e) => {
    if (drag?.kind !== kind || drag.id === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = el.getBoundingClientRect();
    clearMarks();
    el.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
  });
  el.addEventListener('drop', async (e) => {
    if (drag?.kind !== kind || drag.id === id) return;
    e.preventDefault();
    const after = el.classList.contains('drop-after');
    const from = drag.id;
    clearMarks();
    drag = null;
    await onDrop(from, after);
  });
}

function catHeader({ cat, items }) {
  const hasOn = cat?.closed && items.some((s) => s.id === current?.id);
  const label = [h('span', { class: 't' }, cat ? cat.name : 'No category'), h('span', { class: 'n' }, `(${items.length})`)];
  const el = h(
    'div',
    {
      class: `cat ${cat?.closed ? 'closed' : ''} ${hasOn ? 'has-on' : ''}`,
      dataset: cat?.color ? { color: cat.color } : null,
      draggable: !!cat,
      title: cat ? 'Drag to reorder categories' : null,
    },
    cat
      ? h(
          'button',
          { class: 'cat-toggle', 'aria-expanded': String(!cat.closed), title: cat.closed ? 'Expand' : 'Collapse', onClick: () => toggleCat(cat.id) },
          svgIcon('chevron'),
          ...label,
        )
      : h('span', { class: 'cat-label' }, ...label),
    cat &&
      h(
        'button',
        {
          class: 'more',
          'aria-label': `Category menu for ${cat.name}`,
          title: 'More',
          onClick: (e) => {
            e.stopPropagation();
            catMenu(e, cat);
          },
        },
        svgIcon('more'),
      ),
  );
  if (cat) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      catMenu(e, cat);
    });
    headerDrag(el, 'cat', cat.id, (from, after) => {
      const moving = settings.categories.find((c) => c.id === from);
      const cats = settings.categories.filter((c) => c.id !== from);
      if (!moving) return;
      cats.splice(cats.findIndex((c) => c.id === cat.id) + (after ? 1 : 0), 0, moving);
      return saveCats({ categories: cats });
    });
  }
  el.addEventListener('dragover', (e) => {
    if (drag?.kind !== 'folder') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearMarks();
    el.classList.add('drop-into');
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drop-into');
  });
  el.addEventListener('drop', async (e) => {
    if (drag?.kind !== 'folder') return;
    e.preventDefault();
    clearMarks();
    const s = secs.find((x) => x.id === drag.id);
    if (!s) return;
    await moveToCategory(s, cat?.id || null);
    toast(`Moved to ${cat ? cat.name : 'No category'}`);
  });
  return el;
}

async function saveCats(patch) {
  Object.assign(settings, patch);
  await saveSettings(patch);
  renderNav();
}

function toggleCat(id) {
  saveCats({ categories: settings.categories.map((c) => (c.id === id ? { ...c, closed: !c.closed } : c)) });
}

async function newCategory() {
  const name = prompt('Category name')?.trim();
  if (!name) return;
  await saveCats({ categories: [...settings.categories, { id: `c${Date.now()}`, name, closed: false }] });
}

function catMenu(e, ref) {
  const cats = settings.categories.map((c) => ({ ...c }));
  const i = cats.findIndex((c) => c.id === ref.id);
  const cat = cats[i];
  if (!cat) return;
  const move = (d) => {
    cats.splice(i, 1);
    cats.splice(i + d, 0, cat);
    saveCats({ categories: cats });
  };
  showMenu(e, [
    {
      swatches: true,
      value: cat.color || null,
      pick: (color) => {
        cat.color = color;
        saveCats({ categories: cats });
      },
    },
    '-',
    {
      label: 'Rename category',
      icon: 'pencil',
      run: () => {
        const name = prompt('Category name', cat.name)?.trim();
        if (name) {
          cat.name = name;
          saveCats({ categories: cats });
        }
      },
    },
    ...(i > 0 ? [{ label: 'Move up', run: () => move(-1) }] : []),
    ...(i < cats.length - 1 ? [{ label: 'Move down', run: () => move(1) }] : []),
    '-',
    {
      label: 'Delete category…',
      icon: 'x',
      danger: true,
      run: () => {
        if (!confirm(`Delete category "${cat.name}"? Its folders move to No category. No bookmarks are deleted.`)) return;
        const folderCat = Object.fromEntries(Object.entries(settings.folderCat).filter(([, c]) => c !== cat.id));
        saveCats({ categories: cats.filter((c) => c !== cat), folderCat });
        toast(`Category "${cat.name}" deleted`);
      },
    },
  ]);
}

async function moveToCategory(s, target) {
  const folderCat = { ...settings.folderCat };
  if (target) folderCat[s.id] = target;
  else delete folderCat[s.id];
  settings.folderCat = folderCat;
  const ids = secs.filter((x) => !x.virtual && x.id !== s.id).map((x) => x.id);
  ids.splice(ids.findLastIndex((id) => catId(id) === target) + 1, 0, s.id);
  await saveSettings({ folderCat });
  await saveOrder(ids);
}

async function select(s) {
  current = s;
  filterQ = '';
  priF = 'all';
  settings.lastFolder = s.id;
  saveSettings({ lastFolder: s.id });
  renderNav();
  renderPage();
}

async function saveOrder(ids) {
  settings.order = ids;
  await saveSettings({ order: ids });
  secs = sections(root, ids, [settings.home.folderId]);
  renderNav();
}

async function moveSection(s, delta) {
  const peers = secs.filter((x) => !x.virtual && catId(x.id) === catId(s.id));
  const n = peers[peers.indexOf(s) + delta];
  if (!n) return;
  const ids = secs.filter((x) => !x.virtual && x.id !== s.id).map((x) => x.id);
  ids.splice(ids.indexOf(n.id) + (delta > 0 ? 1 : 0), 0, s.id);
  await saveOrder(ids);
  nav.querySelector(`.nav[data-id="${CSS.escape(s.id)}"]`)?.focus();
}

async function moveFolder(id, targetId, after) {
  const ids = secs
    .filter((x) => !x.virtual)
    .map((x) => x.id)
    .filter((x) => x !== id);
  ids.splice(ids.indexOf(targetId) + (after ? 1 : 0), 0, id);
  if (catId(id) !== catId(targetId)) {
    const folderCat = { ...settings.folderCat };
    if (catId(targetId)) folderCat[id] = catId(targetId);
    else delete folderCat[id];
    settings.folderCat = folderCat;
    await saveSettings({ folderCat });
  }
  await saveOrder(ids);
}

function bindNavDrag(el, s) {
  if (!s.virtual) {
    el.addEventListener('dragstart', (e) => {
      drag = { kind: 'folder', id: s.id };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', s.title);
      requestAnimationFrame(() => el.classList.add('dragging'));
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      clearMarks();
      drag = null;
    });
  }

  el.addEventListener('dragover', (e) => {
    if (!drag) return;
    if (drag.kind === 'folder' && drag.id !== s.id && !s.virtual) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = el.getBoundingClientRect();
      clearMarks();
      el.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
    } else if (drag.kind === 'link' && drag.parentId !== s.node.id) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearMarks();
      el.classList.add('drop-into');
    }
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drop-before', 'drop-after', 'drop-into');
  });
  el.addEventListener('drop', async (e) => {
    if (!drag) return;
    e.preventDefault();
    if (drag.kind === 'folder') {
      const after = el.classList.contains('drop-after');
      clearMarks();
      await moveFolder(drag.id, s.id, after);
      toast('Sidebar order saved');
    } else if (drag.kind === 'link') {
      clearMarks();
      await chrome.bookmarks.move(drag.id, { parentId: s.node.id });
      toast(`Moved to ${s.title}`);
    }
  });
}

/* ================= page ================= */
function renderPage() {
  closeMenu();
  page.replaceChildren();
  page.classList.toggle('home-mode', !!current?.home && !query);
  page.classList.toggle('settings-mode', !!current?.settings && !query);
  page.classList.toggle('board-mode', !!current?.board && !query);
  $('#homeFab').hidden = !!current?.home && !query;
  if (query) return renderSearch();
  if (current?.home) return renderHome(page, { settings, tree, showMenu, toast, rerender: renderPage });
  if (current?.settings) return renderSettings(page, settingsCtx);
  if (current?.board) return renderBoard(page, boardCtx);
  if (!current) {
    page.append(h('div', { class: 'empty' }, 'No folders under this root. Change the root folder in Settings.'));
    return;
  }
  const s = current;
  const p = folderPrefs(s.id);

  // head
  const title = h('h2', { title: s.virtual ? '' : 'Double-click to rename', onDblclick: () => !s.virtual && renameFolder(s, title) }, s.title);
  page.append(
    h(
      'div',
      { class: 'head' },
      title,
      s.virtual
        ? null
        : h(
            'button',
            { class: 'btn ghost sm icon', 'aria-label': 'Rename folder', title: 'Rename folder', onClick: () => renameFolder(s, title) },
            svgIcon('pencil'),
          ),
      h('span', { class: 'cnt mono muted' }, `${s.all.length} link${s.all.length === 1 ? '' : 's'}`),
      h('button', { class: 'btn primary add', onClick: () => addLink(s) }, '+ Add link'),
      h(
        'button',
        {
          class: 'btn icon sm',
          style: { minHeight: '36px', minWidth: '36px', borderRadius: '8px' },
          'aria-label': 'Folder menu',
          onClick: (e) => folderMenu(e, s),
        },
        svgIcon('more'),
      ),
    ),
  );

  // toolbar
  const sortSel = h(
    'select',
    { 'aria-label': 'Sort', onChange: (e) => setFolderPrefs(s.id, { sort: e.target.value }) },
    ...Object.entries(SORTS).map(([v, l]) => h('option', { value: v, selected: v === p.sort }, l)),
  );
  const fIn = h('input', { type: 'search', placeholder: 'Filter this folder…', value: filterQ, autocomplete: 'off' });
  let t;
  fIn.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      filterQ = fIn.value.trim().toLowerCase();
      renderBody();
    }, 60);
  });
  fIn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fIn.value = '';
      filterQ = '';
      renderBody();
    }
  });
  page.append(
    h(
      'div',
      { class: 'toolbar' },
      h('label', { class: 'search' }, h('span', { class: 'sr' }, 'Filter this folder'), svgIcon('search'), fIn),
      h('label', { class: 'sel' }, 'Sort', sortSel),
      seg(
        'View',
        [
          ['list', 'List'],
          ['matrix', 'Env matrix'],
        ],
        p.view,
        (v) => setFolderPrefs(s.id, { view: v }),
      ),
      seg(
        'Show',
        [
          ['title', 'Title'],
          ['url', 'URL'],
        ],
        p.show,
        (v) => setFolderPrefs(s.id, { show: v }),
      ),
    ),
  );

  const body = h('div', { id: 'body' });
  page.append(body);
  renderBody();
}

function seg(label, opts, val, onPick) {
  return h(
    'span',
    { class: 'seg', role: 'group', 'aria-label': label },
    ...opts.map(([v, l]) => h('button', { class: v === val ? 'on' : '', 'aria-pressed': v === val ? 'true' : 'false', onClick: () => onPick(v) }, l)),
  );
}

function renderBody() {
  const body = $('#body');
  if (!body) return;
  body.replaceChildren();
  const s = current,
    p = folderPrefs(s.id);
  const hasMeta = s.all.some((bm) => linkMeta[bm.id]);
  if (!hasMeta) priF = 'all';
  const priMatch = (bm) => {
    const m = linkMeta[bm.id];
    return priF === 'all' || (priF === 'note' ? !!m?.note : m?.pri === priF);
  };
  const match = (bm) => matchLink(bm, linkMeta[bm.id]?.note, filterQ) && priMatch(bm);
  const links = s.all.filter(match);
  if (hasMeta && p.view !== 'matrix') body.append(priFilter());
  if (!s.all.length && !s.parts.length) body.append(h('div', { class: 'empty' }, 'Empty folder. Add a link or drag one in from another folder.'));
  else if (filtering() && !links.length) body.append(h('div', { class: 'empty' }, 'Nothing matches the filter.'));
  else if (p.view === 'matrix') renderMatrix(body, links, s, p);
  else if (s.parts.length) renderParts(body, s, p, match);
  else renderList(body, links, s, p);
  if (!s.virtual && p.view !== 'matrix') body.append(h('button', { class: 'btn ghost sm newPart', onClick: () => newPart(s) }, svgIcon('plus'), 'New section'));
}

function filtering() {
  return !!filterQ || priF !== 'all';
}

function priFilter() {
  const opts = [['all', 'All'], ...PRIS.map((x) => [x, PRI_NAMES[x]]), ['note', 'Has note']];
  return h(
    'div',
    { class: 'pri-filter', role: 'group', 'aria-label': 'Show' },
    ...opts.map(([v, l]) =>
      h(
        'button',
        {
          class: `chip ${PRIS.includes(v) ? `pri-${v}` : ''} ${priF === v ? 'on' : ''}`,
          'aria-pressed': String(priF === v),
          dataset: { pri: v },
          onClick: () => {
            priF = v;
            renderBody();
          },
        },
        PRIS.includes(v) ? h('span', { class: 'pri-dot' }) : null,
        l,
      ),
    ),
  );
}

function priHeader(g, s, p, last) {
  const key = `pri:${g.pri || 'none'}`;
  const closed = !!p.closed[key];
  const el = h(
    'button',
    {
      class: `grp prig ${g.pri ? `pri-${g.pri}` : 'NONE'} ${closed ? 'closed' : ''}`,
      'aria-expanded': closed ? 'false' : 'true',
      dataset: { pri: g.pri || 'none' },
      onClick: () => setFolderPrefs(s.id, { closed: { ...p.closed, [key]: !closed } }),
    },
    svgIcon('chevron'),
    g.pri ? PRI_NAMES[g.pri] : 'Other',
    h('span', { class: 'line' }),
    String(g.links.length),
  );
  el.querySelector('svg').classList.add('chev');
  el.addEventListener('dragover', (e) => {
    if (drag?.kind !== 'link' || (linkMeta[drag.id]?.pri || null) === g.pri) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearMarks();
    el.classList.add('drop-into');
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drop-into');
  });
  el.addEventListener('drop', async (e) => {
    if (drag?.kind !== 'link') return;
    e.preventDefault();
    clearMarks();
    const id = drag.id;
    if (p.sort === 'manual' && last && last.id !== id) await chrome.bookmarks.move(id, { parentId: last.parentId, index: last.index + 1 });
    await setPri(id, g.pri);
  });
  return el;
}

async function setPri(id, pri) {
  linkMeta = await setLinkMeta(id, { ...linkMeta[id], pri });
  renderBody();
}

function renderParts(body, s, p, match) {
  const list = h('div', { class: 'list' });
  const groups = [...s.parts, { id: `none:${s.id}`, title: 'No section', node: s.node, links: s.links, none: true }];
  for (const g of groups) {
    const links = g.links.filter(match);
    if (filtering() && !links.length) continue;
    const closed = !!p.closed[g.id];
    list.append(partHeader(g, s, p, closed, links.length));
    if (!closed) priFirst(sortLinks(links, p.sort, settings.envRules), linkMeta).forEach((bm) => list.append(renderRow(bm, s, p)));
  }
  body.append(list);
  if (p.sort !== 'manual')
    body.append(h('div', { class: 'subnote' }, 'Reordering by drag is only available in Manual sort. Dragging onto a section header still moves the link.'));
}

function partHeader(g, s, p, closed, count) {
  const chev = svgIcon('chevron');
  chev.classList.add('chev');
  const color = !g.none && settings.partColors[g.id];
  const el = h(
    'div',
    {
      class: `grp part ${closed ? 'closed' : ''} ${g.none ? 'NONE' : ''}`,
      dataset: color ? { color } : null,
      draggable: !g.none,
      title: g.none ? null : 'Drag to reorder sections',
    },
    h(
      'button',
      { class: 'part-toggle', 'aria-expanded': String(!closed), onClick: () => setFolderPrefs(s.id, { closed: { ...p.closed, [g.id]: !closed } }) },
      chev,
      color ? h('span', { class: 'dot' }) : null,
      g.title,
    ),
    h('span', { class: 'line' }),
    h('span', {}, String(count)),
    g.none
      ? h('span', { class: 'slot' })
      : h(
          'button',
          {
            class: 'more',
            'aria-label': `Section menu for ${g.title}`,
            title: 'More',
            onClick: (e) => {
              e.stopPropagation();
              partMenu(e, g, s);
            },
          },
          svgIcon('more'),
        ),
  );
  if (!g.none) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      partMenu(e, g, s);
    });
    headerDrag(el, 'part', g.id, (from, after) => chrome.bookmarks.move(from, { parentId: s.id, index: g.node.index + (after ? 1 : 0) }));
  }
  el.addEventListener('dragover', (e) => {
    if (drag?.kind !== 'link' || drag.parentId === g.node.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearMarks();
    el.classList.add('drop-into');
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drop-into');
  });
  el.addEventListener('drop', async (e) => {
    if (drag?.kind !== 'link') return;
    e.preventDefault();
    clearMarks();
    await chrome.bookmarks.move(drag.id, { parentId: g.node.id });
    toast(`Moved to ${g.title}`);
  });
  return el;
}

function partMenu(e, g, s) {
  const i = s.parts.indexOf(g);
  showMenu(e, [
    {
      swatches: true,
      value: settings.partColors[g.id] || null,
      pick: async (color) => {
        const partColors = { ...settings.partColors };
        if (color) partColors[g.id] = color;
        else delete partColors[g.id];
        settings.partColors = partColors;
        await saveSettings({ partColors });
        renderBody();
      },
    },
    '-',
    {
      label: 'Rename section',
      icon: 'pencil',
      run: async () => {
        const title = prompt('Section name', g.title)?.trim();
        if (title && title !== g.title) await chrome.bookmarks.update(g.id, { title });
      },
    },
    ...(i > 0 ? [{ label: 'Move up', run: () => chrome.bookmarks.move(g.id, { parentId: s.id, index: s.parts[i - 1].node.index }) }] : []),
    ...(i < s.parts.length - 1
      ? [{ label: 'Move down', run: () => chrome.bookmarks.move(g.id, { parentId: s.id, index: s.parts[i + 1].node.index + 1 }) }]
      : []),
    '-',
    {
      label: 'Delete section…',
      icon: 'x',
      danger: true,
      run: async () => {
        if (!confirm(`Delete section "${g.title}"? Its ${g.links.length} ${g.links.length === 1 ? 'link moves' : 'links move'} to No section.`)) return;
        for (const c of g.node.children || []) await chrome.bookmarks.move(c.id, { parentId: s.id });
        await chrome.bookmarks.remove(g.id);
        toast(`Section "${g.title}" deleted`);
      },
    },
  ]);
}

async function newPart(s) {
  const title = prompt('Section name')?.trim();
  if (!title) return;
  await chrome.bookmarks.create({ parentId: s.id, title });
}

/* ---------- list view ---------- */
function renderList(body, links, s, p) {
  const list = h('div', { class: 'list' });
  const sorted = priFirst(sortLinks(links, p.sort, settings.envRules), linkMeta);
  const pris = p.sort === 'env' ? [] : priGroups(sorted, linkMeta);
  if (pris.some((g) => g.pri)) {
    list.dataset.pri = 'groups';
    for (const g of pris) {
      const hdr = priHeader(g, s, p, g.links.at(-1));
      list.append(hdr);
      if (hdr.getAttribute('aria-expanded') === 'true') g.links.forEach((bm) => list.append(renderRow(bm, s, p)));
    }
  } else if (p.sort === 'env') {
    const groups = {};
    for (const bm of sorted) {
      const e = detectEnv(bm, settings.envRules) || 'NONE';
      (groups[e] ||= []).push(bm);
    }
    for (const e of [...ENVS, 'NONE']) {
      const g = groups[e];
      if (!g) continue;
      const closed = !!p.closed[e];
      const hdr = h(
        'button',
        {
          class: `grp ${e} ${closed ? 'closed' : ''}`,
          'aria-expanded': closed ? 'false' : 'true',
          onClick: () => setFolderPrefs(s.id, { closed: { ...p.closed, [e]: !closed } }),
        },
        svgIcon('chevron'),
        e === 'NONE' ? 'NO ENV' : e,
        h('span', { class: 'line' }),
        String(g.length),
      );
      hdr.querySelector('svg').classList.add('chev');
      list.append(hdr);
      if (!closed) g.forEach((bm) => list.append(renderRow(bm, s, p)));
    }
  } else sorted.forEach((bm) => list.append(renderRow(bm, s, p)));
  body.append(list);
  if (p.sort !== 'manual')
    body.append(h('div', { class: 'subnote' }, 'Reordering by drag is only available in Manual sort. Dragging to a sidebar folder still moves the link.'));
}

function renderRow(bm, s, p, { crumb = null, q = filterQ } = {}) {
  const env = detectEnv(bm, settings.envRules);
  const dup = sameAsUrl(bm.title, bm.url);
  const meta = linkMeta[bm.id];
  const row = h('a', {
    class: `row ${p.show === 'url' ? 'url-mode' : ''} ${meta?.pri ? `pri-${meta.pri}` : ''}`,
    href: bm.url,
    target: '_blank',
    rel: 'noopener',
    draggable: true,
    dataset: { id: bm.id },
  });
  if (meta?.pri)
    row.append(h('span', { class: 'pri-bar', title: `${PRI_NAMES[meta.pri]} priority` }, h('span', { class: 'sr' }, `${PRI_NAMES[meta.pri]} priority`)));
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
  if (env) row.append(h('span', { class: `badge ${env}` }, env));
  else if (isGithub(bm.url)) row.append(h('span', { class: 'badge GH' }, 'GH'));
  row.append(
    h(
      'span',
      { class: 'acts' },
      h(
        'button',
        {
          class: 'act',
          'aria-label': 'Edit title and URL',
          title: 'Edit title / URL',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            startEdit(bm, row);
          },
        },
        svgIcon('pencil'),
      ),
      h(
        'button',
        {
          class: 'act del',
          'aria-label': 'Delete link',
          title: 'Delete',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteBookmark(bm);
          },
        },
        svgIcon('trash'),
      ),
      h(
        'button',
        {
          class: 'act more',
          'aria-label': 'Link menu',
          title: 'More',
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            linkMenu(e, bm, row);
          },
        },
        svgIcon('more'),
      ),
    ),
  );
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    linkMenu(e, bm, row);
  });
  row.addEventListener('dblclick', (e) => {
    e.preventDefault();
    startEdit(bm, row);
  });
  row.addEventListener('click', (e) => {
    if (e.target.closest('.grip')) e.preventDefault();
  });
  bindRowDrag(row, bm, s, p);
  return row;
}

/* ---------- matrix view ---------- */
function renderMatrix(body, links, s, p) {
  const { rows, rest } = buildMatrix(links, settings.envRules);
  if (!rows.length) {
    body.append(
      h(
        'div',
        { class: 'empty' },
        'No link in this folder has a detectable environment, so there is nothing to lay out as a matrix. Use List view or add env rules in Settings.',
      ),
    );
    return;
  }
  const colors = { PROD: 'var(--prod-fg)', TEST: 'var(--test-fg)', STAGE: 'var(--stage-fg)', LOCAL: 'var(--local-fg)' };
  const table = h(
    'table',
    {},
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', {}, 'Resource (path)'),
        ...ENVS.map((e) => h('th', { class: 'env' }, h('span', { class: 'dot', style: { background: colors[e] } }), e)),
        h('th', {}),
      ),
    ),
  );
  const tb = h('tbody');
  for (const r of rows) {
    const any = ENVS.map((e) => r.cells[e][0]).find(Boolean);
    const tr = h(
      'tr',
      {},
      h(
        'td',
        {},
        h(
          'div',
          { class: 'res' },
          h('b', {}, r.key),
          any && !sameAsUrl(any.title, any.url) ? h('span', { class: 'muted', style: { fontSize: '11px' } }, any.title) : null,
        ),
      ),
    );
    for (const e of ENVS) {
      const cell = h('div', { class: 'cell' });
      if (r.cells[e].length) {
        for (const bm of r.cells[e]) {
          const q = pathKey(bm.url).includes('?') ? '?' + pathKey(bm.url).split('?')[1] : '';
          cell.append(h('a', { class: `pill ${e}`, href: bm.url, target: '_blank', rel: 'noopener', title: bm.url }, h('span', {}, q ? `open ${q}` : 'open')));
        }
      } else {
        const d = any && deriveUrl(any.url, e, settings.hostMap);
        if (d)
          cell.append(
            h(
              'button',
              { class: 'pill derive', title: `${d}\nClick: open · Alt+click: save as bookmark here`, onClick: (ev) => deriveClick(ev, d, any, s) },
              '+ derive',
            ),
          );
        else cell.append(h('span', { class: 'pill none' }, '—'));
      }
      tr.append(h('td', {}, cell));
    }
    tr.append(
      h(
        'td',
        {},
        h('div', { class: 'cell' }, h('button', { class: 'btn ghost sm icon', 'aria-label': 'Row menu', onClick: (e) => rowMenu(e, r, s) }, svgIcon('more'))),
      ),
    );
    tb.append(tr);
  }
  table.append(tb);
  body.append(h('div', { class: 'matrix' }, table));
  body.append(
    h(
      'div',
      { class: 'matrix-note' },
      h('span', { class: 'pill derive', style: { minHeight: '26px' } }, '+ derive'),
      'same path on another host. Click opens; Alt+click saves it as a bookmark in this folder. Hosts are mapped in Settings.',
    ),
  );
  if (rest.length) {
    body.append(h('div', { class: 'grp NONE' }, 'NO ENV', h('span', { class: 'line' }), String(rest.length)));
    const list = h('div', { class: 'list' });
    sortLinks(rest, p.sort, settings.envRules).forEach((bm) => list.append(renderRow(bm, s, p)));
    body.append(list);
  }
}

async function deriveClick(ev, url, from, s) {
  ev.preventDefault();
  if (ev.altKey) {
    await chrome.bookmarks.create({ parentId: s.node.id, title: sameAsUrl(from.title, from.url) ? displayUrl(url) : from.title, url });
    toast('Derived link saved');
  } else chrome.tabs.create({ url });
}

function rowMenu(e, r, s) {
  const all = ENVS.flatMap((env) => r.cells[env]);
  const any = all[0];
  const missing = ENVS.filter((env) => !r.cells[env].length)
    .map((env) => ({ env, url: any && deriveUrl(any.url, env, settings.hostMap) }))
    .filter((x) => x.url);
  showMenu(e, [
    { label: `Open all (${all.length})`, icon: 'external', run: () => all.forEach((bm) => chrome.tabs.create({ url: bm.url, active: false })) },
    { label: 'Copy path', icon: 'copy', run: () => navigator.clipboard.writeText(r.key).then(() => toast('Path copied')) },
    ...(missing.length
      ? [
          '-',
          {
            label: `Save derived links (${missing.map((m) => m.env).join(', ')})`,
            icon: 'save',
            run: async () => {
              for (const m of missing) await chrome.bookmarks.create({ parentId: s.node.id, title: displayUrl(m.url), url: m.url });
              toast(`${missing.length} link${missing.length > 1 ? 's' : ''} saved`);
            },
          },
        ]
      : []),
  ]);
}

/* ---------- global search ---------- */
function renderSearch() {
  const hits = searchLinks(secs, query, linkMeta, settings.envRules);
  page.append(
    h(
      'div',
      { class: 'head' },
      h('h2', {}, 'Search'),
      h('span', { class: 'cnt mono muted' }, `${hits.length} result${hits.length === 1 ? '' : 's'} for “${query}”`),
      h(
        'button',
        {
          class: 'btn add',
          onClick: () => {
            qInput.value = '';
            query = '';
            renderPage();
          },
        },
        'Clear',
      ),
    ),
  );
  if (!hits.length) {
    page.append(h('div', { class: 'empty' }, 'Nothing matches. Try part of an ID or host.'));
    return;
  }
  const list = h('div', { class: 'list' });
  for (const { bm, s, crumb } of hits.slice(0, 300)) list.append(renderRow(bm, s, { ...folderPrefs(s.id), sort: 'manual' }, { crumb, q: query }));
  page.append(list);
}

/* ================= drag & drop (rows) ================= */
function bindRowDrag(row, bm, s, p) {
  row.addEventListener('dragstart', (e) => {
    if (editingId) {
      e.preventDefault();
      return;
    }
    drag = { kind: 'link', id: bm.id, parentId: bm.parentId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bm.url);
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    clearMarks();
    drag = null;
  });
  row.addEventListener('dragover', (e) => {
    if (!drag || drag.kind !== 'link' || drag.id === bm.id || p.sort !== 'manual') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = row.getBoundingClientRect();
    clearMarks();
    row.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
  });
  row.addEventListener('drop', async (e) => {
    if (!drag || drag.kind !== 'link' || drag.id === bm.id) return;
    e.preventDefault();
    e.stopPropagation();
    const after = row.classList.contains('drop-after');
    const id = drag.id;
    clearMarks();
    await chrome.bookmarks.move(id, { parentId: bm.parentId, index: bm.index + (after ? 1 : 0) });
    const pri = linkMeta[bm.id]?.pri || null;
    if (row.closest('.list')?.dataset.pri === 'groups' && (linkMeta[id]?.pri || null) !== pri) await setPri(id, pri);
  });
}

function clearMarks() {
  document.querySelectorAll('.drop-before, .drop-after, .drop-into').forEach((n) => n.classList.remove('drop-before', 'drop-after', 'drop-into'));
}

/* ================= inline edit / add / rename ================= */
function startEdit(bm, row, focusNote = false) {
  if (editingId) return;
  editingId = bm.id;
  const meta = linkMeta[bm.id] || {};
  let pri = meta.pri || null;
  const titleIn = h('input', { type: 'text', value: bm.title || '' });
  const urlIn = h('input', { type: 'url', class: 'url-in', value: bm.url || '' });
  const noteIn = h('textarea', { class: 'note-in', rows: '2', maxlength: String(NOTE_MAX), placeholder: 'Why you saved it, what to check…' });
  noteIn.value = meta.note || '';
  const form = h(
    'form',
    { class: 'edit', novalidate: true },
    h('label', {}, 'Title', titleIn),
    h('label', {}, 'URL', urlIn),
    h(
      'div',
      { class: 'edit-pri' },
      'Priority',
      priPicker(pri, (v) => (pri = v)),
    ),
    h('label', {}, 'Note', noteIn),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'btn sm primary', type: 'submit' }, 'Save'),
      h(
        'button',
        {
          class: 'btn sm',
          type: 'button',
          onClick: () => {
            editingId = null;
            renderBody();
          },
        },
        'Cancel',
      ),
    ),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = urlIn.value.trim();
    if (url && !/^[a-z]+:/i.test(url)) url = 'https://' + url;
    editingId = null;
    try {
      await chrome.bookmarks.update(bm.id, { title: titleIn.value.trim(), url });
      linkMeta = await setLinkMeta(bm.id, { pri, note: noteIn.value });
      renderBody();
      toast('Saved');
    } catch (err) {
      toast(`Couldn't save: ${err.message}`);
      renderBody();
    }
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      editingId = null;
      renderBody();
    }
  });
  form.addEventListener('click', (e) => e.stopPropagation());
  row.draggable = false;
  row.removeAttribute('href');
  row.querySelector('.txt').replaceWith(form);
  row.querySelector('.acts')?.remove();
  row.querySelector('.pri-bar')?.remove();
  const first = focusNote ? noteIn : titleIn;
  first.focus();
  first.select();
}

function addLink(s) {
  if (editingId) return;
  const body = $('#body');
  if (!body) return;
  const titleIn = h('input', { type: 'text', placeholder: 'Title (optional)' });
  const urlIn = h('input', { type: 'url', class: 'url-in', placeholder: 'https://…' });
  const form = h(
    'form',
    { class: 'edit', novalidate: true, style: { padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px', marginBottom: '8px' } },
    h('label', {}, 'Title', titleIn),
    h('label', {}, 'URL', urlIn),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'btn sm primary', type: 'submit' }, 'Add'),
      h(
        'button',
        {
          class: 'btn sm',
          type: 'button',
          onClick: () => {
            editingId = null;
            form.remove();
          },
        },
        'Cancel',
      ),
    ),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = urlIn.value.trim();
    if (!url) {
      urlIn.focus();
      return;
    }
    if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
    editingId = null;
    await chrome.bookmarks.create({ parentId: s.node.id, title: titleIn.value.trim() || displayUrl(url), url });
    toast('Added');
  });
  editingId = 'new';
  body.prepend(form);
  urlIn.focus();
}

function renameFolder(s, h2) {
  const input = h('input', { type: 'text', value: s.title });
  h2.replaceChildren(input);
  input.focus();
  input.select();
  const commit = async () => {
    const t = input.value.trim();
    if (t && t !== s.title) await chrome.bookmarks.update(s.id, { title: t });
    else renderPage();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      input.value = s.title;
      input.blur();
    }
  });
}

async function newFolder() {
  const title = prompt('Folder name');
  if (!title) return;
  const f = await chrome.bookmarks.create({ parentId: root.id, title });
  settings.lastFolder = f.id;
  await saveSettings({ lastFolder: f.id });
}

/* ================= menus ================= */
function showMenu(e, items) {
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
          ...[null, ...COLORS].map((c) =>
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
function closeMenu() {
  document.removeEventListener('click', closeMenu);
  openMenu?.remove();
  openMenu = null;
}

function linkMenu(e, bm, row) {
  const env = detectEnv(bm, settings.envRules);
  const derived = ENVS.filter((x) => x !== env)
    .map((x) => ({ env: x, url: deriveUrl(bm.url, x, settings.hostMap) }))
    .filter((x) => x.url);
  const inCurrent = !query && current && !current.virtual && current.parts.length && current.all.some((x) => x.id === bm.id);
  const targets = inCurrent ? [...current.parts, { title: 'No section', node: current.node }].filter((g) => g.node.id !== bm.parentId) : [];
  showMenu(e, [
    { label: 'Open in new tab', icon: 'external', run: () => chrome.tabs.create({ url: bm.url }) },
    { label: 'Copy URL', icon: 'copy', run: () => navigator.clipboard.writeText(bm.url).then(() => toast('URL copied')) },
    { label: 'Edit title / URL', icon: 'pencil', run: () => startEdit(bm, row) },
    { label: linkMeta[bm.id]?.note ? 'Edit note' : 'Add note', icon: 'note', run: () => startEdit(bm, row, true) },
    '-',
    ...[...PRIS, null]
      .filter((x) => x !== (linkMeta[bm.id]?.pri || null))
      .map((x) => ({ label: x ? `Mark as ${PRI_NAMES[x]}` : 'Clear priority', run: () => setPri(bm.id, x) })),
    ...(derived.length ? ['-', ...derived.map((d) => ({ label: `Open on ${d.env}`, icon: 'external', run: () => chrome.tabs.create({ url: d.url }) }))] : []),
    ...(targets.length
      ? ['-', ...targets.map((g) => ({ label: `Move to ${g.title}`, run: () => chrome.bookmarks.move(bm.id, { parentId: g.node.id }) }))]
      : []),
    '-',
    { label: 'Delete', icon: 'x', danger: true, run: () => deleteBookmark(bm) },
  ]);
}

function folderMenu(e, s) {
  showMenu(e, [
    { label: `Open all (${s.all.length})`, icon: 'external', run: () => s.all.forEach((l) => chrome.tabs.create({ url: l.url, active: false })) },
    {
      label: 'Copy all URLs',
      icon: 'copy',
      run: () => navigator.clipboard.writeText(s.all.map((l) => l.url).join('\n')).then(() => toast(`${s.all.length} URLs copied`)),
    },
    ...(s.virtual
      ? []
      : [
          {
            label: 'Rename folder',
            icon: 'pencil',
            run: () => {
              if (current?.id !== s.id) {
                select(s);
              }
              setTimeout(() => {
                const h2 = page.querySelector('.head h2');
                if (h2) renameFolder(s, h2);
              });
            },
          },
          { label: 'New section', icon: 'plus', run: () => newPart(s) },
          {
            label: 'Move to top',
            run: () => {
              const ids = secs
                .filter((x) => !x.virtual)
                .map((x) => x.id)
                .filter((id) => id !== s.id);
              ids.unshift(s.id);
              saveOrder(ids);
            },
          },
          ...(settings.categories.length
            ? [
                '-',
                ...settings.categories.filter((c) => c.id !== catId(s.id)).map((c) => ({ label: `Move to ${c.name}`, run: () => moveToCategory(s, c.id) })),
                ...(catId(s.id) ? [{ label: 'Remove from category', run: () => moveToCategory(s, null) }] : []),
              ]
            : []),
          '-',
          {
            label: 'Delete folder…',
            icon: 'x',
            danger: true,
            run: async () => {
              if (confirm(`Delete "${s.title}" and its ${s.all.length} links?`)) {
                await chrome.bookmarks.removeTree(s.id);
                toast('Folder deleted');
              }
            },
          },
        ]),
  ]);
}

function deleteBookmark(bm) {
  return deleteBookmarks([bm], `Deleted “${bm.title || displayUrl(bm.url)}”`);
}

async function deleteBookmarks(bms, msg) {
  const gone = bms.map((bm) => ({ bm, meta: linkMeta[bm.id] }));
  for (const { bm, meta } of gone) {
    await chrome.bookmarks.remove(bm.id);
    if (meta) linkMeta = await setLinkMeta(bm.id, null);
  }
  toast(msg, {
    label: 'Undo',
    run: async () => {
      for (const { bm, meta } of [...gone].sort((a, b) => a.bm.index - b.bm.index)) {
        const back = await chrome.bookmarks.create({ parentId: bm.parentId, index: bm.index, title: bm.title, url: bm.url });
        if (meta) linkMeta = await setLinkMeta(back.id, meta);
      }
    },
  });
}

let toastEl = null,
  toastTimer = null;
function toast(msg, action) {
  toastEl?.remove();
  clearTimeout(toastTimer);
  toastEl = h(
    'div',
    { class: 'toast', role: 'status' },
    msg,
    action
      ? h(
          'button',
          {
            onClick: () => {
              action.run();
              toastEl.remove();
            },
          },
          action.label,
        )
      : null,
  );
  document.body.append(toastEl);
  toastTimer = setTimeout(() => toastEl?.remove(), action ? 8000 : 2500);
}

/* ================= settings ================= */
const settingsCtx = {
  get settings() {
    return settings;
  },
  get tree() {
    return tree;
  },
  get root() {
    return root;
  },
  get secs() {
    return secs;
  },
  save: (patch) =>
    (saveQueue = saveQueue.then(async () => {
      settings = await saveSettings(patch);
    })),
  toast,
  refresh,
  removeLinks: (bms) => deleteBookmarks(bms, bms.length === 1 ? 'Deleted 1 copy' : `Deleted ${bms.length} copies`),
  async reload() {
    settings = await loadSettings();
    applyTheme(settings.theme);
    applySideLook(settings.sideLook);
    applyFontSize(settings);
    await refresh();
  },
  async resetOrder() {
    await settingsCtx.save({ order: [] });
    secs = sections(root, [], [settings.home.folderId]);
    renderNav();
    toast('Sidebar order reset to bookmark order');
  },
  applySideLook: (look) => applySideLook(look),
  applyFontSize: (s) => applyFontSize(s),
  renderBrand: () => renderBrand(),
  onBgChange: () => applySideLook(settings.sideLook),
  done: () => closeSettings(),
};

const paletteCtx = {
  get secs() {
    return secs;
  },
  get settings() {
    return settings;
  },
  get linkMeta() {
    return linkMeta;
  },
  openUrl(url, bg) {
    if (bg) {
      chrome.tabs.create({ url, active: false });
      toast('Opened in a background tab');
    } else chrome.tabs.update({ url });
  },
  go(where) {
    if (query) clearQuery();
    select(where === 'board' ? BOARD : HOME);
  },
  select(s) {
    if (query) clearQuery();
    select(s);
  },
  openSettings(key) {
    setSettingsTab(key);
    if (current?.settings && !query) renderPage();
    else openSettings();
  },
};

const boardCtx = {
  get settings() {
    return settings;
  },
  get secs() {
    return secs;
  },
  get drag() {
    return drag;
  },
  set drag(v) {
    drag = v;
  },
  get filter() {
    return filterQ;
  },
  set filter(v) {
    filterQ = v;
  },
  groups: () => groups(),
  folderPrefs: (id) => folderPrefs(id),
  select: (s) => select(s),
  folderMenu: (e, s) => folderMenu(e, s),
  deleteLink: (bm) => deleteBookmark(bm),
  async moveFolder(id, targetId, after) {
    await moveFolder(id, targetId, after);
    renderPage();
  },
  async setBoard(patch) {
    settings.board = { ...settings.board, ...patch };
    await saveSettings({ board: settings.board });
    renderPage();
  },
  clearMarks: () => clearMarks(),
  toast,
};

function openSettings() {
  if (current?.settings && !query) return closeSettings();
  if (query) {
    qInput.value = '';
    query = '';
  }
  if (!current?.settings) beforeSettings = current;
  current = SETTINGS;
  renderNav();
  renderPage();
  page.querySelector('.set-top h2')?.focus({ preventScroll: true });
}

function closeSettings() {
  current = (beforeSettings?.home ? HOME : beforeSettings?.board ? BOARD : secs.find((s) => s.id === beforeSettings?.id)) || HOME;
  beforeSettings = null;
  renderNav();
  renderPage();
  $('#settingsBtn').focus({ preventScroll: true });
}

function applySideLook(look) {
  for (const [k, v] of Object.entries(sideLookVars(look, homeBgUrl()))) document.documentElement.style.setProperty(k, v);
}

function applyFontSize(s) {
  const root = document.documentElement.style;
  root.setProperty('--fs-side', String(clampFont(s.fontSide) / 100));
  root.setProperty('--fs-page', String(clampFont(s.fontPage) / 100));
  root.setProperty('--fs-board', String(clampFont(s.fontBoard) / 100));
}

/* ================= global ================= */
function bindGlobal() {
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#newFolderBtn').addEventListener('click', newFolder);
  $('#newCatBtn').addEventListener('click', newCategory);
  let t;
  qInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      query = qInput.value.trim().toLowerCase();
      renderPage();
    }, 80);
  });
  qInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      qInput.value = '';
      query = '';
      renderPage();
      qInput.blur();
    }
    if (e.key === 'Enter') {
      const first = page.querySelector('.row[href]');
      if (first) chrome.tabs.create({ url: first.href });
    }
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      current?.settings &&
      !query &&
      !openMenu &&
      !e.target.closest?.('textarea, input[type=text], input[type=search], input:not([type]), select')
    ) {
      e.preventDefault();
      closeSettings();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      closeMenu();
      openPalette(paletteCtx);
      return;
    }
    if (e.key === '/' && document.activeElement === document.body) {
      e.preventDefault();
      qInput.focus();
    }
    // j/k to move between sidebar folders when nothing is focused
    if (document.activeElement === document.body && (e.key === 'j' || e.key === 'k') && current) {
      const list = navOrder();
      const i = list.indexOf(current);
      const n = i < 0 ? list[0] : list[i + (e.key === 'j' ? 1 : -1)];
      if (n) select(n);
    }
  });
  let refreshTimer;
  for (const ev of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered']) {
    chrome.bookmarks[ev].addListener(() => {
      editingId = null;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, 30);
    });
  }
  let stale = false;
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.settings) settings = { ...settings, ...ch.settings.newValue };
    if (ch.linkMeta) {
      linkMeta = ch.linkMeta.newValue || {};
      if (!editingId && !document.hidden) {
        if (query) renderPage();
        else if (current && !current.home && !current.settings && !current.board) renderBody();
      }
    }
    if (document.hidden) stale = true;
  });
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !stale) return;
    stale = false;
    await loadHomeAssets();
    setSideWidth(settings.sideWidth);
    await settingsCtx.reload();
  });
}

function setSideWidth(w) {
  const px = clampSideWidth(w);
  document.documentElement.style.setProperty('--side-w', `${px}px`);
  const r = $('#resizer');
  if (r) r.setAttribute('aria-valuenow', String(px));
  return px;
}

function bindResizer() {
  const r = $('#resizer');
  const side = $('.side');
  r.setAttribute('aria-valuemin', String(SIDE_WIDTH.min));
  r.setAttribute('aria-valuemax', String(SIDE_WIDTH.max));
  setSideWidth(settings.sideWidth);
  const persist = (px) => {
    settings.sideWidth = px;
    saveSettings({ sideWidth: px });
  };
  r.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      r.setPointerCapture(e.pointerId);
    } catch {}
    document.body.classList.add('resizing');
    const x0 = e.clientX,
      w0 = side.getBoundingClientRect().width;
    let raf = 0,
      next = w0;
    const move = (ev) => {
      next = w0 + ev.clientX - x0;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          setSideWidth(next);
        });
    };
    const up = () => {
      r.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
      document.body.classList.remove('resizing');
      persist(setSideWidth(next));
    };
    r.addEventListener('pointermove', move);
    r.addEventListener('pointerup', up, { once: true });
    r.addEventListener('pointercancel', up, { once: true });
  });
  r.addEventListener('dblclick', () => persist(setSideWidth(SIDE_WIDTH.initial)));
  let keyTimer;
  r.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const px = setSideWidth(side.getBoundingClientRect().width + (e.key === 'ArrowLeft' ? -16 : 16));
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => persist(px), 300);
  });
}

boot();
