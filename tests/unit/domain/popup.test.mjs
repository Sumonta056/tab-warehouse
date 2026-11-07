import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  folderChoices,
  siteUrl,
  targetUrl,
  defaultTitle,
  folderItems,
  saveLabel,
  savedPath,
  savedSummary,
  folderAncestors,
  visibleFolders,
  folderArrow,
  chipIds,
  pushRecent,
  togglePin,
  saveChips,
  staleSaveFolders,
} from '../../../extension/domain/popup.js';
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

describe('savedPath', () => {
  const folders = folderChoices(root);
  test('uses the folder path of the parent, else the hit path, else a fallback', () => {
    assert.equal(savedPath(folders, { parentId: 'a', path: 'x' }), 'Warehouse › Work');
    assert.equal(savedPath(folders, { parentId: 'zz', path: 'Bar › Old' }), 'Bar › Old');
    assert.equal(savedPath(folders, { parentId: 'zz' }), 'another folder');
  });
});

describe('savedSummary', () => {
  const folders = folderChoices(root);
  test('names the folder of the first copy and counts the others', () => {
    assert.equal(savedSummary(folders, []), null);
    assert.deepEqual(savedSummary(folders, [{ parentId: 'a' }]), { text: 'Saved in Work', more: '' });
    assert.deepEqual(savedSummary(folders, [{ parentId: 'a' }, { parentId: 'b' }, { parentId: 'r' }]), { text: 'Saved in Work', more: ' +2 more' });
  });
  test('a copy outside the root uses the last name of its path, else a fallback', () => {
    assert.equal(savedSummary(folders, [{ parentId: 'zz', path: 'Other › Reading list' }]).text, 'Saved in Reading list');
    assert.equal(savedSummary(folders, [{ parentId: 'zz' }]).text, 'Saved in another folder');
  });
});

describe('folder collapse', () => {
  const tree = F('r', 'Warehouse', [
    F('a', 'Work', [F('a1', 'Priority', [F('a11', 'Today')]), F('a2', 'Weekly report')]),
    F('b', 'Reading list'),
    F('c', 'Learning', [F('c1', 'CSS')]),
  ]);
  const folders = folderChoices(tree);
  const keys = (items) => items.map((x) => x.key);
  test('folderAncestors lists the parents of a folder from the root down', () => {
    assert.deepEqual(folderAncestors(folders, 'a11'), ['r', 'a', 'a1']);
    assert.deepEqual(folderAncestors(folders, 'b'), ['r']);
    assert.deepEqual(folderAncestors(folders, 'r'), []);
    assert.deepEqual(folderAncestors(folders, 'nope'), []);
  });
  test('all closed: the root and its child folders only; the root is always open', () => {
    const items = visibleFolders(folders, new Set(), '');
    assert.deepEqual(keys(items), ['r', 'a', 'b', 'c']);
    assert.deepEqual(
      items.map((x) => [x.kids, x.open, x.parent]),
      [
        [true, true, null],
        [true, false, 'r'],
        [false, false, 'r'],
        [true, false, 'r'],
      ],
    );
  });
  test('an open folder shows its child folders; a closed parent hides open children', () => {
    assert.deepEqual(keys(visibleFolders(folders, new Set(['a']), '')), ['r', 'a', 'a1', 'a2', 'b', 'c']);
    assert.deepEqual(keys(visibleFolders(folders, new Set(['a', 'a1']), '')), ['r', 'a', 'a1', 'a11', 'a2', 'b', 'c']);
    assert.deepEqual(keys(visibleFolders(folders, new Set(['a1', 'c']), '')), ['r', 'a', 'b', 'c', 'c1']);
  });
  test('the ancestors of a folder open the way to it', () => {
    assert.deepEqual(keys(visibleFolders(folders, new Set(folderAncestors(folders, 'a11')), '')), ['r', 'a', 'a1', 'a11', 'a2', 'b', 'c']);
  });
  test('search text gives the flat filtered list without tree items', () => {
    const items = visibleFolders(folders, new Set(), ' cs ');
    assert.deepEqual(keys(items), ['c1', 'create']);
    assert.ok(items.every((x) => !x.tree));
  });
  test('ArrowRight opens a closed folder with children; nothing else', () => {
    const items = visibleFolders(folders, new Set(['a']), '');
    assert.deepEqual(folderArrow(items, 2, 'ArrowRight'), { open: 'a1' });
    assert.equal(folderArrow(items, 1, 'ArrowRight'), null);
    assert.equal(folderArrow(items, 3, 'ArrowRight'), null);
    assert.equal(folderArrow(items, 0, 'ArrowRight'), null);
  });
  test('ArrowLeft closes an open folder, else moves to its parent', () => {
    const items = visibleFolders(folders, new Set(['a']), '');
    assert.deepEqual(folderArrow(items, 1, 'ArrowLeft'), { close: 'a' });
    assert.deepEqual(folderArrow(items, 3, 'ArrowLeft'), { cursor: 1 });
    assert.deepEqual(folderArrow(items, 4, 'ArrowLeft'), { cursor: 0 });
    assert.equal(folderArrow(items, 0, 'ArrowLeft'), null);
  });
  test('arrows do nothing in the search list or for other keys', () => {
    assert.equal(folderArrow(visibleFolders(folders, new Set(), 'css'), 0, 'ArrowLeft'), null);
    assert.equal(folderArrow(visibleFolders(folders, new Set(), ''), 1, 'Enter'), null);
    assert.equal(folderArrow([], 0, 'ArrowLeft'), null);
  });
});

describe('chipIds', () => {
  const valid = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  test('valid pins in pin order, then valid recent ids that are not pinned', () => {
    assert.deepEqual(chipIds(['c', 'a'], ['a', 'b', 'x', 'd'], valid), ['c', 'a', 'b', 'd']);
  });
  test('unknown ids are left out', () => {
    assert.deepEqual(chipIds(['x', 'a'], ['y', 'b'], valid), ['a', 'b']);
  });
  test('at most 6 by default, or max', () => {
    assert.deepEqual(chipIds(['a', 'b', 'c'], ['d', 'e', 'f', 'g', 'h'], valid), ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.deepEqual(chipIds(['a', 'b', 'c'], ['d'], valid, 2), ['a', 'b']);
  });
  test('missing lists give no chips', () => {
    assert.deepEqual(chipIds(undefined, undefined, valid), []);
  });
});

describe('pushRecent', () => {
  test('puts the id first and removes its older place', () => {
    assert.deepEqual(pushRecent(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
    assert.deepEqual(pushRecent(undefined, 'a'), ['a']);
  });
  test('keeps at most 6 by default, or max', () => {
    assert.deepEqual(pushRecent(['a', 'b', 'c', 'd', 'e', 'f'], 'g'), ['g', 'a', 'b', 'c', 'd', 'e']);
    assert.deepEqual(pushRecent(['a', 'b'], 'c', 2), ['c', 'a']);
  });
});

describe('togglePin', () => {
  test('adds at the end and removes a pinned id', () => {
    assert.deepEqual(togglePin(['a'], 'b'), { pins: ['a', 'b'] });
    assert.deepEqual(togglePin(['a', 'b'], 'a'), { pins: ['b'] });
    assert.deepEqual(togglePin(undefined, 'a'), { pins: ['a'] });
  });
  test('a full list gives an error and keeps the pins', () => {
    const full = ['a', 'b', 'c', 'd', 'e', 'f'];
    assert.deepEqual(togglePin(full, 'g'), { pins: full, error: 'You can pin up to 6 folders.' });
    assert.deepEqual(togglePin(full, 'f'), { pins: ['a', 'b', 'c', 'd', 'e'] });
    assert.deepEqual(togglePin(['a'], 'b', 1), { pins: ['a'], error: 'You can pin up to 1 folders.' });
  });
});

describe('saveChips', () => {
  test('chips with title, pinned or recent, number and tooltip', () => {
    const folders = folderChoices(root);
    assert.deepEqual(saveChips(folders, { savePins: ['b'], saveRecent: ['a', 'b', 'gone'] }), [
      { id: 'b', title: 'Reading', pinned: true, n: 1, tip: 'Warehouse › Reading · pinned · Alt+1' },
      { id: 'a', title: 'Work', pinned: false, n: 2, tip: 'Warehouse › Work · recent · Alt+2' },
    ]);
    assert.deepEqual(saveChips(folders, {}), []);
  });
});

describe('staleSaveFolders', () => {
  test('drops ids that are no longer folders and returns null when nothing is stale', () => {
    const ids = new Set(['a', 'b']);
    assert.deepEqual(staleSaveFolders({ savePins: ['a', 'x'], saveRecent: ['b', 'a'] }, ids), { savePins: ['a'] });
    assert.deepEqual(staleSaveFolders({ savePins: ['a'], saveRecent: ['y', 'b'] }, ids), { saveRecent: ['b'] });
    assert.equal(staleSaveFolders({ savePins: ['a'], saveRecent: ['b'] }, ids), null);
    assert.equal(staleSaveFolders({}, ids), null);
  });
});
