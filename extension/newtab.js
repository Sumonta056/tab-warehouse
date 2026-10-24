import { loadSettings, saveSettings, loadLinkMeta, onStorageChange } from './services/storage.js';
import { getTree, onBookmarksChanged } from './services/bookmarks.js';
import { openTab, updateTab, currentTabId } from './services/tabs.js';
import { onMessage } from './services/runtime.js';
import { resolveRoot, sections, findById } from './domain/tree.js';
import { navOrder, stepNav, findView } from './domain/folders.js';
import { isPaletteRequest } from './domain/palette.js';
import { HOME, SETTINGS, BOARD, SCHEDULE, PAGES } from './constants/pages.js';
import { h } from './ui/dom.js';
import { applyTheme, applySideLook, applyFontSize } from './ui/theme.js';
import { showMenu, closeMenu, menuOpen } from './ui/menu.js';
import { toast } from './ui/toast.js';
import { clearMarks } from './ui/dnd.js';
import { state, setState, clearQuery } from './state/page-state.js';
import { folderPrefs, saveFolderPrefs, moveFolder, queueSave } from './state/folders.js';
import { pruneLinkMeta } from './state/links.js';
import { paintIcons, renderBrand } from './views/sidebar/header.js';
import { renderNav as drawNav, bindNavDrag, newFolder } from './views/sidebar/nav.js';
import { newCategory } from './views/sidebar/categories.js';
import { setSideWidth, bindResizer } from './views/sidebar/resizer.js';
import { renderFolder } from './views/folder/page.js';
import { renderBody } from './views/folder/body.js';
import { renderRow } from './views/folder/row.js';
import { folderMenu } from './views/folder/menus.js';
import { deleteLink, removeLinks } from './views/folder/actions.js';
import { renderSearch } from './views/search/search.js';
import { renderSchedule } from './views/schedule/schedule.js';
import { ensureHomeFolder } from './services/home-folder.js';
import { loadHomeAssets, homeBgUrl } from './state/home-assets.js';
import { renderHome } from './views/home/home.js';
import { renderSettings, setSettingsTab } from './views/settings/index.js';
import { openPalette } from './views/palette/palette.js';
import { renderBoard } from './views/board/board.js';

const $ = (s) => document.querySelector(s);
const page = $('#page');
const qInput = $('#q');

const ctx = {
  select: (s) => select(s),
  renderNav: () => drawNav(ctx),
  renderPage: () => renderPage(),
  folderMenu: (e, s) => folderMenu(ctx, e, s),
  renderRow: (bm, s, p, opts) => renderRow(ctx, bm, s, p, opts),
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
  const root = resolveRoot(tree, state.settings);
  setState({ tree, root, secs: sections(root, state.settings.order, [state.settings.home.folderId]) });
  await pruneLinkMeta();
  renderBrand();
  const { current } = state;
  setState({ current: current?.settings ? SETTINGS : findView(current?.id, PAGES, state.secs) || HOME });
  renderNav();
  renderPage();
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
  const { current, query } = state;
  closeMenu();
  if (state.navSearch !== !!query) renderNav();
  page.replaceChildren();
  page.classList.toggle('home-mode', !!current?.home && !query);
  page.classList.toggle('settings-mode', !!current?.settings && !query);
  page.classList.toggle('board-mode', !!current?.board && !query);
  $('#homeFab').hidden = !!current?.home && !query;
  if (query) return renderSearch(page, ctx);
  if (current?.home) return renderHome(page, { settings: state.settings, tree: state.tree, showMenu, toast, rerender: renderPage });
  if (current?.settings) return renderSettings(page, settingsCtx);
  if (current?.board) return renderBoard(page, boardCtx);
  if (current?.schedule) return renderSchedule(page, ctx);
  if (!current) {
    page.append(h('div', { class: 'empty' }, 'No folders under this root. Change the root folder in Settings.'));
    return;
  }
  renderFolder(page, ctx);
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
  removeLinks: (bms) => removeLinks(bms, bms.length === 1 ? 'Deleted 1 copy' : `Deleted ${bms.length} copies`),
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

const paletteCtx = {
  get secs() {
    return state.secs;
  },
  get settings() {
    return state.settings;
  },
  get linkMeta() {
    return state.linkMeta;
  },
  openUrl(url, bg) {
    if (bg) {
      openTab({ url, active: false });
      toast('Opened in a background tab');
    } else updateTab({ url });
  },
  go(where) {
    select(PAGES.find((v) => v.id === where) || HOME);
  },
  select(s) {
    select(s);
  },
  openSettings(key) {
    setSettingsTab(key);
    if (state.current?.settings && !state.query) renderPage();
    else openSettings();
  },
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
  folderMenu: (e, s) => folderMenu(ctx, e, s),
  deleteLink: (bm) => deleteLink(bm),
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

function openSettings() {
  if (state.current?.settings && !state.query) return closeSettings();
  if (state.query) clearQuery(qInput);
  if (!state.current?.settings) setState({ beforeSettings: state.current });
  setState({ current: SETTINGS });
  renderNav();
  renderPage();
  page.querySelector('.set-top h2')?.focus({ preventScroll: true });
}

function closeSettings() {
  setState({ current: findView(state.beforeSettings?.id, PAGES, state.secs) || HOME, beforeSettings: null });
  renderNav();
  renderPage();
  $('#settingsBtn').focus({ preventScroll: true });
}

function showPalette() {
  closeMenu();
  openPalette(paletteCtx);
}

async function bindPaletteCommand() {
  const tabId = await currentTabId();
  if (tabId == null) return;
  onMessage((msg, sender, respond) => {
    if (!isPaletteRequest(msg, tabId)) return;
    showPalette();
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
      const { current } = state;
      if (!state.editingId && !document.hidden) {
        if (state.query || current?.schedule) renderPage();
        else if (current && !current.home && !current.settings && !current.board) renderBody(ctx);
      }
    }
    if (document.hidden) stale = true;
  });
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden || !stale) return;
    stale = false;
    await loadHomeAssets();
    setSideWidth(state.settings.sideWidth);
    await settingsCtx.reload();
  });
}

boot();
