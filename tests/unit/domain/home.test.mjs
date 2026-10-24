import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { homeLinks, homeFolderParent, editableIconUrl } from '../../../extension/domain/home.js';
import { F, L } from '../fixtures.mjs';

describe('home helpers', () => {
  const tree = F('0', '', [
    F('1', 'Bookmarks bar', [F('h', 'Home', [L('a', 'A', 'https://a.com'), F('sub', 'Sub'), L('b', 'B', 'https://b.com')])]),
    F('2', 'Other bookmarks'),
  ]);
  test('homeLinks returns the Home folder and its direct links in order', () => {
    const { folder, links } = homeLinks(tree, { home: { folderId: 'h' } });
    assert.equal(folder.id, 'h');
    assert.deepEqual(
      links.map((x) => x.id),
      ['a', 'b'],
    );
  });
  test('homeLinks with a missing folder: no folder, no links', () => {
    assert.deepEqual(homeLinks(tree, { home: { folderId: 'gone' } }), { folder: null, links: [] });
  });
  test('homeFolderParent prefers Other bookmarks, then the first child, then the root', () => {
    assert.equal(homeFolderParent(tree).id, '2');
    assert.equal(homeFolderParent(F('0', '', [F('1', 'Bar')])).id, '1');
    assert.equal(homeFolderParent(F('0', '')).id, '0');
  });
  test('editableIconUrl hides uploaded data URLs', () => {
    assert.equal(editableIconUrl('data:image/png;base64,xx'), '');
    assert.equal(editableIconUrl('https://x.com/i.png'), 'https://x.com/i.png');
    assert.equal(editableIconUrl(undefined), '');
  });
});
