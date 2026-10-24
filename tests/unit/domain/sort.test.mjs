import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';
import { detectEnv } from '../../../extension/domain/env.js';
import { sortLinks } from '../../../extension/domain/sort.js';
import { SAMPLE_ENV_RULES, L } from '../fixtures.mjs';

describe('sortLinks', () => {
  const links = [
    L('1', 'Beta', 'https://b.com/2', { index: 2, dateAdded: 10 }),
    L('2', 'alpha', 'https://test.shop.example.com/1', { index: 0, dateAdded: 30 }),
    L('3', 'Gamma', 'http://localhost:8080/1', { index: 1, dateAdded: 20 }),
    L('4', 'item 10', 'https://a.com/10', { index: 3, dateAdded: 5 }),
    L('5', 'item 9', 'https://a.com/9', { index: 4, dateAdded: 1 }),
  ];
  const ids = (sort) => sortLinks(links, sort, SAMPLE_ENV_RULES).map((x) => x.id);
  test('manual = Chrome index', () => assert.deepEqual(ids('manual'), ['2', '3', '1', '4', '5']));
  test('name is case-insensitive and numeric-aware', () => assert.deepEqual(ids('name'), ['2', '1', '3', '5', '4']));
  test('date added = newest first', () => assert.deepEqual(ids('added'), ['2', '3', '1', '4', '5']));
  test('env = PROD, TEST, STAGE, LOCAL, then none', () => {
    const r = sortLinks(links, 'env', SAMPLE_ENV_RULES).map((x) => detectEnv(x, SAMPLE_ENV_RULES));
    assert.deepEqual(r.slice(0, 2), ['TEST', 'LOCAL']);
    assert.deepEqual(r.slice(2), ['', '', '']);
  });
  test('host then path', () => assert.deepEqual(ids('host').slice(0, 2), ['5', '4']));
  test('does not mutate the input array', () => {
    const before = links.map((x) => x.id);
    sortLinks(links, 'name', SAMPLE_ENV_RULES);
    assert.deepEqual(
      links.map((x) => x.id),
      before,
    );
  });
});

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];

  test('sortLinks env: custom tags after the built-ins, unknown tags with the untagged links', () => {
    const links = [
      L('1', 'n', 'https://none.org/1'),
      L('2', 'q', 'https://qa.example.com/1'),
      L('3', 'p', 'https://shop.example.com/1'),
      L('4', 'g', 'https://gone.example.com/1'),
    ];
    const r = [...rules, { pattern: 'gone.example.com', env: 'GONE' }];
    assert.deepEqual(
      sortLinks(links, 'env', r, tags).map((x) => x.id),
      ['3', '2', '1', '4'],
    );
    assert.deepEqual(
      sortLinks(links, 'env', r).map((x) => x.id),
      ['3', '1', '2', '4'],
    );
  });
});

describe('sortLinks keeps input order for equal keys', () => {
  const links = [
    { id: 'a', index: 0, title: 'Same', url: 'https://x.com/p' },
    { id: 'b', index: 1, title: 'same', url: 'https://y.com/p' },
    { id: 'c', index: 2, title: 'Same', url: 'https://z.com/p' },
  ];
  for (const sort of ['name', 'env']) {
    test(sort, () =>
      assert.deepEqual(
        sortLinks(links, sort, []).map((l) => l.id),
        ['a', 'b', 'c'],
      ),
    );
  }
  test('does not change the input array', () => {
    const copy = [...links].reverse();
    const before = copy.map((l) => l.id);
    sortLinks(copy, 'name', []);
    assert.deepEqual(
      copy.map((l) => l.id),
      before,
    );
  });
});
