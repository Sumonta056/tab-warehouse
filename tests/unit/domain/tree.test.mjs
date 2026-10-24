import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { findById, findFolderByTitle, flatten, folderList, resolveRoot, sections } from '../../../extension/domain/tree.js';
import { loadSettings } from '../../../extension/services/storage.js';
import { L, F } from '../fixtures.mjs';

describe('bookmark tree helpers', () => {
  const tree = F('0', '', [
    F('1', 'Bookmarks bar', [
      F('10', 'My Links', [
        F('11', 'Shop API', [L('111', 'a', 'https://a.com')]),
        F('12', 'Sprint tasks', [L('121', 'b', 'https://b.com'), F('122', 'Blocked', [L('1221', 'c', 'https://c.com')])]),
        L('13', 'loose', 'https://loose.com'),
      ]),
    ]),
    F('2', 'Other bookmarks', []),
  ]);
  test('findById and findFolderByTitle', () => {
    assert.equal(findById(tree, '122').title, 'Blocked');
    assert.equal(findById(tree, 'nope'), null);
    assert.equal(findFolderByTitle(tree, 'My Links').id, '10');
    assert.equal(findFolderByTitle(tree, 'a'), null);
  });
  test('resolveRoot: id first, then name, then first child', () => {
    assert.equal(resolveRoot(tree, { rootId: '12', rootName: 'My Links' }).id, '12');
    assert.equal(resolveRoot(tree, { rootId: 'gone', rootName: 'My Links' }).id, '10');
    assert.equal(resolveRoot(tree, { rootId: null, rootName: 'Missing' }).id, '1');
  });
  test('resolveRoot with fresh-install settings (no root name) uses the first top-level folder', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    assert.equal(resolveRoot(tree, await loadSettings()).id, '1');
  });
  test('flatten gives every link with its folder path', () => {
    const r = flatten(findById(tree, '10'));
    assert.deepEqual(
      r.map((x) => [x.id, x.path]),
      [
        ['111', 'Shop API'],
        ['121', 'Sprint tasks'],
        ['1221', 'Sprint tasks › Blocked'],
        ['13', ''],
      ],
    );
  });
  test('folderList gives nested folders with depth', () => {
    assert.deepEqual(
      folderList(findById(tree, '10')).map((f) => [f.title, f.depth]),
      [
        ['Shop API', 0],
        ['Sprint tasks', 0],
        ['Blocked', 1],
      ],
    );
  });
});

describe('sections()', () => {
  const root = F('10', 'Root', [
    F('a', 'A', [L('a1', 'x', 'https://x.com')], { index: 0 }),
    F('b', 'B', [L('b1', 'y', 'https://y.com'), F('b2', 'Part', [L('b21', 'z', 'https://z.com')])], { index: 1 }),
    F('c', 'C', [], { index: 2 }),
    L('l1', 'loose', 'https://l.com'),
  ]);
  test('saved order first, unknown folders appended in tree order, Unsorted last', () => {
    const s = sections(root, ['c', 'a']);
    assert.deepEqual(
      s.map((x) => x.id),
      ['c', 'a', 'b', 'unsorted:10'],
    );
    assert.equal(s.at(-1).virtual, true);
  });
  test('no loose links means no Unsorted section', () => {
    const s = sections(F('r', 'R', [F('a', 'A', [])]), []);
    assert.equal(
      s.some((x) => x.virtual),
      false,
    );
  });
  test('parts are direct subfolders; all = direct links + part links', () => {
    const b = sections(root, []).find((x) => x.id === 'b');
    assert.deepEqual(
      b.links.map((x) => x.id),
      ['b1'],
    );
    assert.deepEqual(
      b.parts.map((x) => [x.id, x.title, x.links.length]),
      [['b2', 'Part', 1]],
    );
    assert.deepEqual(
      b.all.map((x) => x.id),
      ['b1', 'b21'],
    );
  });
  test('hidden ids are excluded (Home folder never becomes a sidebar section)', () => {
    assert.deepEqual(
      sections(root, [], ['b']).map((x) => x.id),
      ['a', 'c', 'unsorted:10'],
    );
  });
  test('Unsorted has empty parts and all = loose links', () => {
    const u = sections(root, []).at(-1);
    assert.deepEqual(u.parts, []);
    assert.deepEqual(
      u.all.map((x) => x.id),
      ['l1'],
    );
  });
});
