import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { savedMark, savedMarkBadge } from '../../../extension/domain/saved-mark.js';
import { folderChoices } from '../../../extension/domain/popup.js';
import { F, L } from '../fixtures.mjs';

const tree = F('0', '', [
  F('1', 'Bookmarks bar', [F('10', 'Work', [F('11', 'Docs', [L('12', 'Docs', 'https://example.com/docs/')])])]),
  F('2', 'Other bookmarks', [F('20', 'Home', [L('21', 'Ex', 'https://home.example.com/')])]),
]);

describe('savedMark', () => {
  test('a saved address is saved, with the path of its first copy', () => {
    assert.deepEqual(savedMark(tree, 'https://example.com/docs/'), { saved: true, path: 'Bookmarks bar › Work › Docs' });
  });

  test('an unknown address is not saved', () => {
    assert.deepEqual(savedMark(tree, 'https://example.com/other'), { saved: false, path: '' });
  });

  test('a trailing slash, a #part and tracking parameters do not matter', () => {
    assert.equal(savedMark(tree, 'https://example.com/docs').saved, true);
    assert.equal(savedMark(tree, 'https://example.com/docs/#top').saved, true);
    assert.equal(savedMark(tree, 'https://example.com/docs/?utm_source=mail').saved, true);
  });

  test('links outside the root and in the Home folder count', () => {
    assert.equal(savedMark(tree, 'https://home.example.com/').saved, true);
  });

  test('only http, https and file pages can be marked', () => {
    assert.deepEqual(savedMark(tree, 'chrome://extensions/'), { saved: false, path: '' });
    assert.deepEqual(savedMark(tree, undefined), { saved: false, path: '' });
    assert.deepEqual(savedMark(tree, ''), { saved: false, path: '' });
    const files = F('0', '', [F('1', 'Bar', [L('5', 'Local', 'file:///a.html')])]);
    assert.equal(savedMark(files, 'file:///a.html').saved, true);
  });

  test('the path is the popup folder path when folders are given', () => {
    const withParent = F('0', '', [F('1', 'Bookmarks bar', [F('10', 'Work', [{ ...L('12', 'Docs', 'https://example.com/docs/'), parentId: '10' }])])]);
    const folders = folderChoices(withParent.children[0].children[0]);
    assert.equal(savedMark(withParent, 'https://example.com/docs/', folders).path, 'Work');
  });
});

describe('savedMarkBadge', () => {
  test('a saved mark is a green check titled with the path', () => {
    assert.deepEqual(savedMarkBadge({ saved: true, path: 'A › B' }), { text: '✓', color: '#2e9d63', title: 'Saved in A › B' });
  });

  test('no mark gives no badge', () => {
    assert.equal(savedMarkBadge({ saved: false, path: '' }), null);
  });
});
