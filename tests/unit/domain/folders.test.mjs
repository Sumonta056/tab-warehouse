import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  folderPrefs,
  catOf,
  folderGroups,
  navOrder,
  stepNav,
  orderStep,
  orderMove,
  orderToTop,
  orderIntoCategory,
  withCategory,
  reorderCategories,
  sectionTargets,
  findView,
  boardLanes,
} from '../../../extension/domain/folders.js';

const S = (id, extra = {}) => ({ id, title: id, all: [], parts: [], links: [], node: { id }, ...extra });
const a = S('a'),
  b = S('b'),
  c = S('c'),
  d = S('d'),
  u = S('unsorted:r', { virtual: true });
const secs = [a, b, c, d, u];
const PAGES = [{ id: 'home' }, { id: 'board' }];
const cats = (extra = {}) => ({
  categories: [
    { id: 'c1', name: 'Work', closed: false },
    { id: 'c2', name: 'Play', closed: false },
  ],
  folderCat: { a: 'c1', c: 'c1', b: 'c2', x: 'gone' },
  ...extra,
});

describe('folderPrefs', () => {
  test('fills the defaults and keeps saved values', () => {
    assert.deepEqual(folderPrefs({}, 'a'), { sort: 'manual', view: 'list', show: 'title', closed: {} });
    assert.deepEqual(folderPrefs({ a: { sort: 'name', closed: { x: true } } }, 'a'), { sort: 'name', view: 'list', show: 'title', closed: { x: true } });
  });
});

describe('catOf', () => {
  test('returns the category only when it still exists', () => {
    const s = cats({ folderCat: { a: 'c1', b: 'gone' } });
    assert.equal(catOf(s, 'a'), 'c1');
    assert.equal(catOf(s, 'b'), null);
    assert.equal(catOf(s, 'zzz'), null);
  });
});

describe('folderGroups', () => {
  test('one group per category in order, then No category; virtual folders are left out', () => {
    const g = folderGroups(cats(), secs);
    assert.deepEqual(
      g.map((x) => [x.cat?.id || null, x.items.map((s) => s.id)]),
      [
        ['c1', ['a', 'c']],
        ['c2', ['b']],
        [null, ['d']],
      ],
    );
  });
});

describe('navOrder', () => {
  test('flat: pages then every section', () => {
    assert.deepEqual(
      navOrder({ categories: [], folderCat: {} }, secs, PAGES).map((x) => x.id),
      ['home', 'board', 'a', 'b', 'c', 'd', 'unsorted:r'],
    );
  });
  test('with categories: skips folders of closed categories, Unsorted last', () => {
    const s = cats();
    s.categories[1].closed = true;
    assert.deepEqual(
      navOrder(s, secs, PAGES).map((x) => x.id),
      ['home', 'board', 'a', 'c', 'd', 'unsorted:r'],
    );
  });
});

describe('stepNav', () => {
  const list = ['h', 'x', 'y'];
  test('j goes down, k goes up, unknown starts at the first', () => {
    assert.equal(stepNav(list, 'x', 'j'), 'y');
    assert.equal(stepNav(list, 'x', 'k'), 'h');
    assert.equal(stepNav(list, 'y', 'j'), undefined);
    assert.equal(stepNav(list, 'nope', 'k'), 'h');
  });
});

describe('sidebar order', () => {
  test('orderStep moves one step within the same category only', () => {
    const s = cats();
    assert.deepEqual(orderStep(s, secs, c, -1), ['c', 'a', 'b', 'd']);
    assert.deepEqual(orderStep(s, secs, a, 1), ['b', 'c', 'a', 'd']);
    assert.equal(orderStep(s, secs, a, -1), null);
    assert.equal(orderStep(s, secs, d, 1), null);
  });
  test('orderMove places before or after the target and skips virtual folders', () => {
    assert.deepEqual(orderMove(secs, 'd', 'a', false), ['d', 'a', 'b', 'c']);
    assert.deepEqual(orderMove(secs, 'a', 'c', true), ['b', 'c', 'a', 'd']);
  });
  test('orderToTop', () => {
    assert.deepEqual(orderToTop(secs, 'c'), ['c', 'a', 'b', 'd']);
  });
  test('orderIntoCategory puts the folder after the last folder of that category', () => {
    const s = cats({ folderCat: { a: 'c1', c: 'c1', b: 'c2', d: 'c1' } });
    assert.deepEqual(orderIntoCategory(s, secs, 'd', 'c1'), ['a', 'b', 'c', 'd']);
    s.folderCat.b = 'c1';
    assert.deepEqual(orderIntoCategory(s, secs, 'b', 'c1'), ['a', 'c', 'd', 'b']);
    assert.deepEqual(orderIntoCategory(cats(), secs, 'a', 'c9'), ['a', 'b', 'c', 'd']);
  });
  test('withCategory sets or removes without changing the input', () => {
    const fc = { a: 'c1' };
    assert.deepEqual(withCategory(fc, 'b', 'c2'), { a: 'c1', b: 'c2' });
    assert.deepEqual(withCategory(fc, 'a', null), {});
    assert.deepEqual(fc, { a: 'c1' });
  });
});

describe('reorderCategories', () => {
  const list = [{ id: '1' }, { id: '2' }, { id: '3' }];
  test('drop before or after another header', () => {
    assert.deepEqual(
      reorderCategories(list, '3', '1', false).map((x) => x.id),
      ['3', '1', '2'],
    );
    assert.deepEqual(
      reorderCategories(list, '1', '2', true).map((x) => x.id),
      ['2', '1', '3'],
    );
  });
  test('unknown source → null', () => {
    assert.equal(reorderCategories(list, '9', '1', false), null);
  });
});

describe('sectionTargets', () => {
  const p1 = { id: 'p1', title: 'Open', node: { id: 'p1' } };
  const p2 = { id: 'p2', title: 'Done', node: { id: 'p2' } };
  const bm = { id: 'l1', parentId: 'p1' };
  const f = S('f', { parts: [p1, p2], all: [bm] });
  test('every section but the current one, then No section', () => {
    assert.deepEqual(
      sectionTargets(f, bm).map((g) => g.title),
      ['Done', 'No section'],
    );
    assert.deepEqual(
      sectionTargets(f, { id: 'l1', parentId: 'f' }).map((g) => g.title),
      ['Open', 'Done'],
    );
  });
  test('none for a virtual folder, a folder without sections or a link from elsewhere', () => {
    assert.deepEqual(sectionTargets(null, bm), []);
    assert.deepEqual(sectionTargets({ ...f, virtual: true }, bm), []);
    assert.deepEqual(sectionTargets({ ...f, parts: [] }, bm), []);
    assert.deepEqual(sectionTargets(f, { id: 'other', parentId: 'x' }), []);
  });
});

describe('findView', () => {
  test('pages first, then folders, else null', () => {
    assert.equal(findView('board', PAGES, secs), PAGES[1]);
    assert.equal(findView('c', PAGES, secs), c);
    assert.equal(findView('gone', PAGES, secs), null);
    assert.equal(findView(undefined, PAGES, secs), null);
  });
});

describe('boardLanes', () => {
  test('no categories or One row: a single lane with every folder', () => {
    assert.deepEqual(
      boardLanes({ categories: [], folderCat: {}, board: { group: 'cat' } }, secs).map((l) => [l.name, l.items.map((s) => s.id)]),
      [[null, ['a', 'b', 'c', 'd', 'unsorted:r']]],
    );
    assert.deepEqual(
      boardLanes({ ...cats(), board: { group: 'flat' } }, secs).map((l) => l.name),
      [null],
    );
  });
  test('by category: a lane per category, then No category with Unsorted last; empty lanes skipped', () => {
    const s = { ...cats(), board: { group: 'cat' } };
    s.categories.push({ id: 'c3', name: 'Empty', closed: false, color: 'red' });
    s.categories[0].color = 'blue';
    assert.deepEqual(
      boardLanes(s, secs).map((l) => [l.name, l.color, l.items.map((x) => x.id)]),
      [
        ['Work', 'blue', ['a', 'c']],
        ['Play', undefined, ['b']],
        ['No category', undefined, ['d', 'unsorted:r']],
      ],
    );
  });
});
