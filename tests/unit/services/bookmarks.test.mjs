import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import {
  getTree,
  getSubTree,
  getChildren,
  createBookmark,
  updateBookmark,
  moveBookmark,
  removeBookmark,
  removeBookmarkTree,
  onBookmarksChanged,
} from '../../../extension/services/bookmarks.js';

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
          title: 'Work',
          children: [
            { id: '11', title: 'A', url: 'https://a.com/' },
            { id: '12', title: 'B', url: 'https://b.com/' },
          ],
        },
        { id: '20', title: 'Empty', children: [] },
      ],
    },
    { id: '2', title: 'Other bookmarks', children: [] },
  ],
};

describe('bookmarks service', () => {
  let ch;
  beforeEach(() => {
    ch = fakeChrome({ tree: TREE });
  });

  test('getTree returns the invisible root node, not the array Chrome gives', async () => {
    const root = await getTree();
    assert.equal(root.id, '0');
    assert.deepEqual(
      root.children.map((c) => c.title),
      ['Bookmarks bar', 'Other bookmarks'],
    );
  });

  test('getSubTree returns one node with its children; getChildren lists the direct children', async () => {
    const work = await getSubTree('10');
    assert.equal(work.title, 'Work');
    assert.deepEqual(
      work.children.map((c) => c.id),
      ['11', '12'],
    );
    assert.deepEqual(
      (await getChildren('1')).map((c) => c.title),
      ['Work', 'Empty'],
    );
  });

  test('create, update, move and remove change the tree in Chrome', async () => {
    const bm = await createBookmark({ parentId: '20', title: 'C', url: 'https://c.com/' });
    assert.equal((await getChildren('20'))[0].id, bm.id);
    await updateBookmark(bm.id, { title: 'C2' });
    assert.equal((await getChildren('20'))[0].title, 'C2');
    await moveBookmark(bm.id, { parentId: '10', index: 0 });
    assert.deepEqual(
      (await getChildren('10')).map((c) => c.id),
      [bm.id, '11', '12'],
    );
    await removeBookmark(bm.id);
    assert.deepEqual(
      (await getChildren('10')).map((c) => c.id),
      ['11', '12'],
    );
  });

  test('removeBookmarkTree removes a folder with its links; removeBookmark refuses a full folder', async () => {
    await assert.rejects(removeBookmark('10'));
    await removeBookmarkTree('10');
    assert.deepEqual(
      (await getChildren('1')).map((c) => c.id),
      ['20'],
    );
  });

  test('a missing id rejects', async () => {
    await assert.rejects(getSubTree('nope'));
  });

  test('onBookmarksChanged listens to every bookmark event', async () => {
    let n = 0;
    onBookmarksChanged(() => n++);
    for (const ev of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered']) assert.equal(ch.bookmarks[ev].count, 1, ev);
    await createBookmark({ parentId: '20', title: 'x', url: 'https://x.com/' });
    assert.equal(n, 1);
  });
});
