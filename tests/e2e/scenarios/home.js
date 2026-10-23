import { base, F, L } from '../fixtures.js';

const area = 'home';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const homeKids = (t) => t.kids(t.settings().home.folderId);
const tile = (t, id) => t.$(`#home .tile[data-id="${id}"]`);
const panelInput = (t, label) => t.$(`#settingsView input[aria-label="${label}"]`);
const panelCheck = panelInput;
const openHomeSettings = async (t) => {
  t.click(t.$('#settingsBtn'));
  await t.settle();
  t.click(t.$('.set-tab[data-tab="home"]'));
};
const done = async (t) => {
  t.click(t.$('.set-done'));
  await t.settle();
};

export default [
  {
    area,
    name: 'fresh install: creates one empty Home folder in Other bookmarks, with no built-in links or icons',
    page: 'newtab',
    fixture: () => base({ home: false, settings: { rootName: undefined } }),
    async run(t) {
      const home = t.settings().home;
      const folder = t.node(home.folderId);
      t.eq([folder?.title, folder?.parentId], ['Home', '2'], 'folder under Other bookmarks');
      t.eq(folder.children.length, 0, 'no links');
      t.eq(Object.keys(t.store.homeIcons || {}).length, 0, 'no icon overrides');
      t.eq(t.$$('#home .tile[data-id]').length, 0, 'no tiles');
      t.ok(!t.$('#home .tile.add'), 'no Add link tile');
      t.ok(t.$('#home .home-empty')?.textContent.startsWith('Add the sites you use most in Settings › Home page.'), 'help text points to settings');
      t.eq(t.settings().rootName, '', 'no company root folder name');
      await t.reload();
      t.eq(t.node('2').children.filter((c) => c.title === 'Home').length, 1, 'still one Home folder after reload');
      t.eq(t.node(home.folderId).children.length, 0, 'still empty');
    },
  },
  {
    area,
    name: 'empty Home: the first added link replaces the help text',
    page: 'newtab',
    fixture: () => base({ home: false }),
    async run(t) {
      await openHomeSettings(t);
      t.type(panelInput(t, 'New link URL'), 'example.org');
      t.click(t.$('.home-add button[type="submit"]'));
      await t.settle();
      await done(t);
      t.eq(homeKids(t).length, 1, 'link added');
      t.ok(!t.$('#home .home-empty'), 'help text gone');
    },
  },
  {
    area,
    name: 'existing install keeps its own Home links and icons on update',
    page: 'newtab',
    fixture: () => base({ homeIcons: { 71: 'https://icons.example.com/gh.png' }, settings: { home: { folderId: '70', seeded: true } } }),
    async run(t) {
      t.eq(t.kids('70'), ['71', '72', '73'], 'links unchanged');
      t.eq(t.store.homeIcons, { 71: 'https://icons.example.com/gh.png' }, 'icons unchanged');
      t.eq(t.settings().rootName, 'My Links', 'saved root folder name kept');
      t.eq(t.navTitles()[0], 'Sprint tasks', 'sidebar still uses the saved root folder');
      t.ok(!t.$('#home .home-empty'), 'no help text when Home has links');
    },
  },
  {
    area,
    name: 'an existing "Home" folder with links is adopted as it is',
    page: 'newtab',
    fixture: () => base({ home: false, other: [F('80', 'Home', [L('81', 'Mine', 'https://mine.example.com/')])] }),
    async run(t) {
      t.eq(t.settings().home.folderId, '80', 'adopted');
      t.eq(t.kids('80'), ['81'], 'nothing added');
    },
  },
  {
    area,
    name: 'a deleted Home folder is recreated empty',
    page: 'newtab',
    fixture: () => {
      const fx = base();
      fx.tree.children[1].children = [];
      return fx;
    },
    async run(t) {
      const id = t.settings().home.folderId;
      t.ok(id && id !== '70', 'new folder id');
      t.eq(t.kids(id).length, 0, 'empty');
      t.ok(t.$('#home .home-empty'), 'help text shown');
    },
  },
  {
    area,
    name: 'tiles follow folder order and open in the same tab by default',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.eq(
        t.$$('#home .tile[data-id]').map((a) => a.dataset.id),
        ['71', '72', '73'],
        'order',
      );
      t.eq(tile(t, '71').getAttribute('href'), 'https://github.com/', 'href');
      t.ok(!tile(t, '71').hasAttribute('target'), 'same tab');
      t.eq(tile(t, '73').querySelector('.lbl').textContent, 'Example', 'label');
    },
  },
  {
    area,
    name: 'Open in new tab setting adds target=_blank and is saved',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openHomeSettings(t);
      const cb = panelCheck(t, 'Open in new tab');
      cb.checked = true;
      cb.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      await t.sleep(450);
      await done(t);
      t.eq(tile(t, '71')?.getAttribute('target'), '_blank', 'new tab');
      t.eq(tile(t, '71')?.getAttribute('rel'), 'noopener', 'noopener');
      t.eq(t.settings().home.newTab, true, 'saved');
    },
  },
  {
    area,
    name: 'Google apps use the official product icon',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const src = tile(t, '72').querySelector('img')?.getAttribute('src') || '';
      t.ok(src.includes('drive_2020q4_48dp.png'), `Drive icon (${src})`);
    },
  },
  {
    area,
    name: 'custom icon from storage wins over the favicon',
    page: 'newtab',
    fixture: () => base({ homeIcons: { 73: PNG } }),
    async run(t) {
      t.eq(tile(t, '73').querySelector('img')?.getAttribute('src'), PNG, 'custom src');
      t.ok(tile(t, '73').querySelector('.ic').classList.contains('custom'), 'uploaded icons fill the tile');
    },
  },
  {
    area,
    name: 'drag a tile to reorder; drop on empty grid space moves it to the end',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.drag(tile(t, '73'), tile(t, '71'));
      await t.settle();
      t.eq(t.kids('70'), ['73', '71', '72'], 'moved to front');
      t.drag(tile(t, '73'), t.$('#home .home-tiles'));
      await t.settle();
      t.eq(t.kids('70'), ['71', '72', '73'], 'moved to end');
    },
  },
  {
    area,
    name: 'Home has no Add link tile; links are added in settings',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.ok(!t.$('#home .tile.add'), 'no Add link tile');
      t.eq(t.$$('#home .tile').length, 3, 'only link tiles');
    },
  },
  {
    area,
    name: 'a missing favicon tries the site root, then shows the letter icon',
    page: 'newtab',
    fixture: () => base({ other: [F('70', 'Home', [L('74', 'Chess', 'https://www.chess.com/home')])], settings: { home: { folderId: '70' } } }),
    async run(t) {
      const ic = tile(t, '74')?.querySelector('.ic');
      for (let i = 0; i < 20 && ic?.querySelector('img'); i++) await t.sleep(25);
      t.ok(ic && !ic.querySelector('img'), 'no broken image left');
      t.ok(ic?.classList.contains('letter'), 'letter icon');
      t.eq(ic?.textContent, 'Ch', 'letter from the name');
    },
  },
  {
    area,
    name: 'Remove tile shows Undo; Undo restores it at the same position with its icon',
    page: 'newtab',
    fixture: () => base({ homeIcons: { 72: 'https://icons.example.com/d.png' } }),
    async run(t) {
      t.context(tile(t, '72'));
      t.menu('Remove');
      await t.settle();
      t.eq(t.kids('70'), ['71', '73'], 'removed');
      t.ok(!t.store.homeIcons['72'], 'icon entry removed');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('70').children[1];
      t.eq(back.url, 'https://drive.google.com/drive/u/0/my-drive', 'restored at index 1');
      t.eq(t.store.homeIcons[back.id], 'https://icons.example.com/d.png', 'icon restored');
    },
  },
  {
    area,
    name: 'Icon from URL and Use site icon',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.answer('icons.example.com/x.png');
      t.context(tile(t, '73'));
      t.menu('Icon from URL…');
      await t.settle();
      t.eq(t.store.homeIcons['73'], 'https://icons.example.com/x.png', 'saved with https');
      t.answer(PNG);
      t.context(tile(t, '73'));
      t.menu('Icon from URL…');
      await t.settle();
      t.eq(tile(t, '73').querySelector('img')?.getAttribute('src'), PNG, 'rendered');
      t.context(tile(t, '73'));
      t.menu('Use site icon');
      await t.settle();
      t.ok(!t.store.homeIcons['73'], 'cleared');
    },
  },
  {
    area,
    name: 'Edit name / URL updates the bookmark',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.answer('Example 2', 'example.org');
      t.context(tile(t, '73'));
      t.menu('Edit name / URL');
      await t.settle();
      t.eq([t.node('73').title, t.node('73').url], ['Example 2', 'https://example.org'], 'updated');
    },
  },
  {
    area,
    name: 'Home page settings: sliders update the preview at once and save after a short delay',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openHomeSettings(t);
      const pv = t.$('#homePreview');
      const dark = panelInput(t, 'Darkness');
      dark.value = '30';
      dark.dispatchEvent(new t.w.Event('input', { bubbles: true }));
      t.eq(pv.style.getPropertyValue('--dark'), '0.3', 'preview applied at once');
      t.ok(t.settings().home.dark !== 30, 'not saved yet (debounced)');
      const size = panelInput(t, 'Size');
      size.value = '100';
      size.dispatchEvent(new t.w.Event('input', { bubbles: true }));
      t.eq(pv.style.getPropertyValue('--clock'), '100px', 'clock size in preview');
      const gap = panelInput(t, 'Space above tiles');
      t.eq(gap?.value, '80', 'space above tiles defaults to 80');
      gap.value = '120';
      gap.dispatchEvent(new t.w.Event('input', { bubbles: true }));
      t.eq(pv.style.getPropertyValue('--tiles-gap'), '120px', 'space above tiles in preview');
      await t.sleep(450);
      t.eq([t.settings().home.dark, t.settings().home.clockSize, t.settings().home.tilesGap], [30, 100, 120], 'saved');
      t.eq(t.$('.set-status').textContent, 'Saved', 'status says Saved');
      await done(t);
      t.eq(t.$('#home').style.getPropertyValue('--dark'), '0.3', 'Home uses the new value');
      t.eq(t.$('#home').style.getPropertyValue('--tiles-gap'), '120px', 'Home uses the new space above tiles');
      t.eq(t.w.getComputedStyle(t.$('#home .home-date')).marginBottom, '120px', 'date margin follows the setting');
      await t.reload();
      t.eq(t.$('#home').style.getPropertyValue('--dark'), '0.3', 'survives reload');
    },
  },
  {
    area,
    name: 'Home has no settings cog; the sidebar gear is the only settings button',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.ok(!t.$('.home-gear') && !t.$('.home-panel'), 'no cog or panel on Home');
      t.eq(
        t.$$('button[aria-label*="ettings"]').map((b) => b.id),
        ['settingsBtn'],
        'one settings button',
      );
      t.ok(!t.$('dialog'), 'no settings dialog');
    },
  },
  {
    area,
    name: 'Settings fills the right pane with 5 tabs; Done and Escape return to the previous page',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      const view = t.$('#settingsView');
      t.ok(view, 'settings view rendered');
      t.ok(t.$('#page').contains(view), 'inside the right pane');
      t.ok(t.$('#settingsBtn').classList.contains('on'), 'gear marked on');
      t.eq(
        t.$$('.set-tab').map((b) => b.textContent),
        ['Appearance', 'Home page', 'Bookmarks', 'Duplicates', 'Tags', 'Backup'],
        'tabs',
      );
      t.eq(t.$('.set-tab.on').dataset.tab, 'appearance', 'first tab by default');
      t.ok(view.contains(t.d.activeElement), 'focus moved into settings');
      t.eq(t.d.documentElement.scrollWidth, t.d.documentElement.clientWidth, 'no horizontal overflow');
      t.click(t.$('.set-done'));
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Shop API', 'Done returns to the folder');
      t.eq(t.d.activeElement, t.$('#settingsBtn'), 'focus back on the gear');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('.set-tab[data-tab="env"]'));
      t.key(t.$('.set-tab.on'), 'Escape');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Shop API', 'Escape returns to the folder');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.eq(t.$('.set-tab.on').dataset.tab, 'env', 'last tab remembered');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.ok(!t.$('#settingsView'), 'gear again closes settings');
    },
  },
  {
    area,
    name: 'Settings tabs: arrow keys move between tabs; every tab renders its controls',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.key(t.$('.set-tab.on'), 'ArrowRight');
      t.eq(t.$('.set-tab.on').dataset.tab, 'home', 'ArrowRight');
      t.eq(t.d.activeElement, t.$('.set-tab.on'), 'focus follows');
      t.key(t.$('.set-tab.on'), 'ArrowLeft');
      t.key(t.$('.set-tab.on'), 'ArrowLeft');
      t.eq(t.$('.set-tab.on').dataset.tab, 'backup', 'ArrowLeft wraps');
      const want = { appearance: '#themeSwatches', home: '#homePreview', bookmarks: '#rootSelect', dupes: '#dupCard', env: '#envTry', backup: '#exportJson' };
      for (const [k, sel] of Object.entries(want)) {
        t.click(t.$(`.set-tab[data-tab="${k}"]`));
        t.ok(t.$(`#settingsView ${sel}`), `${k} tab shows ${sel}`);
      }
    },
  },
  {
    area,
    name: 'Settings: site favicons save without a Save button',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('.set-tab[data-tab="bookmarks"]'));
      const fav = panelInput(t, 'Site favicons');
      fav.checked = false;
      fav.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      await t.settle();
      t.eq(t.settings().showFavicons, false, 'favicons saved');
    },
  },
  {
    area,
    name: 'Show names off hides labels',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openHomeSettings(t);
      const cb = panelCheck(t, 'Show names');
      cb.checked = false;
      cb.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      t.ok(t.$('#homePreview').classList.contains('no-labels'), 'labels hidden in preview');
      await t.sleep(450);
      await done(t);
      t.ok(t.$('#home').classList.contains('no-labels'), 'labels hidden on Home');
    },
  },
  {
    area,
    name: 'clock: 12-hour with seconds by default; 24-hour without seconds when set',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.ok(/^(1[0-2]|[1-9]):\d{2}:\d{2}$/.test(t.$('#homeClock').textContent), `12h text (${t.$('#homeClock').textContent})`);
      t.ok(t.$('#homeDate').textContent.length > 4, 'date shown');
      t.store.settings.home = { ...t.store.settings.home, h24: true, seconds: false, date: false };
      await t.reload();
      t.ok(/^\d{2}:\d{2}$/.test(t.$('#homeClock').textContent), `24h text (${t.$('#homeClock').textContent})`);
      t.eq(t.$('#homeDate').textContent, '', 'date hidden');
    },
  },
  {
    area,
    name: 'settings stay open on the same tab when bookmarks change elsewhere',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openHomeSettings(t);
      await t.w.chrome.bookmarks.create({ parentId: '70', title: 'x', url: 'https://x.example.com' });
      await t.settle();
      t.ok(t.$('#settingsView'), 'still open after refresh');
      t.eq(t.$('.set-tab.on')?.dataset.tab, 'home', 'same tab');
      t.eq(t.$$('#settingsView .home-link').length, 4, 'links list updated');
    },
  },
  {
    area,
    name: 'Home links list in settings: shows links in order, removes with Undo',
    page: 'newtab',
    fixture: () => base({ homeIcons: { 72: 'https://icons.example.com/d.png' } }),
    async run(t) {
      await openHomeSettings(t);
      const rows = () => t.$$('#settingsView .home-link').map((r) => r.dataset.id);
      t.eq(rows(), ['71', '72', '73'], 'list follows Home folder order');
      t.ok(
        t.$$('#settingsView .set-card h3').some((l) => l.textContent === 'Links (3)'),
        'card title shows count',
      );
      t.click(t.$('#settingsView .home-link[data-id="72"] .x'));
      await t.settle();
      t.eq(t.kids('70'), ['71', '73'], 'removed from Home folder');
      t.eq(rows(), ['71', '73'], 'list updated');
      t.eq(t.$('.set-tab.on')?.dataset.tab, 'home', 'settings stay on the Home page tab');
      t.ok(!t.store.homeIcons['72'], 'icon entry removed');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('70').children[1];
      t.eq(back.url, 'https://drive.google.com/drive/u/0/my-drive', 'Undo restores at index 1');
      t.eq(t.store.homeIcons[back.id], 'https://icons.example.com/d.png', 'icon restored');
    },
  },
  {
    area,
    name: 'Home links list in settings: add form adds https, name falls back to host, empty URL adds nothing',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openHomeSettings(t);
      t.type(panelInput(t, 'New link name'), 'HN');
      t.type(panelInput(t, 'New link URL'), 'news.ycombinator.com');
      t.click(t.$('.home-add button[type="submit"]'));
      await t.settle();
      const last = t.node('70').children.at(-1);
      t.eq([last.title, last.url], ['HN', 'https://news.ycombinator.com'], 'created with https');
      t.ok(t.$(`#settingsView .home-link[data-id="${last.id}"]`), 'listed');
      t.type(panelInput(t, 'New link URL'), 'www.example.org/x');
      t.click(t.$('.home-add button[type="submit"]'));
      await t.settle();
      t.eq(t.node('70').children.at(-1).title, 'example.org', 'name from host without www');
      const n = t.kids('70').length;
      t.click(t.$('.home-add button[type="submit"]'));
      await t.settle();
      t.eq(t.kids('70').length, n, 'empty URL adds nothing');
    },
  },
  {
    area,
    name: 'Home links list in settings: drag to reorder uses the same-parent index rule',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openHomeSettings(t);
      const row = (id) => t.$(`#settingsView .home-link[data-id="${id}"]`);
      t.drag(row('73'), row('71'), 'before');
      await t.settle();
      t.eq(t.kids('70'), ['73', '71', '72'], 'drop before first');
      t.drag(row('73'), row('72'), 'after');
      await t.settle();
      t.eq(t.kids('70'), ['71', '72', '73'], 'drop after last');
    },
  },
  {
    area,
    name: 'Home links are not listed in global search or as a sidebar folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.ok(!t.nav('Home'), 'Home folder is not a sidebar item');
      t.type(t.$('#q'), 'example.com');
      await t.settle();
      t.eq(
        t.rowIds().filter((id) => id === '73'),
        [],
        'Home link not in search',
      );
    },
  },
  {
    area,
    name: 'background upload with full storage says so and keeps no image',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.H.storageQuota = JSON.stringify(t.store).length + 5000;
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('[data-tab=home]'));
      await t.settle();
      const c = t.d.createElement('canvas');
      c.width = c.height = 400;
      const g = c.getContext('2d');
      const px = g.createImageData(400, 400);
      for (let i = 0; i < px.data.length; i++) px.data[i] = (i * 2654435761) % 251;
      g.putImageData(px, 0, 0);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const dt = new t.w.DataTransfer();
      dt.items.add(new t.w.File([blob], 'bg.png', { type: 'image/png' }));
      const input = t.$('input[aria-label="Background image file"]');
      input.files = dt.files;
      input.dispatchEvent(new t.w.Event('change'));
      for (let i = 0; i < 500 && !t.toast(); i++) await fetch(`/tests/e2e/runner.html?wait=${i}`, { cache: 'no-store' });
      t.ok(t.toast()?.textContent.startsWith('Not enough storage space'), `says storage is full (${t.toast()?.textContent})`);
      t.ok(!('homeBg' in t.store), 'nothing saved');
      t.click(t.$('#homeBtn'));
      await t.settle();
      t.eq(t.$('.home-bg').style.backgroundImage, '', 'Home shows no unsaved image');
    },
  },
];
