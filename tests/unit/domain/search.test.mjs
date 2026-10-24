import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { omniboxSuggestions } from '../../../extension/domain/omnibox.js';
import { matchLink, searchLinks } from '../../../extension/domain/search.js';
import { sections } from '../../../extension/domain/tree.js';
import { L, F } from '../fixtures.mjs';

describe('link notes and priority', () => {
  const ids = (xs) => xs.map((x) => x.id);

  test('matchLink: every term must match title, URL or note', () => {
    const bm = L('9', 'Build deploy', 'https://ci.example.com/job/web');
    assert.equal(matchLink(bm, '', ''), true);
    assert.equal(matchLink(bm, '', 'build example'), true);
    assert.equal(matchLink(bm, 'Ask Sam for the token', 'sam'), true);
    assert.equal(matchLink(bm, 'Ask Sam for the token', 'build token'), true);
    assert.equal(matchLink(bm, '', 'sam'), false);
    assert.equal(matchLink(bm, undefined, 'build'), true);
  });
});

describe('searchLinks', () => {
  const tree = F('r', 'R', [
    F('a', 'Shop', [
      L('1', 'Checkout', 'https://shop.example.com/cart'),
      F('p', 'Old', [L('2', 'Legacy cart', 'https://old.example.com/cart', { parentId: 'p' })]),
    ]),
    F('b', 'Docs', [L('3', 'Guide', 'https://docs.example.com/')]),
  ]);
  const secs = sections(tree, []);
  const ids = (hits) => hits.map((x) => x.bm.id);

  test('every term must match title, URL, folder crumb, note or label', () => {
    assert.deepEqual(ids(searchLinks(secs, 'cart')), ['1', '2']);
    assert.deepEqual(ids(searchLinks(secs, 'shop old')), ['2']);
    assert.deepEqual(searchLinks(secs, 'shop old')[0].crumb, 'Shop › Old');
    assert.deepEqual(ids(searchLinks(secs, 'refund', { 3: { note: 'Refund policy' } })), ['3']);
    assert.deepEqual(ids(searchLinks(secs, 'prod', {}, [{ pattern: 'shop.example', env: 'PROD' }])), ['1']);
    assert.deepEqual(ids(searchLinks(secs, 'CART Legacy')), ['2']);
    assert.deepEqual(ids(searchLinks(secs, 'nothing')), []);
  });
  test('a custom tag from an address rule is searchable, so the palette and tw find it', () => {
    const rules = [{ pattern: 'old.example.com', env: 'QA' }];
    assert.deepEqual(ids(searchLinks(secs, 'qa', {}, rules)), ['2']);
    assert.deepEqual(ids(searchLinks(secs, 'qa cart', {}, rules)), ['2']);
    assert.deepEqual(
      omniboxSuggestions(secs, 'qa', {}, rules).map((s) => s.content),
      ['https://old.example.com/cart'],
    );
  });
});
