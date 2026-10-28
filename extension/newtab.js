import { loadSettings, saveSettings, loadLinkMeta, onStorageChange } from './services/storage.js';
import { getTree, onBookmarksChanged } from './services/bookmarks.js';
import { openTab, currentTabId } from './services/tabs.js';
import { onMessage } from './services/runtime.js';
import { resolveRoot, sections, findById } from './domain/tree.js';
import { navOrder, stepNav, findView } from './domain/folders.js';
import { isPaletteRequest, isPaletteGo, paletteGoTarget } from './domain/palette.js';
import { dayKey, sweptText } from './domain/today.js';
import { HOME, SETTINGS, BOARD, SCHEDULE, PAGES } from './constants/pages.js';
import { h } from './ui/dom.js';
import { applyTheme, applySideLook, applyFontSize } from './ui/theme.js';
import { showMenu, closeMenu, menuOpen } from './ui/menu.js';
import { toast } from './ui/toast.js';
import { clearMarks } from './ui/dnd.js';
import { state, setState, clearQuery } from './state/page-state.js';
import { folderPrefs, saveFolderPrefs, moveFolder, pruneMarks, queueSave } from './state/folders.js';
import { pruneLinkMeta, sweepDoneLinks } from './state/links.js';
import { paintIcons, renderBrand, renderTodayCount } from './views/sidebar/header.js';
import { renderNav as drawNav, bindNavDrag, newFolder } from './views/sidebar/nav.js';
import { newCategory } from './views/sidebar/categories.js';
import { setSideWidth, bindResizer } from './views/sidebar/resizer.js';
import { ensureHomeFolder } from './services/home-folder.js';
import { loadHomeAssets, homeBgUrl } from './state/home-assets.js';
import { renderHome, renderUpNext } from './views/home/home.js';

const $ = (s) => document.querySelector(s);
const page = $('#page');
const qInput = $('#q');

const LOADERS = {
  folder: () =>
    Promise.all([
      import('./views/folder/page.js'),
      import('./views/folder/body.js'),
      import('./views/folder/row.js'),
      import('./views/folder/menus.js'),
      import('./views/folder/actions.js'),
    ]).then((mods) => Object.assign({}, ...mods)),
  search: () => import('./views/search/search.js'),
  schedule: () => import('./views/schedule/schedule.js'),
  settings: () => import('./views/settings/index.js'),
  board: () => import('./views/board/board.js'),
};
const views = {};
const loading = {};
let day = '';

function load(key) {
  loading[key] ||= LOADERS[key]().then((mod) => (views[key] = mod));
  return loading[key];
}

function viewsFor({ current, query }) {
  if (query) return ['folder', 'search'];
  if (current?.home) return [];
  if (current?.settings) return ['settings'];
  if (current?.board) return ['board'];
  if (current?.schedule) return ['folder', 'schedule'];
  return current ? ['folder'] : [];
}

const ctx = {
  select: (s) => select(s),
  renderNav: () => drawNav(ctx),
  renderPage: () => renderPage(),
  folderMenu: (e, s) => load('folder').then((m) => m.folderMenu(ctx, e, s)),
  renderRow: (bm, s, p, opts) => views.folder.renderRow(ctx, bm, s, p, opts),
  async setFolderPrefs(id, patch) {
    await saveFolderPrefs(id, patch);
    renderPage();
  },
  clearSearch() {
    clearQuery(qInput);
    renderPage();
  },
};
const renderNav = ctx.renderNav;

paintIcons();

async function boot() {
  setState({ settings: await loadSettings() });
  applyTheme(state.settings.theme);
  setSideWidth(state.settings.sideWidth);
  await loadHomeAssets();
  applySideLook(state.settings.sideLook, homeBgUrl());
  applyFontSize(state.settings);
  setState({ linkMeta: await loadLinkMeta(), current: HOME });
  await refresh();
  bindGlobal();
  bindPaletteCommand();
  bindHomeButtons();
  bindResizer();
  const q0 = new URLSearchParams(location.search).get('q')?.trim();
  if (q0) {
    qInput.value = q0;
    setState({ query: q0.toLowerCase() });
    renderPage();
  }
}

async function refresh() {
  let tree = await getTree();
  if (!findById(tree, state.settings.home.folderId)) {
    setState({ settings: (await ensureHomeFolder(tree, state.settings)).settings });
    tree = await getTree();
  }
  const secsOf = (root) => sections(root, state.settings.order, [state.settings.home.folderId]);
  day = document.hidden ? '' : dayKey();
  const swept = day ? await sweepDoneLinks(secsOf(resolveRoot(tree, state.settings))) : null;
  if (swept) tree = await getTree();
  const root = resolveRoot(tree, state.settings);
  setState({ tree, root, secs: secsOf(root) });
  await pruneLinkMeta();
  await pruneMarks();
  renderBrand();
  const { current } = state;
  setState({ current: current?.settings ? SETTINGS : findView(current?.id, PAGES, state.secs) || HOME });
  renderNav();
  renderPage();
  renderTodayCount();
  if (swept) toast(sweptText(swept.n), { label: 'Undo', run: swept.undo });
}

function bindHomeButtons() {
  const btn = $('#homeBtn');
  btn.addEventListener('click', () => {
    select(HOME);
  });
  bindNavDrag(ctx, btn, {
    ...HOME,
    virtual: true,
    get node() {
      return { id: state.settings.home.folderId };
    },
  });
  $('#boardBtn').addEventListener('click', () => {
    select(BOARD);
  });
  $('#scheduleBtn').addEventListener('click', () => {
    select(SCHEDULE);
  });
  $('#homeFab').addEventListener('click', () => {
    select(HOME);
  });
}

async function select(s) {
  if (state.query) clearQuery(qInput);
  setState({ current: s, filterQ: '', priF: 'all' });
  state.settings.lastFolder = s.id;
  saveSettings({ lastFolder: s.id });
  renderNav();
  renderPage();
}

function renderPage() {
  const missing = viewsFor(state).filter((key) => !views[key]);
  if (missing.length) return Promise.all(missing.map(load)).then(renderPage);
  const { current, query } = state;
  closeMenu();
  if (state.navSearch !== !!query) renderNav();
  page.replaceChildren();
  page.classList.toggle('home-mode', !!current?.home && !query);
  page.classList.toggle('settings-mode', !!current?.settings && !query);
  page.classList.toggle('board-mode', !!current?.board && !query);
  $('#homeFab').hidden = !!current?.home && !query;
  if (query) return views.search.renderSearch(page, ctx);
  if (current?.home) return renderHome(page, { settings: state.settings, tree: state.tree, showMenu, toast, rerender: renderPage });
  if (current?.settings) return views.settings.renderSettings(page, settingsCtx);
  if (current?.board) return views.board.renderBoard(page, boardCtx);
  if (current?.schedule) return views.schedule.renderSchedule(page, ctx);
  if (!current) {
    page.append(h('div', { class: 'empty' }, 'No folders under this root. Change the root folder in Settings.'));
    return;
  }
  views.folder.renderFolder(page, ctx);
}

function sideLook() {
  applySideLook(state.settings.sideLook, homeBgUrl());
}

const settingsCtx = {
  get settings() {
    return state.settings;
  },
  get tree() {
    return state.tree;
  },
  get root() {
    return state.root;
  },
  get secs() {
    return state.secs;
  },
  save: (patch) => queueSave(patch),
  toast,
  refresh,
  removeLinks: async (bms) => (await load('folder')).removeLinks(bms, bms.length === 1 ? 'Deleted 1 copy' : `Deleted ${bms.length} copies`),
  async reload() {
    setState({ settings: await loadSettings() });
    applyTheme(state.settings.theme);
    sideLook();
    applyFontSize(state.settings);
    await refresh();
  },
  async resetOrder() {
    await queueSave({ order: [] });
    setState({ secs: sections(state.root, [], [state.settings.home.folderId]) });
    renderNav();
    toast('Sidebar order reset to bookmark order');
  },
  applySideLook: (look) => applySideLook(look, homeBgUrl()),
  applyFontSize: (s) => applyFontSize(s),
  renderBrand: () => renderBrand(),
  onBgChange: () => sideLook(),
  done: () => closeSettings(),
};

const boardCtx = {
  get settings() {
    return state.settings;
  },
  get secs() {
    return state.secs;
  },
  get drag() {
    return state.drag;
  },
  set drag(v) {
    state.drag = v;
  },
  get filter() {
    return state.filterQ;
  },
  set filter(v) {
    state.filterQ = v;
  },
  folderPrefs: (id) => folderPrefs(id),
  select: (s) => select(s),
  folderMenu: (e, s) => ctx.folderMenu(e, s),
  deleteLink: async (bm) => (await load('folder')).deleteLink(bm),
  async moveFolder(id, targetId, after) {
    await moveFolder(id, targetId, after);
    renderNav();
    renderPage();
  },
  async setBoard(patch) {
    state.settings.board = { ...state.settings.board, ...patch };
    await saveSettings({ board: state.settings.board });
    renderPage();
  },
  clearMarks: () => clearMarks(),
  toast,
};

async function openSettings() {
  if (state.current?.settings && !state.query) return closeSettings();
  if (state.query) clearQuery(qInput);
  if (!state.current?.settings) setState({ beforeSettings: state.current });
  setState({ current: SETTINGS });
  renderNav();
  await renderPage();
  page.querySelector('.set-top h2')?.focus({ preventScroll: true });
}

function closeSettings() {
  setState({ current: findView(state.beforeSettings?.id, PAGES, state.secs) || HOME, beforeSettings: null });
  renderNav();
  renderPage();
  $('#settingsBtn').focus({ preventScroll: true });
}

async function openSettingsTab(key) {
  (await load('settings')).setSettingsTab(key);
  if (state.current?.settings && !state.query) renderPage();
  else openSettings();
}

function paletteGo(msg) {
  const target = paletteGoTarget(msg, PAGES, state.secs);
  if (target?.settings) return openSettingsTab(target.settings);
  select(target || HOME);
}

async function bindPaletteCommand() {
  const tabId = await currentTabId();
  if (tabId == null) return;
  onMessage((msg, sender, respond) => {
    if (isPaletteRequest(msg, tabId)) closeMenu();
    else if (isPaletteGo(msg, tabId)) paletteGo(msg);
    else return;
    respond(true);
  });
}

function bindGlobal() {
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#newFolderBtn').addEventListener('click', newFolder);
  $('#newCatBtn').addEventListener('click', () => newCategory(ctx));
  let t;
  qInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      setState({ query: qInput.value.trim().toLowerCase() });
      renderPage();
    }, 80);
  });
  qInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearQuery(qInput);
      renderPage();
      qInput.blur();
    }
    if (e.key === 'Enter') {
      const first = page.querySelector('.row[href]');
      if (first) openTab({ url: first.href });
    }
  });
  document.addEventListener('keydown', (e) => {
    const { current } = state;
    if (
      e.key === 'Escape' &&
      current?.settings &&
      !state.query &&
      !menuOpen() &&
      !e.target.closest?.('textarea, input[type=text], input[type=search], input:not([type]), select')
    ) {
      e.preventDefault();
      closeSettings();
      return;
    }
    if (e.key === '/' && document.activeElement === document.body) {
      e.preventDefault();
      qInput.focus();
    }
    if (document.activeElement === document.body && (e.key === 'j' || e.key === 'k') && current) {
      const n = stepNav(navOrder(state.settings, state.secs, PAGES), current, e.key);
      if (n) select(n);
    }
  });
  let refreshTimer;
  onBookmarksChanged(() => {
    setState({ editingId: null });
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 30);
  });
  let stale = false;
  onStorageChange((ch, area) => {
    if (area !== 'local') return;
    if (ch.settings) setState({ settings: { ...state.settings, ...ch.settings.newValue } });
    if (ch.linkMeta) {
      setState({ linkMeta: ch.linkMeta.newValue || {} });
      renderTodayCount();
      const { current } = state;
      if (!state.editingId && !document.hidden) {
        if (state.query || current?.schedule) renderPage();
        else if (current?.home) renderUpNext();
        else if (current && !current.home && !current.settings && !current.board && views.folder) views.folder.renderBody(ctx);
      }
    }
    if (document.hidden) stale = true;
  });
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) return;
    if (!stale) {
      if (day !== dayKey()) await refresh();
      return;
    }
    stale = false;
    await loadHomeAssets();
    setSideWidth(state.settings.sideWidth);
    await settingsCtx.reload();
  });
}

boot();
