import { base } from '../fixtures.js';

const area = 'shortcuts';
const openKeys = async (t) => {
  t.click(t.$('#settingsBtn'));
  await t.settle();
  t.click(t.$('.set-tab[data-tab="keys"]'));
  await t.settle();
};
const rows = (t, sel) =>
  t
    .$$(`${sel} .keys-row`)
    .map((r) => [
      r.querySelector('.keys-what').textContent,
      r.querySelector('.keys-none')
        ? 'Not set'
        : [...r.querySelectorAll('.keys-combo')].map((c) => [...c.querySelectorAll('kbd')].map((k) => k.textContent).join(' ')).join(' / '),
    ]);
const COMMANDS = [
  { name: '_execute_action', description: 'Save current tab', shortcut: '⇧⌘B' },
  { name: 'quick-save', description: 'Save current tab without the popup', shortcut: '' },
  { name: 'other', description: 'Something else', shortcut: 'Ctrl+Shift+Y' },
];

export default [
  {
    area,
    name: 'shortcuts: Settings › Shortcuts is the last tab and lists Chrome shortcuts with their keys or Not set',
    page: 'newtab',
    fixture: () => ({ ...base(), commands: COMMANDS }),
    async run(t) {
      await openKeys(t);
      t.eq(t.$$('.set-tab').at(-1).textContent, 'Shortcuts', 'last tab');
      t.eq(t.$('.set-tab.on')?.dataset.tab, 'keys', 'tab open');
      t.eq(
        rows(t, '#chromeKeys'),
        [
          ['Open the save popup', '⇧ ⌘ B'],
          ['Quick save (no popup)', 'Not set'],
          ['Something else', 'Ctrl Shift Y'],
          ['Search from the address bar', 'tw Space'],
        ],
        'commands, keys and the address bar keyword',
      );
      t.eq(t.$('#chromeKeys .keys-row[data-cmd="quick-save"] .keys-none')?.textContent, 'Not set', 'empty shortcut says Not set');
      t.ok(/does not let an extension change its own keys/.test(t.$('#settingsView .set-card .sub').textContent), 'help line');
    },
  },
  {
    area,
    name: 'shortcuts: Change shortcuts opens chrome://extensions/shortcuts in a new tab',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openKeys(t);
      const btn = t.$('#keysChange');
      t.eq(btn?.textContent, 'Change shortcuts', 'button text');
      t.ok(btn.getBoundingClientRect().height >= 36, 'at least 36 px tall');
      t.click(btn);
      await t.settle();
      t.eq(t.tabs, [{ url: 'chrome://extensions/shortcuts' }], 'tabs.create called');
    },
  },
  {
    area,
    name: 'shortcuts: keys are read again when the tab becomes visible',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openKeys(t);
      t.eq(t.$('#chromeKeys .keys-row[data-cmd="quick-save"] .keys-combo')?.textContent, 'CtrlK', 'default key');
      t.H.commands = [{ name: 'quick-save', description: 'Save current tab without the popup', shortcut: '' }];
      t.d.dispatchEvent(new t.w.Event('visibilitychange'));
      await t.settle();
      t.eq(t.$('#chromeKeys .keys-row[data-cmd="quick-save"] .keys-none')?.textContent, 'Not set', 'new key shown');
      t.eq(t.$$('#chromeKeys .keys-row').length, 2, 'one command and the address bar row');
    },
  },
  {
    area,
    name: 'shortcuts: Keys on this page lists the fixed page keys; the palette opens the tab',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const mac = /mac/i.test(t.w.navigator.userAgentData?.platform || t.w.navigator.platform || '');
      const mod = mac ? '⌘' : 'Ctrl';
      const alt = mac ? '⌥' : 'Alt';
      await t.palette();
      t.type(t.$('#palQ'), 'settings shortcuts');
      await t.settle();
      t.eq(
        t.$$('#palList .pal-item').map((o) => o.querySelector('.pal-t').textContent),
        ['Settings › Shortcuts'],
        'palette place',
      );
      t.key(t.$('#palQ'), 'Enter');
      await t.settle();
      await t.relay();
      t.ok(t.$('#settingsView .set-tab[data-tab="keys"].on'), 'Shortcuts tab open');
      t.eq(
        rows(t, '#pageKeys'),
        [
          ['Open the result in a background tab (in the palette)', `${mod} Enter`],
          ['Go to the search box', '/'],
          ['Next or previous page in the sidebar', 'j / k'],
          ['Move the focused folder, rule or tag up or down', `${alt} ↑ / ${alt} ↓`],
          ['Close the palette, a menu or Settings, or clear a search', 'Esc'],
        ],
        'page keys',
      );
      t.ok(/Fixed/.test(t.$('#pageKeys').closest('.set-card').querySelector('.sub').textContent), 'marked fixed');
    },
  },
];
