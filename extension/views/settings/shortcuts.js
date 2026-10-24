import { commandLabel, shortcutKeys, isMac } from '../../domain/shortcuts.js';
import { getCommands, omniboxKeyword } from '../../services/commands.js';
import { openTab } from '../../services/tabs.js';
import { h } from '../../ui/dom.js';
import { card } from './controls.js';

let keysView = null;

function bindKeysRefresh() {
  if (keysView) return;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && keysView?.list.isConnected) keysView.draw();
  });
}

export function keys() {
  const mac = isMac(navigator.userAgentData?.platform || navigator.platform || '');
  const mod = mac ? '⌘' : 'Ctrl';
  const alt = mac ? '⌥' : 'Alt';
  const combo = (keys) => h('span', { class: 'keys-combo' }, ...keys.map((k) => h('kbd', { class: 'kbd' }, k)));
  const keysEl = (groups) =>
    h('span', { class: 'keys' }, ...groups.flatMap((g, i) => (i ? [h('span', { class: 'keys-or', 'aria-hidden': 'true' }, '/'), combo(g)] : [combo(g)])));
  const row = (what, groups, name) =>
    h(
      'li',
      { class: 'keys-row', dataset: name ? { cmd: name } : {} },
      h('span', { class: 'keys-what' }, what),
      groups.length ? keysEl(groups) : h('span', { class: 'keys-none' }, 'Not set'),
    );
  const list = h('ul', { class: 'keys-list', id: 'chromeKeys', 'aria-label': 'Chrome shortcuts' });
  const draw = async () => {
    const cmds = await getCommands();
    const word = omniboxKeyword();
    list.replaceChildren(
      ...cmds.map((cmd) => {
        const keys = shortcutKeys(cmd.shortcut);
        return row(commandLabel(cmd), keys.length ? [keys] : [], cmd.name);
      }),
      ...(word ? [row('Search from the address bar', [[word, 'Space']], 'omnibox')] : []),
    );
  };
  bindKeysRefresh();
  keysView = { list, draw };
  draw();
  return h(
    'div',
    { class: 'set-grid one' },
    h(
      'div',
      { class: 'set-col' },
      card(
        'Chrome shortcuts',
        'These keys work on any page. Chrome does not let an extension change its own keys, so change them on Chrome’s shortcuts page. If another extension already uses a key, Chrome leaves it Not set here.',
        list,
        h(
          'div',
          { class: 'set-row keys-actions' },
          h('button', { type: 'button', class: 'btn', id: 'keysChange', onClick: () => openTab({ url: 'chrome://extensions/shortcuts' }) }, 'Change shortcuts'),
        ),
      ),
      card(
        'Keys on this page',
        'Fixed. These keys cannot be changed.',
        h(
          'ul',
          { class: 'keys-list', id: 'pageKeys', 'aria-label': 'Keys on this page' },
          row('Open the result in a background tab (in the palette)', [[mod, 'Enter']]),
          row('Go to the search box', [['/']]),
          row('Next or previous page in the sidebar', [['j'], ['k']]),
          row('Move the focused folder, rule or tag up or down', [
            [alt, '↑'],
            [alt, '↓'],
          ]),
          row('Close the palette, a menu or Settings, or clear a search', [['Esc']]),
        ),
      ),
    ),
  );
}
