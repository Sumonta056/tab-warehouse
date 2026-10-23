import { base } from '../fixtures.js';

const area = 'palette';
const openPal = async (t) => {
  t.key(t.d.body, 'k', { metaKey: true });
  await t.settle();
};
const items = (t) => t.$$('#palList .pal-item').map((o) => o.querySelector('.pal-t').textContent);
const search = async (t, q) => {
  t.type(t.$('#palQ'), q);
  await t.settle();
};

export default [
  {
    area,
    name: 'palette: ⌘K opens it with focus in the box; empty box lists folders and places; Escape closes and gives focus back',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.$('#settingsBtn').focus();
      await openPal(t);
      t.ok(t.$('#palette .pal[role="dialog"]'), 'dialog open');
      t.eq(t.d.activeElement, t.$('#palQ'), 'focus in the box');
      t.eq(items(t).slice(0, 3), ['Sprint board', 'Shop API', 'GITHUB - PIN'], 'folders first');
      t.ok(items(t).includes('Home') && items(t).includes('Settings › Duplicates'), 'places listed');
      t.eq(t.$('#palQ').getAttribute('aria-activedescendant'), 'pal-o-0', 'first item active');
      t.key(t.$('#palQ'), 'Escape');
      await t.settle();
      t.ok(!t.$('#palette'), 'closed');
      t.eq(t.d.activeElement, t.$('#settingsBtn'), 'focus back');
      t.ok(!t.$('#settingsView'), 'Escape did not open or close anything else');
    },
  },
  {
    area,
    name: 'palette: typing finds links with their folder and label; arrows move; Enter opens in this tab',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openPal(t);
      await search(t, 'shop prod');
      const first = t.$('#palList .pal-item');
      t.eq(first.dataset.kind, 'link', 'link first');
      t.eq(first.querySelector('.pal-t').textContent, 'Shop PROD', 'title');
      t.eq(first.querySelector('.pal-s').textContent, 'Shop API · shop.example.com/api/x', 'folder and address');
      t.eq(first.querySelector('.badge')?.textContent, 'PROD', 'label');
      t.ok(first.querySelector('.pal-t mark'), 'match highlighted');
      await search(t, 'shop');
      t.key(t.$('#palQ'), 'ArrowDown');
      t.eq(t.$('#palQ').getAttribute('aria-activedescendant'), 'pal-o-1', 'ArrowDown');
      t.eq(t.$('#palList .pal-item.sel .pal-t').textContent, 'Shop TEST', 'second selected');
      t.key(t.$('#palQ'), 'Enter');
      await t.settle();
      t.eq(t.tabs.at(-1), { url: 'https://shop-test.example.com/api/x', update: true }, 'opened in this tab');
      t.ok(!t.$('#palette'), 'closed after Enter');
    },
  },
  {
    area,
    name: 'palette: ⌘Enter opens the link in a background tab and says so',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openPal(t);
      await search(t, 'TASK-160');
      t.key(t.$('#palQ'), 'Enter', { metaKey: true });
      await t.settle();
      t.eq(t.tabs.at(-1), { url: 'https://tasks.example.com/t/TASK-160', active: false }, 'background tab');
      t.eq(t.toast()?.textContent, 'Opened in a background tab', 'toast');
    },
  },
  {
    area,
    name: 'palette: a folder opens its page; a Settings item opens that tab; no match says so',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openPal(t);
      await search(t, 'tasks task');
      const folder = t.$$('#palList .pal-item').find((o) => o.dataset.kind === 'folder');
      t.eq(folder?.querySelector('.pal-t').textContent, 'Sprint board', 'folder found');
      t.click(folder);
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Sprint board', 'folder page open');
      await openPal(t);
      await search(t, 'settings dup');
      t.eq(items(t), ['Settings › Duplicates'], 'one place');
      t.key(t.$('#palQ'), 'Enter');
      await t.settle();
      t.ok(t.$('#settingsView .set-tab[data-tab="dupes"].on'), 'Duplicates tab open');
      await openPal(t);
      await search(t, 'zzz nothing');
      t.eq(t.$('#palList .pal-empty')?.textContent, 'Nothing matches. Try part of a name, host or note.', 'empty state');
      t.ok(!t.$('#palQ').hasAttribute('aria-activedescendant'), 'no active item');
    },
  },
  {
    area,
    name: 'palette: / still focuses the sidebar search, and clicking outside closes the palette',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.d.activeElement?.blur();
      t.key(t.d.body, '/');
      t.eq(t.d.activeElement, t.$('#q'), '/ focuses search');
      t.ok(!t.$('#palette'), 'no palette');
      await openPal(t);
      t.$('#palette').dispatchEvent(new t.w.MouseEvent('mousedown', { bubbles: true }));
      await t.settle();
      t.ok(!t.$('#palette'), 'closed by outside click');
    },
  },
];
