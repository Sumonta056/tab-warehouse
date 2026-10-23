import { base } from '../fixtures.js';

const area = 'palette command';
const own = () => ({ ...base(), currentTabId: 5 });

async function command(t, tab) {
  await t.w.eval("import('/extension/background.js')");
  await t.w.__command('palette', tab);
  await t.settle();
}

export default [
  {
    area,
    name: 'palette command: on the Tab Warehouse tab it opens the palette, also while the page has no focus',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await command(t, { id: 5, url: 'chrome://newtab/' });
      t.ok(t.$('#palette'), 'palette open');
      t.eq(t.d.activeElement?.id, 'palQ', 'focus in the palette box');
      t.ok(!t.H.popupOpened, 'popup not opened');
      t.eq(
        t.H.log.filter((l) => l[0] === 'sendMessage').map((l) => l[1]),
        [{ type: 'open-palette', tabId: 5 }],
        'asked the page by tab id',
      );
    },
  },
  {
    area,
    name: 'palette command: on another tab nothing opens',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await command(t, { id: 9, url: 'https://github.com/' });
      t.ok(!t.H.popupOpened, 'no popup');
      t.ok(!t.$('#palette'), 'no palette on the warehouse page');
      t.ok(!t.H.badges, 'no badge');
    },
  },
  {
    area,
    name: 'palette command: without a tab it uses the active tab',
    page: 'newtab',
    fixture: () => ({ ...own(), activeTab: { id: 5, url: 'chrome://newtab/' } }),
    async run(t) {
      await command(t);
      t.ok(t.$('#palette'), 'active tab is this page, palette open');
    },
  },
  {
    area,
    name: 'palette command: it closes an open menu like the page key',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      await t.settle();
      t.ok(t.$('.menu'), 'menu open');
      await command(t, { id: 5 });
      t.ok(!t.$('.menu'), 'menu closed');
      t.ok(t.$('#palette'), 'palette open');
    },
  },
  {
    area,
    name: 'palette command: Settings › Shortcuts shows the palette row with its key',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('.set-tab[data-tab="keys"]'));
      await t.settle();
      const row = t.$('#chromeKeys .keys-row[data-cmd="palette"]');
      t.eq(row?.querySelector('.keys-what').textContent, 'Open the command palette (on Tab Warehouse)', 'label');
      t.eq(
        [...row.querySelectorAll('kbd')].map((k) => k.textContent),
        ['Ctrl', 'Shift', 'K'],
        'keys',
      );
    },
  },
];
