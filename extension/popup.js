import { loadSettings } from './services/storage.js';
import { activeTab, openTab } from './services/tabs.js';
import { extensionUrl } from './services/runtime.js';
import { applyTheme } from './ui/theme.js';
import { svgIcon } from './ui/dom.js';
import { popup } from './state/popup-state.js';
import { renderPage, renderSwitch, renderModes } from './views/popup/page.js';
import { renderMeta } from './views/popup/meta.js';
import { renderFolders, setCursor, openTo, arrowKey } from './views/popup/folders.js';
import { loadFolders, renderExists } from './views/popup/exists.js';
import { save } from './views/popup/save.js';
import { chipKey } from './views/popup/chips.js';

const $ = (s) => document.querySelector(s);
const q = $('#q');
$('#searchIcon').append(svgIcon('search'));
$('#openBoard').append(svgIcon('board'));

async function boot() {
  popup.settings = await loadSettings();
  applyTheme(popup.settings.theme);
  popup.tab = await activeTab();
  await loadFolders();
  popup.selId = popup.settings.lastSaveFolder;
  openTo(popup.selId);
  renderPage();
  renderSwitch();
  renderMeta();
  renderModes();
  renderFolders();
  await renderExists();
  q.focus();
}

let t;
q.addEventListener('input', () => {
  clearTimeout(t);
  t = setTimeout(() => {
    popup.query = q.value.trim();
    popup.selId = popup.query ? null : popup.settings.lastSaveFolder;
    openTo(popup.selId);
    renderFolders();
  }, 60);
});
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setCursor(popup.cursor + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setCursor(popup.cursor - 1);
  } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !q.value && arrowKey(e.key)) {
    e.preventDefault();
  } else if (e.key === 'Escape' && q.value) {
    e.preventDefault();
    q.value = '';
    popup.query = '';
    popup.selId = popup.settings.lastSaveFolder;
    openTo(popup.selId);
    renderFolders();
  }
});
document.addEventListener('keydown', (e) => {
  if (chipKey(e)) {
    e.preventDefault();
    return;
  }
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault();
    save();
  }
});

$('#save').addEventListener('click', save);
$('#openBoard').addEventListener('click', () => {
  openTab({ url: extensionUrl('newtab.html') });
  window.close();
});

boot();
