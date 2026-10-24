import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import { ensureHomeFolder } from '../../../extension/services/home-folder.js';
import { loadSettings } from '../../../extension/services/storage.js';

const tree = (other) => ({
  id: '0',
  title: '',
  children: [
    { id: '1', title: 'Bookmarks bar', children: [] },
    { id: '2', title: 'Other bookmarks', children: other },
  ],
});

describe('ensureHomeFolder', () => {
  test('keeps a saved Home folder that still exists and creates nothing', async () => {
    const ch = fakeChrome({ tree: tree([{ id: '70', title: 'Home', children: [] }]) });
    const settings = await loadSettings();
    settings.home.folderId = '70';
    const r = await ensureHomeFolder(ch.tree, settings);
    assert.equal(r.created, false);
    assert.equal(r.settings, settings);
    assert.equal(ch.tree.children[1].children.length, 1);
  });

  test('adopts an existing Home folder in Other bookmarks', async () => {
    const ch = fakeChrome({
      tree: tree([
        { id: '5', title: 'Home.html', url: 'https://x/' },
        { id: '70', title: 'Home', children: [] },
      ]),
    });
    const r = await ensureHomeFolder(ch.tree, await loadSettings());
    assert.equal(r.created, false);
    assert.equal(r.settings.home.folderId, '70');
    assert.equal((await loadSettings()).home.folderId, '70', 'saved');
  });

  test('creates an empty Home folder in Other bookmarks when there is none (or the saved one is gone)', async () => {
    const ch = fakeChrome({ tree: tree([]) });
    const settings = await loadSettings();
    settings.home.folderId = 'deleted';
    const r = await ensureHomeFolder(ch.tree, settings);
    assert.equal(r.created, true);
    const made = ch.tree.children[1].children[0];
    assert.equal(made.title, 'Home');
    assert.deepEqual(made.children, []);
    assert.equal(r.settings.home.folderId, made.id);
  });
});
