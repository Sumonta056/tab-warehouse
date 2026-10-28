import { base } from '../fixtures.js';

const area = 'palette command';
const own = () => ({ ...base(), currentTabId: 5 });

async function command(t, tab) {
  await t.background();
  await t.w.__command('palette', tab);
  await t.settle();
}

const POPUP = [['setPopup', { tabId: 5, popup: 'palette.html' }], ['openPopup'], ['setPopup', { tabId: 5, popup: 'popup.html' }]];

export default [
  {
    area,
    name: 'palette command: on the Tab Warehouse tab the page answers, then the palette popup opens and the save popup comes back',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await command(t, { id: 5, url: 'chrome://newtab/' });
      t.eq(t.sent('open-palette'), [{ type: 'open-palette', tabId: 5 }], 'asked the page by tab id');
      t.eq(t.H.action, POPUP, 'palette.html set for the tab, opened, then popup.html again');
      t.eq(t.H.popupOpened, 1, 'popup opened once');
      t.ok(!t.$('#palette') && !t.$('.pal') && !t.$('.pal-shade'), 'no overlay on the page');
    },
  },
  {
    area,
    name: 'palette command: on another tab nothing opens',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await command(t, { id: 9, url: 'https://github.com/' });
      t.ok(!t.H.action, 'popup not set or opened');
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
      t.eq(t.H.action, POPUP, 'active tab is this page, palette popup opened');
    },
  },
  {
    area,
    name: 'palette command: it closes an open menu on the page',
    page: 'newtab',
    fixture: own,
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      await t.settle();
      t.ok(t.$('.menu'), 'menu open');
      await command(t, { id: 5 });
      t.ok(!t.$('.menu'), 'menu closed');
      t.eq(t.H.action, POPUP, 'palette popup opened');
    },
  },
  {
    area,
    name: 'palette command: when the popup cannot open, the save popup still comes back and nothing breaks',
    page: 'newtab',
    fixture: own,
    async run(t) {
      t.H.openPopupFails = true;
      await command(t, { id: 5 });
      t.eq(t.H.action, POPUP, 'popup.html set back');
      t.ok(!t.H.popupOpened, 'nothing opened');
      t.ok(!t.H.badges, 'no badge');
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
