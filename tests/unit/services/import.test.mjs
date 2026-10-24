import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import { importFile } from '../../../extension/services/import.js';
import { loadSettings, saveSettings } from '../../../extension/services/storage.js';

const TREE = {
  id: '0',
  title: '',
  children: [
    {
      id: '1',
      title: 'Bookmarks bar',
      children: [
        {
          id: '10',
          title: 'My Links',
          children: [{ id: '30', title: 'Shop', children: [{ id: '31', title: 'Shop PROD', url: 'https://shop.example.com/' }] }],
        },
      ],
    },
    { id: '2', title: 'Other bookmarks', children: [] },
  ],
};

const file = (data, name = 'warehouse-2026-10-24.json') => ({ name, text: async () => (typeof data === 'string' ? data : JSON.stringify(data)) });

const backup = (extra = {}) => ({
  format: 'sumonta-warehouse',
  version: 1,
  sections: [
    {
      title: 'Shop',
      links: [
        { title: 'Shop PROD', url: 'https://shop.example.com/', note: 'imported note' },
        { title: 'Shop TEST', url: 'https://test.shop.example.com/', pri: 'high' },
      ],
      parts: [{ title: 'Blocked', links: [{ title: 'Old', url: 'https://tracker.example.com/1', due: '2026-11-01' }, { url: '' }] }],
    },
    { title: 'Docs', links: [{ title: '', url: 'https://docs.example.com/' }], parts: [] },
    { title: 'Unsorted', unsorted: true, links: [{ title: 'Loose', url: 'https://loose.example.com/' }], parts: [] },
  ],
  ...extra,
});

const titles = (node) => (node.children || []).map((c) => c.title);
const child = (node, title) => node.children.find((c) => c.title === title);

describe('importFile (JSON backup)', () => {
  test('merges folders, sections and links into the root and counts what it did', async () => {
    const ch = fakeChrome({ tree: TREE });
    const root = ch.tree.children[0].children[0];
    const r = await importFile(file(backup()), root, await loadSettings());
    assert.deepEqual(r, { folders: 2, links: 4, skipped: 1 });
    assert.deepEqual(titles(root), ['Shop', 'Docs', 'Loose']);
    const shop = child(root, 'Shop');
    assert.deepEqual(titles(shop), ['Shop PROD', 'Shop TEST', 'Blocked']);
    assert.deepEqual(titles(child(shop, 'Blocked')), ['Old']);
    assert.equal(child(root, 'Docs').children[0].title, 'https://docs.example.com/', 'a link without a title is named by its URL');
  });

  test('stores note, priority and due date under the new ids, and gives an existing link the imported note', async () => {
    const ch = fakeChrome({ tree: TREE });
    const root = ch.tree.children[0].children[0];
    await importFile(file(backup()), root, await loadSettings());
    const shop = child(root, 'Shop');
    const id = (t, n = shop) => child(n, t).id;
    assert.deepEqual(ch.data.linkMeta, {
      31: { note: 'imported note' },
      [id('Shop TEST')]: { pri: 'high' },
      [id('Old', child(shop, 'Blocked'))]: { due: '2026-11-01' },
    });
  });

  test('keeps an existing note on a link that is already saved', async () => {
    const ch = fakeChrome({ tree: TREE, store: { linkMeta: { 31: { note: 'mine' } } } });
    await importFile(file(backup()), ch.tree.children[0].children[0], await loadSettings());
    assert.deepEqual(ch.data.linkMeta['31'], { note: 'mine' });
  });

  test('importing the same file twice adds nothing the second time', async () => {
    const ch = fakeChrome({ tree: TREE });
    const root = ch.tree.children[0].children[0];
    await importFile(file(backup()), root, await loadSettings());
    const again = await importFile(file(backup()), root, await loadSettings());
    assert.deepEqual(again, { folders: 0, links: 0, skipped: 5 });
  });

  test('applies preferences by folder title: order, folder prefs, categories, tags, rules, sites, favicons, board', async () => {
    const ch = fakeChrome({ tree: TREE });
    await saveSettings({ customTags: [{ name: 'QA', plain: 'Mine', color: 'pink' }], categories: [{ id: 'c1', name: 'Work', closed: false }] });
    const root = ch.tree.children[0].children[0];
    await importFile(
      file(
        backup({
          preferences: {
            order: ['Docs', 'Shop', 'Gone'],
            folders: { Shop: { sort: 'name', view: 'matrix' }, Gone: { sort: 'url' } },
            categories: [
              { name: 'Work', folders: ['Shop'] },
              { name: 'Read', closed: true, folders: ['Docs'] },
            ],
            customTags: [
              { name: 'QA', plain: 'Theirs', color: 'teal' },
              { name: 'UAT', plain: 'User test', color: 'yellow' },
            ],
            envRules: [{ pattern: 'uat.', env: 'UAT' }],
            hostMap: [{ PROD: 'shop.example.com', UAT: 'uat.shop.example.com' }],
            showFavicons: true,
            board: { group: 'flat' },
          },
        }),
      ),
      root,
      await loadSettings(),
    );
    const s = await loadSettings();
    const shop = child(root, 'Shop').id;
    const docs = child(root, 'Docs').id;
    assert.deepEqual(s.order, [docs, shop]);
    assert.deepEqual(s.folders, { [shop]: { sort: 'name', view: 'matrix' } });
    assert.deepEqual(
      s.categories.map((c) => [c.name, c.closed]),
      [
        ['Work', false],
        ['Read', true],
      ],
    );
    assert.equal(s.folderCat[shop], 'c1', 'an existing category is reused by name');
    assert.equal(s.folderCat[docs], s.categories[1].id);
    assert.deepEqual(s.customTags, [
      { name: 'QA', plain: 'Mine', color: 'pink' },
      { name: 'UAT', plain: 'User test', color: 'yellow' },
    ]);
    assert.deepEqual(s.envRules, [{ pattern: 'uat.', env: 'UAT' }]);
    assert.deepEqual(s.hostMap, [{ PROD: 'shop.example.com', UAT: 'uat.shop.example.com' }]);
    assert.equal(s.showFavicons, true);
    assert.equal(s.board.group, 'flat');
  });

  test('empty rule and site lists in a backup keep the current ones', async () => {
    const ch = fakeChrome({ tree: TREE });
    await saveSettings({ envRules: [{ pattern: 'test.', env: 'TEST' }], hostMap: [{ PROD: 'a.com' }] });
    await importFile(file(backup({ preferences: { envRules: [], hostMap: [] } })), ch.tree.children[0].children[0], await loadSettings());
    const s = await loadSettings();
    assert.deepEqual(s.envRules, [{ pattern: 'test.', env: 'TEST' }]);
    assert.deepEqual(s.hostMap, [{ PROD: 'a.com' }]);
  });

  test('a JSON file that is not a Warehouse export is refused and changes nothing', async () => {
    const ch = fakeChrome({ tree: TREE });
    const before = JSON.stringify(ch.tree);
    await assert.rejects(importFile(file({ hello: 1 }), ch.tree.children[0].children[0], await loadSettings()), /not a Warehouse export/);
    await assert.rejects(importFile(file('{oops'), ch.tree.children[0].children[0], await loadSettings()));
    assert.equal(JSON.stringify(ch.tree), before);
  });
});
