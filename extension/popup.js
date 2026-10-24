import { loadSettings } from './services/storage.js';
import { activeTab, openTab } from './services/tabs.js';
import { extensionUrl } from './services/runtime.js';
import { applyTheme } from './ui/theme.js';
import { svgIcon } from './ui/dom.js';
import { popup } from './state/popup-state.js';
import { renderPage, renderSwitch, renderModes } from './views/popup/page.js';
import { renderMeta } from './views/popup/meta.js';
import { renderFolders, setCursor } from './views/popup/folders.js';
import { loadFolders, renderExists } from './views/popup/exists.js';
import { save } from './views/popup/save.js';

const $ = (s) => document.querySelector(s);
const q = $('#q');
$('#searchIcon').append(svgIcon('search'));

async function boot() {
  popup.settings = await loadSettings();
  applyTheme(popup.settings.theme);
  popup.tab = await activeTab();
  await loadFolders();
  popup.selId = popup.settings.lastSaveFolder;
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
  } else if (e.key === 'Escape' && q.value) {
    e.preventDefault();
    q.value = '';
    popup.query = '';
    popup.selId = popup.settings.lastSaveFolder;
    renderFolders();
  }
});
document.addEventListener('keydown', (e) => {
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
