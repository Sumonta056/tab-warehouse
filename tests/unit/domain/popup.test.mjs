import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { folderChoices, siteUrl, targetUrl, defaultTitle, folderItems, saveLabel } from '../../../extension/domain/popup.js';
import { F, L } from '../fixtures.mjs';

const root = F('r', 'Warehouse', [L('l0', 'x', 'https://x.com'), F('a', 'Work', [L('l1', 'y', 'https://y.com'), F('a1', '', [])]), F('b', 'Reading')]);

describe('folderChoices', () => {
  test('root first, then every nested folder with path, depth and direct link count', () => {
    assert.deepEqual(folderChoices(root), [
      { id: 'r', title: 'Warehouse', path: 'Warehouse', depth: 0, count: 1 },
      { id: 'a', title: 'Work', path: 'Warehouse › Work', depth: 1, count: 1 },
      { id: 'a1', title: '(untitled)', path: 'Warehouse › Work › (untitled)', depth: 2, count: 0 },
      { id: 'b', title: 'Reading', path: 'Warehouse › Reading', depth: 1, count: 0 },
    ]);
  });
  test('an untitled root is called Bookmarks', () => {
    assert.equal(folderChoices(F('r', '', []))[0].path, 'Bookmarks');
  });
});

describe('page and site', () => {
  const tab = { url: 'https://www.example.com/a/b?c=1', title: 'Page' };
  test('siteUrl is origin/ for http(s) pages only', () => {
    assert.equal(siteUrl(tab.url), 'https://www.example.com/');
    assert.equal(siteUrl('chrome://extensions'), null);
    assert.equal(siteUrl('nonsense'), null);
  });
  test('targetUrl and defaultTitle follow the mode', () => {
    assert.equal(targetUrl('page', tab), tab.url);
    assert.equal(targetUrl('site', tab), 'https://www.example.com/');
    assert.equal(targetUrl('page', null), null);
    assert.equal(defaultTitle('page', tab), 'Page');
    assert.equal(defaultTitle('page', { url: 'https://a.com' }), 'https://a.com');
    assert.equal(defaultTitle('site', tab), 'www.example.com');
  });
});

describe('folderItems', () => {
  const folders = folderChoices(root);
  test('no text: every folder', () => {
    assert.deepEqual(
      folderItems(folders, '').map((x) => x.key),
      ['r', 'a', 'a1', 'b'],
    );
  });
  test('text filters the full path and offers Create when no folder has that exact name', () => {
    const items = folderItems(folders, 'Wor');
    assert.deepEqual(
      items.map((x) => x.key),
      ['a', 'a1', 'create'],
    );
    assert.equal(items.at(-1).create, 'Wor');
    assert.deepEqual(
      folderItems(folders, 'work').map((x) => x.key),
      ['a', 'a1'],
    );
  });
});

describe('saveLabel', () => {
  test('names the folder, says Save again for a duplicate, and Create for a new folder', () => {
    assert.equal(saveLabel(undefined, false), 'Save');
    assert.equal(saveLabel({ f: { title: 'Work' } }, false), 'Save to Work');
    assert.equal(saveLabel({ f: { title: 'Work' } }, true), 'Save again to Work');
    assert.equal(saveLabel({ create: 'New' }, true), 'Create "New" and save');
  });
});
