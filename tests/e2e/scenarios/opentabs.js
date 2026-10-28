import { base } from '../fixtures.js';

const area = 'opentabs';
const withTabs = (openTabs) => ({ ...base(), openTabs });
const pill = (t, id) => t.row(id)?.querySelector('.badge.tab-open');

export default [
  {
    area,
    name: 'open tabs: a row whose address is open in a tab shows the Open pill before its tag',
    page: 'newtab',
    fixture: () =>
      withTabs([
        { id: 7, url: 'https://shop.example.com/api/x/#top' },
        { id: 8, url: 'chrome://newtab/' },
      ]),
    async run(t) {
      await t.folder('Shop API');
      const p = pill(t, '31');
      t.ok(p, 'open link has the pill');
      t.eq(p?.textContent, 'Open', 'pill text');
      t.eq(p?.title, 'Open in a tab', 'pill tooltip');
      t.eq(p?.nextElementSibling?.className, 'badge PROD', 'pill sits before the env badge');
      t.eq(t.$$('#page .badge.tab-open').length, 1, 'only the open link has the pill');
    },
  },
  {
    area,
    name: 'open tabs: the pill follows tabs opened and closed while the page shows',
    page: 'newtab',
    fixture: () => withTabs([]),
    async run(t) {
      await t.folder('Shop API');
      t.ok(!pill(t, '32'), 'no pill without a tab');
      t.w.__tabs([{ id: 3, url: 'https://test.shop.example.com/api/x' }]);
      await t.until(() => pill(t, '32'), 'pill after the tab opens');
      t.w.__tabs([]);
      await t.until(() => !pill(t, '32'), 'pill goes when the tab closes');
    },
  },
  {
    area,
    name: 'open tabs: global search rows show the pill too',
    page: 'newtab',
    fixture: () => withTabs([{ id: 7, url: 'https://shop.example.com/api/x' }]),
    async run(t) {
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.ok(pill(t, '31'), 'search row has the pill');
      t.ok(!pill(t, '32'), 'other search row has none');
    },
  },
];
