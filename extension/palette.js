import { loadSettings, loadLinkMeta } from './services/storage.js';
import { getTree } from './services/bookmarks.js';
import { activeTab, openTab, updateTab } from './services/tabs.js';
import { sendMessage } from './services/runtime.js';
import { resolveRoot, sections } from './domain/tree.js';
import { paletteGoMsg } from './domain/palette.js';
import { applyTheme } from './ui/theme.js';
import { toast } from './ui/toast.js';
import { renderPalette } from './views/palette/palette.js';

let tabId;

const close = () => window.close();

async function go(target) {
  await Promise.resolve()
    .then(() => sendMessage(paletteGoMsg(tabId, target)))
    .catch(() => {});
  close();
}

async function boot() {
  const [settings, tree, linkMeta, tab] = await Promise.all([loadSettings(), getTree(), loadLinkMeta(), activeTab()]);
  tabId = tab?.id;
  applyTheme(settings.theme);
  const secs = sections(resolveRoot(tree, settings), settings.order, [settings.home.folderId]);
  renderPalette(document.querySelector('#pal'), {
    secs,
    settings,
    linkMeta,
    async openUrl(url, bg) {
      if (bg) {
        await openTab({ url, active: false });
        toast('Opened in a background tab');
        return;
      }
      await updateTab({ url }, tabId);
      close();
    },
    go: (view) => go({ view }),
    select: (s) => go({ view: s.id }),
    openSettings: (key) => go({ settings: key }),
    close,
  });
}

boot();
