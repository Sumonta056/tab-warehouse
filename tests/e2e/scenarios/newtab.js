import { base, F, L } from '../fixtures.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const area = 'folders';

export default [
  {
    area,
    name: 'boots on Home; Home and Board are labeled view tabs under a full-width search; Home folder is not a sidebar section',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const btn = t.$('#homeBtn'),
        search = t.$('.side .search'),
        tabs = t.$('.side .view-tabs');
      t.ok(tabs && btn.parentElement === tabs && t.$('#boardBtn').parentElement === tabs, 'Home and Board share the view tabs');
      t.eq(tabs.getAttribute('role'), 'group', 'tabs are a group');
      t.eq(tabs.getAttribute('aria-label'), 'View', 'group name');
      t.ok(!search.parentElement.contains(btn), 'search row has no buttons');
      t.ok(btn.getBoundingClientRect().top >= search.getBoundingClientRect().bottom, 'tabs sit under the search box');
      t.ok(tabs.getBoundingClientRect().top - search.getBoundingClientRect().bottom <= 6, 'tabs sit 6 px under the search box');
      const cs = (el) => t.w.getComputedStyle(el);
      t.eq(
        ['height', 'borderRadius', 'backgroundColor', 'borderTopColor'].map((k) => cs(tabs)[k]),
        ['height', 'borderRadius', 'backgroundColor', 'borderTopColor'].map((k) => cs(search)[k]),
        'tabs box matches the search box',
      );
      t.eq(cs(btn).fontSize, cs(t.$('#q')).fontSize, 'tab labels match the search text size');
      t.eq(cs(btn).columnGap, cs(search).columnGap, 'same icon-to-text gap');
      t.ok(Math.abs(search.getBoundingClientRect().width - tabs.getBoundingClientRect().width) <= 1, 'search is as wide as the tabs');
      t.ok(btn.getBoundingClientRect().height >= 28, 'Home tab is at least 28 px tall');
      t.ok(t.$('.side .view-tabs').getBoundingClientRect().height <= 36, 'view tabs take at most 36 px');
      t.ok(Math.abs(btn.getBoundingClientRect().width - t.$('#boardBtn').getBoundingClientRect().width) <= 1, 'tabs share the width equally');
      t.eq(btn.textContent.trim(), 'Home', 'labeled');
      t.eq(t.$('#boardBtn').textContent.trim(), 'Board', 'labeled');
      t.ok(btn.querySelector('svg') && t.$('#boardBtn').querySelector('svg'), 'icons kept');
      t.eq(btn.getAttribute('aria-label'), 'Home', 'accessible name');
      t.ok(btn.classList.contains('on'), 'Home is selected');
      t.ok(t.$('#home'), 'Home page is rendered');
      t.eq(t.navTitles(), ['Sprint tasks', 'Shop API', 'GITHUB - PIN', 'Empty', 'Unsorted'], 'sidebar items');
      t.ok(!t.$('.side .hint'), 'no drag hint text');
      t.ok(!t.$('.side').textContent.includes("Chrome's bookmark tree"), 'hint text removed');
    },
  },
  {
    area,
    name: 'view tabs: a middle line splits Home and Board while neither is open',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const tabs = t.$('.side .view-tabs');
      const line = () => t.w.getComputedStyle(tabs, '::after');
      t.click(t.$('.nav[data-id="30"]'));
      await t.settle();
      t.ok(line().content !== 'none' && line().opacity === '1', 'line shows on a folder page');
      const r = tabs.getBoundingClientRect();
      t.eq(line().width, '1px', '1 px wide');
      t.ok(Math.abs(parseFloat(line().left) + 0.5 - r.width / 2) <= 2, 'in the middle');
      t.ok(parseFloat(line().height) < r.height - 8, 'shorter than the box');
      t.click(t.$('#homeBtn'));
      await t.settle();
      t.eq(line().opacity, '0', 'hidden while a tab is marked on');
    },
  },
  {
    area,
    name: 'view tabs: at the narrowest sidebar the search box keeps its placeholder and the tabs fit',
    page: 'newtab',
    fixture: () => base({ settings: { sideWidth: 180 } }),
    async run(t) {
      const side = t.$('.side').getBoundingClientRect();
      t.ok(Math.round(side.width) <= 181, 'sidebar is 180 px');
      const q = t.$('#q');
      t.ok(q.getBoundingClientRect().width >= 70, 'search input keeps room for its placeholder');
      for (const b of [t.$('#homeBtn'), t.$('#boardBtn')]) {
        t.ok(b.scrollWidth <= b.clientWidth + 1, `${b.id} label fits`);
        t.ok(b.getBoundingClientRect().right <= side.right, `${b.id} inside the sidebar`);
      }
    },
  },
  {
    area,
    name: 'Home button: click from a folder and from search results goes Home',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.ok(!t.$('#homeBtn').classList.contains('on'), 'not selected on a folder');
      t.click(t.$('#homeBtn'));
      await t.settle();
      t.ok(t.$('#home'), 'Home after click');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.ok(!t.$('#home'), 'search results shown');
      t.click(t.$('#homeBtn'));
      await t.settle();
      t.ok(t.$('#home'), 'Home after click from search');
      t.eq(t.$('#q').value, '', 'search cleared');
    },
  },
  {
    area,
    name: 'floating Home button shows on every page except Home',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const fab = t.$('#homeFab');
      t.ok(fab.hidden, 'hidden on Home');
      await t.folder('Shop API');
      t.ok(!fab.hidden, 'visible on a folder');
      const r = fab.getBoundingClientRect();
      t.ok(t.w.innerWidth - r.right <= 40 && t.w.innerHeight - r.bottom <= 40, 'bottom-right corner');
      t.eq(t.w.getComputedStyle(fab).position, 'fixed', 'overlay stays in place on scroll');
      t.eq(fab.getAttribute('aria-label'), 'Go to Home', 'accessible name');
      await t.folder('Unsorted');
      t.ok(!fab.hidden, 'visible on Unsorted');
      t.click(fab);
      await t.settle();
      t.ok(t.$('#home'), 'Home after click');
      t.ok(fab.hidden, 'hidden again');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.ok(!fab.hidden, 'visible on search results');
    },
  },
  {
    area,
    name: 'search results: no view tab or folder is marked open; Escape marks the page again',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const on = () => [...t.$$('#homeBtn.on, #boardBtn.on, #nav .nav.on, #nav .cat.has-on')].map((el) => el.id || el.dataset.id || 'cat');
      const current = () => t.$$('[aria-current="page"]').length;
      t.eq(on(), ['homeBtn'], 'Home marked on Home');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Search', 'results shown');
      t.eq(on(), [], 'nothing marked during search from Home');
      t.eq(current(), 0, 'no aria-current during search');
      t.key(t.$('#q'), 'Escape');
      await t.settle();
      t.eq(on(), ['homeBtn'], 'Home marked again after Escape');
      await t.folder('Shop API');
      const id = t.$('#nav .nav.on')?.dataset.id;
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.eq(on(), [], 'folder not marked during search');
      t.click(t.$('.head .btn.add'));
      await t.settle();
      t.eq(on(), [id], 'folder marked again after Clear');
    },
  },
  {
    area,
    name: 'search results: the Board, Settings and a collapsed category are not marked either',
    page: 'newtab',
    fixture: () => base({ settings: { categories: [{ id: 'c1', name: 'Daily working', closed: false }], folderCat: { 30: 'c1' } } }),
    async run(t) {
      const search = async (text) => {
        t.type(t.$('#q'), text);
        await t.settle();
      };
      const escape = async () => {
        t.key(t.$('#q'), 'Escape');
        await t.settle();
      };
      t.click(t.$('#boardBtn'));
      await t.settle();
      await search('shop');
      t.ok(!t.$('#boardBtn').classList.contains('on'), 'Board not marked during search');
      t.eq(t.$('#boardBtn').getAttribute('aria-current'), 'false', 'Board not aria-current');
      await escape();
      t.ok(t.$('#boardBtn').classList.contains('on'), 'Board marked after Escape');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      await search('shop');
      t.ok(!t.$('#settingsBtn').classList.contains('on'), 'gear not marked during search');
      t.eq(t.$('#settingsBtn').getAttribute('aria-pressed'), 'false', 'gear not pressed');
      await escape();
      t.ok(t.$('#settingsBtn').classList.contains('on'), 'gear marked after Escape');
      await t.folder('Shop API');
      t.click(t.catHeader('Daily working').querySelector('.cat-toggle'));
      await t.settle();
      t.ok(t.catHeader('Daily working').classList.contains('has-on'), 'collapsed category marked');
      await search('shop');
      t.ok(!t.catHeader('Daily working').classList.contains('has-on'), 'collapsed category not marked during search');
      await escape();
      t.ok(t.catHeader('Daily working').classList.contains('has-on'), 'collapsed category marked after Escape');
    },
  },
  {
    area,
    name: 'search results: ?q= on boot does not mark Home',
    page: 'newtab',
    search: '?q=shop',
    fixture: () => base(),
    async run(t) {
      t.eq(t.$('.head h2')?.textContent, 'Search', 'results shown');
      t.ok(!t.$('#homeBtn').classList.contains('on'), 'Home not marked');
      t.eq(t.$('#homeBtn').getAttribute('aria-current'), 'false', 'Home not aria-current');
    },
  },
  {
    area,
    name: 'search results: a sidebar folder click or j/k clears the search and opens that page',
    page: 'newtab',
    search: '?q=shop',
    fixture: () => base(),
    async run(t) {
      t.click(t.nav('Shop API'));
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Shop API', 'folder page shown');
      t.eq(t.$('#q').value, '', 'search box cleared');
      t.ok(t.nav('Shop API').classList.contains('on'), 'folder marked');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.d.activeElement?.blur();
      t.key(t.d, 'j');
      await t.settle();
      t.eq(t.$('#q').value, '', 'j clears the search');
      t.ok(t.$('.head h2')?.textContent !== 'Search', 'j opens a page');
    },
  },
  {
    area,
    name: 'sidebar theme: a preset applies and saves at once, and survives reload',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const accent = () => t.d.documentElement.style.getPropertyValue('--accent');
      t.eq(accent(), '#8ab4f8', 'blue by default');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.eq(t.$$('#themeSwatches .theme-sw').length, 7, '7 presets');
      t.ok(t.$('#themeSwatches input[type=color]'), 'custom color picker');
      t.click(t.$('#themeSwatches [data-theme="purple"]'));
      await t.settle();
      t.eq(accent(), '#c6a9ff', 'applied at once');
      t.eq(t.settings().theme, 'purple', 'saved');
      t.eq(t.$('#themeSwatches .on')?.dataset.theme, 'purple', 'swatch marked');
      await t.reload();
      t.eq(accent(), '#c6a9ff', 'applied after reload');
      t.eq(t.d.documentElement.style.getPropertyValue('--accent-bg'), '#2e2246', 'all accent tokens set');
    },
  },
  {
    area,
    name: 'sidebar look: default is the plain sidebar color, no image',
    page: 'newtab',
    fixture: () => {
      const f = base();
      f.store.homeBg = PNG;
      return f;
    },
    async run(t) {
      const v = (k) => t.d.documentElement.style.getPropertyValue(k);
      t.eq([v('--side-color'), v('--side-dark'), v('--side-blur'), v('--side-img')], ['#1b1b1b', '1', '0px', 'none'], 'default look');
      t.eq(t.w.getComputedStyle(t.$('.side-shade')).backgroundColor, 'rgb(27, 27, 27)', 'shade paints the color');
      const r = t.$('.side-backdrop').getBoundingClientRect(),
        s = t.$('.side').getBoundingClientRect();
      t.eq([Math.round(r.left), Math.round(r.width)], [Math.round(s.left), Math.round(s.width)], 'backdrop matches the sidebar');
    },
  },
  {
    area,
    name: 'sidebar look: Home image mode with darkness and blur applies at once and saves',
    page: 'newtab',
    fixture: () => {
      const f = base();
      f.store.homeBg = PNG;
      return f;
    },
    async run(t) {
      const v = (k) => t.d.documentElement.style.getPropertyValue(k);
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.ok(t.$('#lookDark').disabled && t.$('#lookBlur').disabled, 'sliders disabled in Solid mode');
      t.click(t.$('#lookMode [data-mode="image"]'));
      t.ok(!t.$('#lookDark').disabled && !t.$('#lookBlur').disabled, 'sliders enabled in Home image mode');
      t.ok(t.$('#lookNote').hidden, 'no note when a Home image exists');
      t.ok(v('--side-img').includes(PNG), 'sidebar shows the Home image');
      t.type(t.$('#lookDark'), '50');
      t.type(t.$('#lookBlur'), '6');
      t.type(t.$('#lookColor'), '#203040');
      t.eq([v('--side-dark'), v('--side-blur'), v('--side-color')], ['0.5', '6px', '#203040'], 'applied at once');
      t.eq(t.$('#lookDarkOut').textContent, '50%', 'darkness value shown');
      await t.sleep(450);
      t.eq(t.settings().sideLook, { mode: 'image', color: '#203040', dark: 50, blur: 6 }, 'saved');
      await t.reload();
      t.eq([v('--side-blur'), v('--side-dark')], ['6px', '0.5'], 'applied after reload');
      t.ok(v('--side-img').includes(PNG), 'image after reload');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.eq(t.$('#lookMode .on')?.dataset.mode, 'image', 'settings show the saved mode');
    },
  },
  {
    area,
    name: 'sidebar look: Home image mode without an image falls back to the color and shows a note',
    page: 'newtab',
    fixture: () => base({ settings: { sideLook: { mode: 'image', color: '#334455', dark: 60, blur: 10 } } }),
    async run(t) {
      const v = (k) => t.d.documentElement.style.getPropertyValue(k);
      t.eq([v('--side-img'), v('--side-dark'), v('--side-color')], ['none', '1', '#334455'], 'solid fallback');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.ok(!t.$('#lookNote').hidden, 'note shown');
      t.eq(t.$('#lookNote').textContent, 'Upload a background on Home first.', 'note text');
    },
  },
  {
    area,
    name: 'sidebar look: removing the Home image updates the sidebar at once',
    page: 'newtab',
    fixture: () => {
      const f = base({ settings: { sideLook: { mode: 'image', color: '#1b1b1b', dark: 70, blur: 12 } } });
      f.store.homeBg = PNG;
      return f;
    },
    async run(t) {
      const v = (k) => t.d.documentElement.style.getPropertyValue(k);
      t.ok(v('--side-img').includes(PNG), 'image at start');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('.set-tab[data-tab="home"]'));
      t.click(t.$$('#settingsView button').find((b) => b.textContent === 'Remove image'));
      await t.settle();
      t.eq(v('--side-img'), 'none', 'sidebar image removed');
      t.eq(v('--side-dark'), '1', 'solid color again');
    },
  },
  {
    area,
    name: 'sidebar theme: custom color is saved as hex and derives the other tokens',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.type(t.$('#themeSwatches input[type=color]'), '#ff00aa');
      await t.settle();
      t.eq(t.settings().theme, '#ff00aa', 'saved');
      t.eq(t.d.documentElement.style.getPropertyValue('--accent'), '#ff00aa', 'accent applied');
      t.ok(t.d.documentElement.style.getPropertyValue('--accent-bg').includes('color-mix'), 'accent-bg derived');
      t.ok(t.$('#themeSwatches .theme-custom.on'), 'custom marked');
    },
  },
  {
    area,
    name: 'sidebar counts include links inside sections; Unsorted holds loose links',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.eq(t.nav('Sprint tasks').querySelector('.n').textContent, '3', 'Sprint tasks count');
      t.eq(t.nav('Unsorted').querySelector('.n').textContent, '1', 'Unsorted count');
      t.eq(t.nav('Empty').querySelector('.n').textContent, '0', 'Empty count');
    },
  },
  {
    area,
    name: 'open folder: title, link count, rows and env badges',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.eq(t.$('.head h2').textContent, 'Shop API', 'heading');
      t.eq(t.$('.head .cnt').textContent, '4 links', 'count');
      t.eq(t.rowIds(), ['31', '32', '33', '34'], 'rows in Chrome order');
      t.eq(
        t.$$('#page .row .badge').map((b) => b.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'env badges',
      );
      t.ok(t.$('#homeBtn:not(.on)'), 'Home no longer selected');
    },
  },
  {
    area,
    name: 'Unsorted is virtual: no rename button and no New section',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Unsorted');
      t.ok(!t.$('.head button[aria-label="Rename folder"]'), 'no rename');
      t.ok(!t.$('.newPart'), 'no New section');
      t.eq(t.rowIds(), ['60'], 'loose link row');
    },
  },
  {
    area,
    name: 'empty folder shows empty state and New section button',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Empty');
      t.ok(t.$('#body .empty')?.textContent.startsWith('Empty folder'), 'empty text');
      t.ok(t.$('.newPart'), 'New section button');
    },
  },
  {
    area,
    name: 'drag folder reorders sidebar in settings only; Chrome tree unchanged',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.drag(t.nav('GITHUB - PIN'), t.nav('Sprint tasks'), 'before');
      await t.settle();
      t.eq(t.settings().order.slice(0, 2), ['40', '20'], 'saved order');
      t.eq(t.kids('10'), ['20', '30', '40', '50', '60'], 'Chrome order unchanged');
      t.eq(t.navTitles().slice(0, 2), ['GITHUB - PIN', 'Sprint tasks'], 'sidebar shows new order');
      await t.reload();
      t.eq(t.navTitles().slice(0, 2), ['GITHUB - PIN', 'Sprint tasks'], 'order survives reload');
    },
  },
  {
    area,
    name: 'Alt+ArrowDown moves a folder down; Alt+ArrowUp at the top does nothing',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.key(t.nav('Sprint tasks'), 'ArrowDown', { altKey: true });
      await t.settle();
      t.eq(t.settings().order.slice(0, 2), ['30', '20'], 'moved down');
      t.key(t.nav('Shop API'), 'ArrowUp', { altKey: true });
      await t.settle();
      t.eq(t.settings().order.slice(0, 2), ['30', '20'], 'top item cannot move up');
    },
  },
  {
    area,
    name: 'drop a link on a sidebar folder moves the bookmark',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.drag(t.row('31'), t.nav('GITHUB - PIN'));
      await t.settle();
      t.eq(t.node('31').parentId, '40', 'new parent');
      t.ok(t.toast()?.textContent.includes('Moved to GITHUB - PIN'), 'toast');
    },
  },
  {
    area,
    name: 'drop a link on the Home button adds it to the Home folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('GITHUB - PIN');
      t.drag(t.row('41'), t.$('#homeBtn'));
      await t.settle();
      t.eq(t.node('41').parentId, '70', 'moved to Home folder');
    },
  },
  {
    area,
    name: 'manual reorder: drop after / before use the same-parent index rule',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.drag(t.row('31'), t.row('32'), 'after');
      await t.settle();
      t.eq(t.kids('30'), ['32', '31', '33', '34'], 'drop after next row');
      t.drag(t.row('34'), t.row('32'), 'before');
      await t.settle();
      t.eq(t.kids('30'), ['34', '32', '31', '33'], 'drop before first row');
      t.drag(t.row('34'), t.row('33'), 'after');
      await t.settle();
      t.eq(t.kids('30'), ['32', '31', '33', '34'], 'drop after last row');
      t.drag(t.row('31'), t.row('32'), 'before');
      await t.settle();
      t.eq(t.kids('30'), ['31', '32', '33', '34'], 'drop before previous row');
    },
  },
  {
    area,
    name: 'row reorder is off outside Manual sort; sort is saved per folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.type(t.$('select[aria-label="Sort"]'), 'name');
      await t.settle();
      t.eq(t.settings().folders['30'].sort, 'name', 'sort saved');
      t.eq(t.rowIds(), ['34', '31', '33', '32'], 'sorted by name');
      t.ok(!t.drag(t.row('31'), t.row('34'), 'before'), 'row refuses the drop');
      await t.settle();
      t.eq(t.kids('30'), ['31', '32', '33', '34'], 'Chrome order unchanged');
      t.ok(t.$('#body .subnote')?.textContent.includes('Manual sort'), 'note shown');
    },
  },
  {
    area,
    name: 'Tag sort shows collapsible tag groups',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.eq(t.$('select[aria-label="Sort"] option[value="env"]').textContent, 'Tag', 'sort name');
      t.type(t.$('select[aria-label="Sort"]'), 'env');
      await t.settle();
      t.eq(
        t.$$('#body .grp').map((g) => g.classList[1]),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'env groups',
      );
      t.click(t.$('#body .grp.PROD'));
      await t.settle();
      t.eq(t.settings().folders['30'].closed.PROD, true, 'PROD collapsed');
      t.ok(!t.row('31'), 'PROD row hidden');
    },
  },
  {
    area,
    name: 'URL mode shows URL first and is saved per folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'URL'));
      await t.settle();
      t.eq(t.settings().folders['30'].show, 'url', 'show saved');
      t.ok(t.row('31').classList.contains('url-mode'), 'url-mode row');
      t.eq(t.row('31').querySelector('.url').textContent, 'shop.example.com/api/x', 'full URL text');
    },
  },
  {
    area,
    name: 'title equal to URL is printed once',
    page: 'newtab',
    fixture: () => base({ extraRoot: [F('55', 'Dup', [L('56', 'https://dup.example.com/a', 'https://dup.example.com/a')])] }),
    async run(t) {
      await t.folder('Dup');
      t.eq(t.row('56').querySelector('.url').textContent, '', 'no second URL line in Title mode');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'URL'));
      await t.settle();
      t.eq(t.row('56').querySelector('.ttl').textContent, '', 'no title line in URL mode');
    },
  },
  {
    area,
    name: 'Tag matrix lays out one row with all four built-in tags',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'Tag matrix'));
      await t.settle();
      t.eq(t.$$('.matrix tbody tr').length, 1, 'one path row');
      t.eq(
        t.$$('.matrix .pill:not(.derive):not(.none)').map((p) => p.classList[1]),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'pills',
      );
    },
  },
  {
    area,
    name: 'folder filter narrows rows; no match shows a message',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      const f = t.$('.toolbar input[type="search"]');
      t.type(f, 'stage');
      await t.settle();
      t.eq(t.rowIds(), ['33'], 'one match');
      t.type(t.$('.toolbar input[type="search"]'), 'zzz');
      await t.settle();
      t.eq(t.$('#body .empty')?.textContent, 'Nothing matches the filter.', 'no-match text');
    },
  },
  {
    area,
    name: 'edit link: URL field is visible and Save updates the bookmark',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.row('31').querySelector('.act[aria-label="Edit title and URL"]'));
      const url = t.$('.edit input.url-in');
      t.ok(url && url.offsetParent !== null && url.getBoundingClientRect().width > 100, 'URL input visible and wide');
      t.eq(url?.value, 'https://shop.example.com/api/x', 'URL prefilled');
      url.value = 'shop.example.com/new';
      t.$('.edit input:not(.url-in)').value = 'Renamed';
      t.click(t.$('.edit button[type="submit"]'));
      await t.settle();
      t.eq(t.node('31').url, 'https://shop.example.com/new', 'URL saved with https');
      t.eq(t.node('31').title, 'Renamed', 'title saved');
    },
  },
  {
    area,
    name: 'edit link: a URL without a scheme is accepted (no browser validation block)',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.row('32').querySelector('.act[aria-label="Edit title and URL"]'));
      t.ok(t.$('.edit')?.noValidate, 'form has novalidate');
      t.$('.edit input.url-in').value = 'test.shop.example.com/other';
      t.click(t.$('.edit button[type="submit"]'));
      await t.settle();
      t.eq(t.node('32').url, 'https://test.shop.example.com/other', 'saved');
    },
  },
  {
    area,
    name: 'edit link with an invalid URL shows an error and keeps the bookmark',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.row('31').querySelector('.act[aria-label="Edit title and URL"]'));
      t.$('.edit input.url-in').value = '[invalid';
      t.click(t.$('.edit button[type="submit"]'));
      await t.settle();
      t.ok(t.toast()?.textContent.startsWith("Couldn't save"), 'error toast');
      t.eq(t.node('31').url, 'https://shop.example.com/api/x', 'URL unchanged');
    },
  },
  {
    area,
    name: 'Cancel and Escape leave the bookmark unchanged',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.row('31').querySelector('.act[aria-label="Edit title and URL"]'));
      t.$('.edit input.url-in').value = 'https://changed.example.com';
      t.click(t.$$('.edit button').find((b) => b.textContent === 'Cancel'));
      await t.settle();
      t.ok(!t.$('.edit'), 'form closed');
      t.eq(t.node('31').url, 'https://shop.example.com/api/x', 'unchanged');
    },
  },
  {
    area,
    name: 'delete link shows Undo; Undo restores it at the same position',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('32'));
      t.menu('Delete');
      await t.settle();
      t.ok(!t.node('32'), 'deleted');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('30').children[1];
      t.eq([back?.title, back?.url], ['Shop TEST', 'https://test.shop.example.com/api/x'], 'restored at index 1');
    },
  },
  {
    area,
    name: 'delete icon beside edit deletes the link without opening it; Undo restores it',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      const tabs = t.tabs.length;
      const acts = [...t.row('32').querySelectorAll('.acts .act')];
      t.eq(
        acts.map((b) => b.getAttribute('aria-label')),
        ['Edit title and URL', 'Delete link', 'Link menu'],
        'delete sits between edit and the menu',
      );
      t.ok(acts[1].getBoundingClientRect().height >= 28, 'at least 28 px tall');
      t.click(acts[1]);
      await t.settle();
      t.ok(!t.node('32'), 'deleted');
      t.eq(t.tabs.length, tabs, 'no tab opened');
      t.ok(t.toast()?.textContent.includes('Deleted'), 'toast shown');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('30').children[1];
      t.eq([back?.title, back?.url], ['Shop TEST', 'https://test.shop.example.com/api/x'], 'restored at index 1');
    },
  },
  {
    area,
    name: 'link menu offers Open on other envs from the host map',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      const labels = t.menuLabels();
      t.ok(
        ['Open on TEST', 'Open on STAGE', 'Open on LOCAL'].every((l) => labels.includes(l)),
        `derive items (${labels.join(', ')})`,
      );
      t.menu('Open on TEST');
      t.eq(t.tabs.at(-1)?.url, 'https://test.shop.example.com/api/x', 'opened derived URL');
    },
  },
  {
    area,
    name: 'folder menu: Open all opens every link including sections',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.context(t.nav('Sprint tasks'));
      t.menu('Open all (3)');
      t.eq(t.tabs.length, 3, 'three tabs');
      t.ok(
        t.tabs.every((x) => x.active === false),
        'background tabs',
      );
    },
  },
  {
    area,
    name: 'New folder creates a folder under the root and opens it',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.answer('Fresh folder');
      t.click(t.$('#newFolderBtn'));
      await t.settle();
      const f = t.node('10').children.find((c) => c.title === 'Fresh folder');
      t.ok(f && !f.url, 'folder created under root');
      t.ok(t.nav('Fresh folder'), 'shown in sidebar');
    },
  },
  {
    area,
    name: 'delete folder asks first; cancel keeps it',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.confirm(false);
      t.context(t.nav('GITHUB - PIN'));
      t.menu('Delete folder…');
      await t.settle();
      t.ok(t.node('40'), 'kept after cancel');
      t.confirm(true);
      t.context(t.nav('GITHUB - PIN'));
      t.menu('Delete folder…');
      await t.settle();
      t.ok(!t.node('40'), 'deleted after confirm');
    },
  },
  {
    area,
    name: 'global search finds links in sections and shows the section crumb',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.type(t.$('#q'), '#100');
      await t.settle();
      t.eq(t.rowIds(), ['24'], 'one hit');
      t.eq(t.row('24').querySelector('.crumb')?.textContent, 'Sprint tasks › Blocked', 'crumb');
      t.key(t.$('#q'), 'Escape');
      await t.settle();
      t.ok(t.$('#home'), 'back to Home after Escape');
    },
  },
  {
    area,
    name: 'j / k move through Home, Board and folders in sidebar order',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.d.activeElement?.blur();
      t.key(t.d, 'j');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Board', 'j from Home goes to the Board');
      t.d.activeElement?.blur();
      t.key(t.d, 'j');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Sprint tasks', 'j from the Board goes to first folder');
      t.d.activeElement?.blur();
      t.key(t.d, 'k');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Board', 'k goes back to the Board');
      t.d.activeElement?.blur();
      t.key(t.d, 'k');
      await t.settle();
      t.ok(t.$('#home'), 'k goes back to Home');
    },
  },
  {
    area,
    name: 'sidebar width: keyboard resize clamps, persists and survives reload',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const r = t.$('#resizer');
      for (let i = 0; i < 10; i++) t.key(r, 'ArrowLeft');
      await t.sleep(450);
      t.eq(Math.round(t.$('.side').getBoundingClientRect().width), 180, 'clamped to 180');
      t.eq(t.settings().sideWidth, 180, 'saved');
      await t.reload();
      t.eq(Math.round(t.$('.side').getBoundingClientRect().width), 180, 'width after reload');
      t.dblclick(t.$('#resizer'));
      await t.settle();
      t.eq(t.settings().sideWidth, 264, 'double-click resets');
    },
  },
  {
    area,
    name: 'sidebar width: pointer drag resizes and saves on release',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const r = t.$('#resizer');
      const x = r.getBoundingClientRect().left;
      const P = (type, clientX) => r.dispatchEvent(new t.w.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX }));
      P('pointerdown', x);
      P('pointermove', x + 60);
      await t.sleep(50);
      P('pointerup', x + 60);
      await t.settle();
      t.eq(t.settings().sideWidth, 324, 'saved width');
      t.eq(r.getAttribute('aria-valuenow'), '324', 'aria value');
    },
  },
  {
    area,
    name: 'brand: header shows the extension icon and "Tab Warehouse", not the root folder name',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.eq(t.$('#brandTitle').textContent, 'Tab Warehouse', 'header title');
      t.ok(t.$('#logo').getAttribute('src').endsWith('icons/icon48.png'), 'extension icon');
      t.eq(t.d.title, 'Tab Warehouse', 'browser tab title');
    },
  },
  {
    area,
    name: 'brand: the name in Settings › Appearance changes the header and the tab title; empty goes back',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.type(t.$('#userName'), '  Sumonta ');
      await t.settle();
      t.eq(t.settings().userName, 'Sumonta', 'saved trimmed');
      t.eq(t.$('#brandTitle').textContent, "Sumonta's Warehouse", 'header title');
      t.eq(t.d.title, "Sumonta's Warehouse", 'browser tab title');
      t.type(t.$('#userName'), '');
      await t.settle();
      t.eq(t.settings().userName, '', 'cleared');
      t.eq(t.$('#brandTitle').textContent, 'Tab Warehouse', 'back to product name');
    },
  },
  {
    area,
    name: 'brand: a saved name shows on load',
    page: 'newtab',
    fixture: () => base({ settings: { userName: 'Ana' } }),
    async run(t) {
      t.eq(t.$('#brandTitle').textContent, "Ana's Warehouse", 'header title');
      t.eq(t.d.title, "Ana's Warehouse", 'browser tab title');
    },
  },
  {
    area,
    name: 'sidebar footer: Made by Sumonta with GitHub and portfolio links at the bottom',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const foot = t.$('#sideFoot');
      t.ok(foot.textContent.includes('Made by Sumonta'), 'credit text');
      t.eq(foot, t.$('.side').lastElementChild, 'last item in the sidebar');
      for (const [id, url, label] of [
        ['#ghLink', 'https://github.com/sumonta056', 'GitHub'],
        ['#webLink', 'https://sumonta056.vercel.app/', 'Portfolio'],
      ]) {
        const a = t.$(id);
        t.eq(a.getAttribute('href'), url, `${label} URL`);
        t.eq(a.getAttribute('target'), '_blank', `${label} opens a new tab`);
        t.eq(a.getAttribute('rel'), 'noopener', `${label} rel`);
        t.eq(a.getAttribute('aria-label'), label, `${label} name`);
        t.ok(a.getBoundingClientRect().height >= 28, `${label} is at least 28 px tall`);
      }
    },
  },
  {
    area,
    name: 'text size: sidebar and page sliders scale only their own pane and save after 300 ms',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const px = (el) => +parseFloat(t.w.getComputedStyle(el).fontSize).toFixed(2);
      const r = (n) => +n.toFixed(2);
      t.click(t.$('#settingsBtn'));
      await t.settle();
      const side0 = px(t.$('#brandTitle')),
        page0 = px(t.$('.set-card h3'));
      t.eq([t.$('#fontSide').value, t.$('#fontPage').value], ['100', '100'], 'default 100 %');
      t.eq([t.$('#fontSide').step, t.$('#fontSide').min, t.$('#fontSide').max], ['5', '80', '140'], 'range 80-140 in steps of 5');
      t.type(t.$('#fontSide'), '120');
      await t.settle();
      t.eq(px(t.$('#brandTitle')), r(side0 * 1.2), 'sidebar text grows at once');
      t.eq(px(t.$('.set-card h3')), page0, 'page text unchanged');
      t.ok(t.settings().fontSide !== 120, 'not saved yet (debounced)');
      await t.sleep(350);
      t.eq(t.settings().fontSide, 120, 'sidebar size saved');
      t.type(t.$('#fontPage'), '80');
      await t.sleep(350);
      t.eq(px(t.$('.set-card h3')), r(page0 * 0.8), 'page text shrinks');
      t.eq(px(t.$('#brandTitle')), r(side0 * 1.2), 'sidebar text unchanged');
      t.eq(t.settings().fontPage, 80, 'page size saved');
    },
  },
  {
    area,
    name: 'text size: the Board slider changes only the Board text',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const px = (el) => +parseFloat(t.w.getComputedStyle(el).fontSize).toFixed(2);
      const r = (n) => +n.toFixed(2);
      t.click(t.$('#boardBtn'));
      await t.settle();
      const card0 = px(t.$('#page .bcard-ttl'));
      t.click(t.$('#settingsBtn'));
      await t.settle();
      const page0 = px(t.$('.set-card h3')),
        side0 = px(t.$('#brandTitle'));
      const sl = t.$('#fontBoard');
      t.ok(sl, 'Board slider');
      t.eq(
        t
          .$$('.set-card input[type=range]')
          .filter((i) => /^font/.test(i.id))
          .map((i) => i.id),
        ['fontSide', 'fontPage', 'fontBoard'],
        'third slider, after Page',
      );
      t.eq([sl.value, sl.step, sl.min, sl.max], ['100', '5', '80', '140'], 'default 100 %, 80-140 in steps of 5');
      t.type(sl, '120');
      await t.settle();
      t.eq(px(t.$('.set-card h3')), page0, 'Settings page text unchanged');
      t.eq(px(t.$('#brandTitle')), side0, 'sidebar text unchanged');
      t.ok(t.settings().fontBoard !== 120, 'not saved yet (debounced)');
      await t.sleep(350);
      t.eq(t.settings().fontBoard, 120, 'Board size saved');
      t.type(t.$('#fontPage'), '80');
      await t.sleep(350);
      t.click(t.$('#boardBtn'));
      await t.settle();
      t.eq(px(t.$('#page .bcard-ttl')), r(card0 * 1.2), 'Board text uses the Board size, not the Page size');
      t.click(t.$('#homeBtn'));
      await t.settle();
      t.click(t.$('.nav[data-id="30"]'));
      await t.settle();
      t.eq(t.d.documentElement.style.getPropertyValue('--fs-page'), '0.8', 'folder pages keep the Page size');
    },
  },
  {
    area,
    name: 'text size: saved sizes apply on load; bad values fall back to 100 %',
    page: 'newtab',
    fixture: () => base({ settings: { fontSide: 140, fontPage: 'big', fontBoard: 80 } }),
    async run(t) {
      const root = t.d.documentElement.style;
      t.eq(root.getPropertyValue('--fs-side'), '1.4', 'sidebar scale');
      t.eq(root.getPropertyValue('--fs-page'), '1', 'page scale falls back');
      t.eq(root.getPropertyValue('--fs-board'), '0.8', 'board scale');
    },
  },
];
