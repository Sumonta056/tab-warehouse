import { base } from '../fixtures.js';

const area = 'categories';
const withCats = () =>
  base({
    settings: {
      categories: [
        { id: 'c1', name: 'Daily working', closed: false },
        { id: 'c2', name: 'Tools', closed: false },
      ],
      folderCat: { 20: 'c1', 30: 'c1' },
      order: ['20', '30', '40', '50'],
    },
  });
const sidebar = (t) =>
  t.$$('#nav > *').map((e) => (e.classList.contains('cat') ? `[${e.querySelector('.t').textContent}]` : e.querySelector('.t')?.textContent || e.textContent));

export default [
  {
    area,
    name: 'no categories: flat sidebar without headers',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.eq(t.$$('#nav .cat').length, 0, 'no headers');
    },
  },
  {
    area,
    name: 'New category, then drop a folder on its header',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.answer('Daily working');
      t.click(t.$('#newCatBtn'));
      await t.settle();
      const cat = t.settings().categories?.[0];
      t.eq(cat?.name, 'Daily working', 'category saved');
      t.drag(t.nav('Shop API'), t.catHeader('Daily working'));
      await t.settle();
      t.eq(t.settings().folderCat['30'], cat.id, 'folder assigned');
      t.eq(sidebar(t).slice(0, 3), ['[Daily working]', 'Shop API', '[No category]'], 'sidebar layout');
    },
  },
  {
    area,
    name: 'header shows "Name (count)"',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      const h = t.catHeader('Daily working');
      t.eq(h.querySelector('.n').textContent, '(2)', 'count in brackets');
      t.eq(t.catHeader('Tools').querySelector('.n').textContent, '(0)', 'empty category count');
      t.ok(t.$$('#nav .cat-empty').length === 1, 'empty category hint');
    },
  },
  {
    area,
    name: 'collapse a category hides its folders, persists, and j skips it',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.click(t.catHeader('Daily working').querySelector('.cat-toggle'));
      await t.settle();
      t.eq(t.settings().categories[0].closed, true, 'saved');
      t.ok(!t.nav('Sprint tasks') && !t.nav('Shop API'), 'folders hidden');
      await t.reload();
      t.ok(!t.nav('Sprint tasks'), 'still collapsed after reload');
      t.d.activeElement?.blur();
      t.key(t.d, 'j');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Board', 'j from Home goes to the Board');
      t.d.activeElement?.blur();
      t.key(t.d, 'j');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, "Today's top list", 'j from the Board goes to Today');
      t.d.activeElement?.blur();
      t.key(t.d, 'j');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'GITHUB - PIN', 'j skips collapsed folders');
    },
  },
  {
    area,
    name: 'folder menu: Move to <category> and Remove from category',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.context(t.nav('Shop API'));
      await t.menuShown();
      t.ok(!t.menuLabels().includes('Move to Daily working'), 'current category not offered');
      t.menu('Move to Tools');
      await t.settle();
      t.eq(t.settings().folderCat['30'], 'c2', 'moved to Tools');
      t.context(t.nav('Shop API'));
      await t.menuShown();
      t.menu('Remove from category');
      await t.settle();
      t.ok(!t.settings().folderCat['30'], 'removed');
    },
  },
  {
    area,
    name: 'drag a folder onto a folder in another category adopts that category',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.drag(t.nav('GITHUB - PIN'), t.nav('Sprint tasks'), 'before');
      await t.settle();
      t.eq(t.settings().folderCat['40'], 'c1', 'category adopted');
      t.eq(sidebar(t).slice(0, 4), ['[Daily working]', 'GITHUB - PIN', 'Sprint tasks', 'Shop API'], 'position');
    },
  },
  {
    area,
    name: 'Alt+Arrow moves a folder only inside its category',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.key(t.nav('Shop API'), 'ArrowDown', { altKey: true });
      await t.settle();
      t.eq(t.settings().order, ['20', '30', '40', '50'], 'last in category: no move');
      t.key(t.nav('Shop API'), 'ArrowUp', { altKey: true });
      await t.settle();
      t.eq(t.settings().order.slice(0, 2), ['30', '20'], 'moved up inside category');
    },
  },
  {
    area,
    name: 'drag a category header to reorder categories',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.drag(t.catHeader('Tools'), t.catHeader('Daily working'), 'before');
      await t.settle();
      t.eq(
        t.settings().categories.map((c) => c.id),
        ['c2', 'c1'],
        'new order',
      );
      t.ok(sidebar(t).indexOf('[Tools]') < sidebar(t).indexOf('[Daily working]'), 'rendered order');
    },
  },
  {
    area,
    name: 'category icon shows on the sidebar header and the Board lane; Remove clears it',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.click(t.catHeader('Daily working').querySelector('.more'));
      t.click(t.$('.menu .ico[aria-label="Icon 💼"]'));
      await t.settle();
      t.eq(t.settings().categories[0].icon, '💼', 'saved');
      t.eq(t.catHeader('Daily working').querySelector('.mark-icon')?.textContent, '💼', 'header icon');
      t.click(t.$('#boardBtn'));
      await t.settle();
      const lane = t.$$('#page .blane-h').find((l) => l.textContent.includes('Daily working'));
      t.eq(lane.querySelector('.mark-icon')?.textContent, '💼', 'Board lane icon');
      t.click(t.catHeader('Daily working').querySelector('.more'));
      t.click(t.$('.menu .ico-clr'));
      await t.settle();
      t.ok(!('icon' in t.settings().categories[0]), 'removed');
    },
  },
  {
    area,
    name: 'category custom color shows on the sidebar header and the Board lane',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.click(t.catHeader('Daily working').querySelector('.more'));
      const inp = t.$('.menu .sw.custom');
      inp.value = '#12abcd';
      inp.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      await t.settle();
      t.eq(t.settings().categories[0].color, '#12abcd', 'saved');
      const head = t.catHeader('Daily working');
      t.eq(head.dataset.color, 'custom', 'header marked custom');
      t.eq(t.w.getComputedStyle(head.querySelector('.cat-toggle')).color, 'rgb(18, 171, 205)', 'header shows the color');
      t.click(t.$('#boardBtn'));
      await t.settle();
      const lane = t.$$('#page .blane-h').find((l) => l.textContent.startsWith('Daily working'));
      t.eq(lane.style.getPropertyValue('--c'), '#12abcd', 'Board lane colored');
    },
  },
  {
    area,
    name: 'category menu: color, rename, Move down',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.click(t.catHeader('Daily working').querySelector('.more'));
      t.click(t.$('.menu .sw[data-color="blue"]'));
      await t.settle();
      t.eq(t.settings().categories[0].color, 'blue', 'color saved');
      t.eq(t.catHeader('Daily working').dataset.color, 'blue', 'header colored');
      t.answer('Daily');
      t.click(t.catHeader('Daily working').querySelector('.more'));
      t.menu('Rename category');
      await t.settle();
      t.eq(t.settings().categories[0].name, 'Daily', 'renamed');
      t.click(t.catHeader('Daily').querySelector('.more'));
      t.menu('Move down');
      await t.settle();
      t.eq(
        t.settings().categories.map((c) => c.id),
        ['c2', 'c1'],
        'moved down',
      );
    },
  },
  {
    area,
    name: 'delete category keeps its folders (they move to No category)',
    page: 'newtab',
    fixture: withCats,
    async run(t) {
      t.click(t.catHeader('Daily working').querySelector('.more'));
      t.menu('Delete category…');
      await t.settle();
      t.eq(
        t.settings().categories.map((c) => c.id),
        ['c2'],
        'category gone',
      );
      t.ok(!Object.values(t.settings().folderCat).includes('c1'), 'assignments cleared');
      t.ok(t.nav('Sprint tasks') && t.nav('Shop API'), 'folders still listed');
      t.ok(t.node('20') && t.node('30'), 'bookmarks untouched');
    },
  },
  {
    area: 'categories',
    name: 'a hidden tab picks up settings changed in another tab when it is shown',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      let hidden = true;
      Object.defineProperty(t.d, 'hidden', { configurable: true, get: () => hidden });
      const next = { ...t.store.settings, categories: [{ id: 'cOps', name: 'Ops', closed: false }], folderCat: { 30: 'cOps' } };
      await t.w.chrome.storage.local.set({ settings: next });
      await t.settle();
      t.ok(!t.catHeader('Ops'), 'no re-render while hidden');
      hidden = false;
      t.d.dispatchEvent(new t.w.Event('visibilitychange'));
      await t.until(() => t.catHeader('Ops'), 'category header');
      t.ok(!!t.catHeader('Ops'), 'new category shows after the tab is shown');
    },
  },
];
