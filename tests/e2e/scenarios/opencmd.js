import { base } from '../fixtures.js';

const area = 'open command';
const own = () => ({ ...base(), currentTabId: 5 });

async function command(t, tab) {
  await t.w.eval("import('/extension/background.js')");
  await t.w.__command('open', tab);
  await t.settle();
}

export default [
  {
    area,
    name: 'open command: on the Tab Warehouse tab it opens the palette, not the popup',
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
    name: 'open command: for another tab it opens the popup and no palette',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await command(t, { id: 9, url: 'https://github.com/' });
      t.eq(t.H.popupOpened, 1, 'popup opened');
      t.ok(!t.$('#palette'), 'no palette on the warehouse page');
    },
  },
  {
    area,
    name: 'open command: without a tab it uses the active tab, and a failing popup is ignored',
    page: 'newtab',
    fixture: () => ({ ...own(), activeTab: { id: 5, url: 'chrome://newtab/' } }),
    async run(t) {
      await command(t);
      t.ok(t.$('#palette'), 'active tab is this page, palette open');
      t.key(t.$('#palQ'), 'Escape');
      await t.settle();
      t.H.activeTab = { id: 9, url: 'https://example.com/' };
      t.H.openPopupFails = true;
      await command(t);
      t.ok(!t.$('#palette'), 'no palette for another tab');
      t.ok(!t.H.popupOpened, 'popup could not open');
      t.ok(!t.H.badges, 'no badge');
    },
  },
  {
    area,
    name: 'open command: opening the palette by message closes an open menu like ⌘K',
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
    name: 'open command: Settings › Shortcuts shows the open row with its key',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('.set-tab[data-tab="keys"]'));
      await t.settle();
      const row = t.$('#chromeKeys .keys-row[data-cmd="open"]');
      t.eq(row?.querySelector('.keys-what').textContent, 'Open the popup (palette on this page)', 'label');
      t.eq(
        [...row.querySelectorAll('kbd')].map((k) => k.textContent),
        ['Ctrl', 'K'],
        'keys',
      );
    },
  },
];
