import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { omniboxSuggestions } from '../../../extension/domain/omnibox.js';
import { crumbText, matchLink, searchLinks, matchTitleUrl } from '../../../extension/domain/search.js';
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

describe('matchTitleUrl', () => {
  const bm = { title: 'Grafana Prod', url: 'https://grafana.example.com/d/abc' };
  test('every term must be in the title or URL; the note does not count', () => {
    assert.equal(matchTitleUrl(bm, ''), true);
    assert.equal(matchTitleUrl(bm, 'grafana'), true);
    assert.equal(matchTitleUrl(bm, 'prod d/abc'), true);
    assert.equal(matchTitleUrl(bm, 'prod  missing'), false);
    assert.equal(matchTitleUrl({ ...bm, note: 'deploy' }, 'deploy'), false);
  });
});

const deep = F('10', 'Root', [
  F('w', 'Work', [
    L('w1', 'Jira', 'https://jira.example.com', { parentId: 'w' }),
    F(
      'c',
      'Clients',
      [
        L('c1', 'Portal', 'https://portal.example.com', { parentId: 'c' }),
        F(
          'a',
          'Acme',
          [
            L('a1', 'Admin', 'https://admin.example.com', { parentId: 'a' }),
            F('y', '2026', [L('y1', 'Q4', 'https://q4.example.com', { parentId: 'y' })], { parentId: 'a' }),
          ],
          { parentId: 'c' },
        ),
      ],
      { parentId: 'w' },
    ),
  ]),
]);

describe('crumbs in nested Sections', () => {
  test('crumb shows the full path up to 3 names', () => {
    assert.equal(crumbText(['Work', 'Clients', 'Acme']), 'Work › Clients › Acme');
  });
  test('crumb shortens the middle above 3 names', () => {
    assert.equal(crumbText(['Work', 'Clients', 'Acme', '2026']), 'Work › … › Acme › 2026');
  });
  test('searchLinks finds a level-4 link by a middle path name', () => {
    const hits = searchLinks(sections(deep, []), 'clients q4');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].bm.id, 'y1');
    assert.equal(hits[0].crumb, 'Work › … › Acme › 2026');
  });
});
