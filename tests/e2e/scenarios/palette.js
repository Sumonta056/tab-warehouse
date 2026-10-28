import { base } from '../fixtures.js';

const area = 'palette';
const pal = () => ({ ...base(), currentTabId: 5, activeTab: { id: 5, url: 'chrome://newtab/' } });
const items = (t) => t.$$('#palList .pal-item').map((o) => o.querySelector('.pal-t').textContent);
const search = async (t, q) => {
  t.type(t.$('#palQ'), q);
  await t.settle();
};

export default [
  {
    area,
    name: 'palette: no key on the page opens anything; the new tab has no palette overlay',
    page: 'newtab',
    fixture: pal,
    async run(t) {
      for (const opts of [{ metaKey: true }, { metaKey: true, shiftKey: true }, { ctrlKey: true, shiftKey: true }]) t.key(t.d.body, 'k', opts);
      await t.settle();
      t.ok(!t.$('#palette') && !t.$('.pal'), 'no palette from a page key');
      t.ok(!t.H.action, 'no popup from a page key');
    },
  },
  {
    area,
    name: 'palette: the popup opens with focus in the box; empty box lists folders and places; Escape closes the popup',
    page: 'palette',
    fixture: pal,
    async run(t) {
      t.ok(t.$('#palette.pal[role="dialog"]'), 'dialog shown');
      t.eq(t.d.activeElement, t.$('#palQ'), 'focus in the box');
      t.eq(items(t).slice(0, 3), ['Sprint tasks', 'Shop API', 'GITHUB - PIN'], 'folders first');
      t.ok(items(t).includes('Home') && items(t).includes('Board') && items(t).includes('Settings › Duplicates'), 'places listed');
      t.eq(t.$('#palQ').getAttribute('aria-activedescendant'), 'pal-o-0', 'first item active');
      t.ok(!t.H.closed, 'still open');
      t.key(t.$('#palQ'), 'Escape');
      await t.settle();
      t.ok(t.H.closed, 'popup closed');
      t.eq(t.sent(), [], 'nothing sent to the page');
      t.eq(t.tabs, [], 'nothing opened');
    },
  },
  {
    area,
    name: 'palette: typing finds links with their folder and label; arrows move; Enter opens in the Tab Warehouse tab and closes',
    page: 'palette',
    fixture: pal,
    async run(t) {
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
      t.eq(t.tabs.at(-1), { url: 'https://test.shop.example.com/api/x', tabId: 5, update: true }, 'opened in the Tab Warehouse tab');
      t.ok(t.H.closed, 'popup closed after Enter');
    },
  },
  {
    area,
    name: 'palette: ⌘Enter opens the link in a background tab, says so and keeps the popup open',
    page: 'palette',
    fixture: pal,
    async run(t) {
      await search(t, '#160');
      t.key(t.$('#palQ'), 'Enter', { metaKey: true });
      await t.settle();
      t.eq(t.tabs.at(-1), { url: 'https://tracker.example.com/issues/160', active: false }, 'background tab');
      t.eq(t.toast()?.textContent, 'Opened in a background tab', 'toast');
      t.ok(!t.H.closed, 'popup stays open');
      t.eq(t.d.activeElement, t.$('#palQ'), 'focus stays in the box');
    },
  },
  {
    area,
    name: 'palette: a folder asks the Tab Warehouse tab to open its page and closes; no match says so',
    page: 'palette',
    fixture: pal,
    async run(t) {
      await search(t, 'zzz nothing');
      t.eq(t.$('#palList .pal-empty')?.textContent, 'Nothing matches. Try part of a name, host or note.', 'empty state');
      t.ok(!t.$('#palQ').hasAttribute('aria-activedescendant'), 'no active item');
      await search(t, 'sprint tasks');
      const folder = t.$$('#palList .pal-item').find((o) => o.dataset.kind === 'folder');
      t.eq(folder?.querySelector('.pal-t').textContent, 'Sprint tasks', 'folder found');
      t.click(folder);
      await t.settle();
      t.eq(t.sent(), [{ type: 'palette-go', tabId: 5, view: '20' }], 'message to the tab');
      t.ok(t.H.closed, 'popup closed');
      await t.relay();
      t.eq(t.$('.head h2')?.textContent, 'Sprint tasks', 'folder page open');
    },
  },
  {
    area,
    name: 'palette: a Settings item opens that tab; Board opens the Board and clears a global search',
    page: 'palette',
    fixture: pal,
    async run(t) {
      await search(t, 'settings dup');
      t.eq(items(t), ['Settings › Duplicates'], 'one place');
      t.key(t.$('#palQ'), 'Enter');
      await t.settle();
      t.eq(t.sent().at(-1), { type: 'palette-go', tabId: 5, settings: 'dupes' }, 'settings message');
      await t.relay();
      t.ok(t.$('#settingsView .set-tab[data-tab="dupes"].on'), 'Duplicates tab open');
      await t.palette();
      await search(t, 'board');
      t.click(t.$$('#palList .pal-item').find((o) => o.querySelector('.pal-t').textContent === 'Board'));
      await t.settle();
      t.eq(t.sent().at(-1), { type: 'palette-go', tabId: 5, view: 'board' }, 'board message');
      const msg = t.sent().at(-1);
      await t.open('newtab');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.ok(t.$('#page .row'), 'search results show');
      await t.w.chrome.runtime.sendMessage(msg);
      await t.settle();
      t.eq(t.$('#q').value, '', 'search cleared');
      t.ok(t.$('#boardBtn').classList.contains('on'), 'Board open');
    },
  },
  {
    area,
    name: 'palette: a Tab Warehouse tab ignores a go message for another tab',
    page: 'newtab',
    fixture: pal,
    async run(t) {
      let err = null;
      await t.w.chrome.runtime.sendMessage({ type: 'palette-go', tabId: 6, view: 'board' }).catch((e) => (err = e));
      await t.settle();
      t.ok(err, 'no answer');
      t.ok(t.$('#homeBtn').classList.contains('on'), 'still on Home');
      t.ok(!t.$('#boardBtn').classList.contains('on'), 'Board not opened');
    },
  },
];
