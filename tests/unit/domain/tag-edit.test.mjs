import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renameTag, removeTag, firstFreeColor, moveItem, dropIndex } from '../../../extension/domain/tags.js';
import { explainWhy } from '../../../extension/domain/env.js';
import { importSummary } from '../../../extension/domain/env-text.js';
import { findSiteRow } from '../../../extension/domain/derive.js';
import { TAG_COLORS } from '../../../extension/constants/tags.js';

const rules = [
  { pattern: 'qa.', env: 'QA' },
  { pattern: 'test.', env: 'TEST' },
];
const map = [{ PROD: 'a.com', TEST: 'test.a.com', QA: 'qa.a.com' }, { PROD: '', QA: 'qa.b.com' }, { PROD: 'c.com' }];

describe('renameTag', () => {
  test('renames the tag in every rule and moves its site column', () => {
    const r = renameTag(rules, map, 'QA', 'UAT');
    assert.deepEqual(r.rules, [
      { pattern: 'qa.', env: 'UAT' },
      { pattern: 'test.', env: 'TEST' },
    ]);
    assert.deepEqual(r.map, [{ PROD: 'a.com', TEST: 'test.a.com', UAT: 'qa.a.com' }, { PROD: '', UAT: 'qa.b.com' }, { PROD: 'c.com' }]);
    assert.equal(rules[0].env, 'QA');
    assert.ok('QA' in map[0]);
  });
});

describe('removeTag', () => {
  test('drops its rules and column; a site row that is then empty goes too', () => {
    const r = removeTag(rules, map, 'QA');
    assert.deepEqual(r.rules, [{ pattern: 'test.', env: 'TEST' }]);
    assert.deepEqual(r.map, [{ PROD: 'a.com', TEST: 'test.a.com' }, { PROD: 'c.com' }]);
  });
});

describe('firstFreeColor', () => {
  test('first color no tag uses, else the first color', () => {
    assert.equal(firstFreeColor([], TAG_COLORS), TAG_COLORS[0]);
    assert.equal(firstFreeColor([{ color: TAG_COLORS[0] }], TAG_COLORS), TAG_COLORS[1]);
    assert.equal(
      firstFreeColor(
        TAG_COLORS.map((color) => ({ color })),
        TAG_COLORS,
      ),
      TAG_COLORS[0],
    );
  });
});

describe('moveItem / dropIndex', () => {
  test('moveItem returns a new list, or null when the move is not possible', () => {
    const list = ['a', 'b', 'c'];
    assert.deepEqual(moveItem(list, 0, 2), ['b', 'c', 'a']);
    assert.deepEqual(moveItem(list, 2, 0), ['c', 'a', 'b']);
    assert.equal(moveItem(list, 1, 1), null);
    assert.equal(moveItem(list, 0, -1), null);
    assert.equal(moveItem(list, 0, 3), null);
    assert.deepEqual(list, ['a', 'b', 'c']);
  });
  test('dropIndex accounts for the removed item when moving down', () => {
    assert.equal(dropIndex(0, 2, false), 1);
    assert.equal(dropIndex(0, 2, true), 2);
    assert.equal(dropIndex(3, 1, false), 1);
    assert.equal(dropIndex(3, 1, true), 2);
  });
});

describe('explainWhy', () => {
  test('names the rule that matched, or says why none did', () => {
    assert.equal(explainWhy({ rule: 1 }, rules), 'Rule 2 matched: the address contains “test.”.');
    assert.equal(explainWhy({ rule: -1 }, rules), 'No rule matches this address.');
    assert.equal(explainWhy({ rule: -1 }, []), 'There are no rules yet.');
  });
});

describe('importSummary', () => {
  test('counts rules and sites; tags and skipped lines only when there are some', () => {
    assert.equal(importSummary({ tags: [], skipped: 0 }, rules, map), 'Imported 2 rules and 3 sites');
    assert.equal(importSummary({ tags: [{}], skipped: 1 }, [rules[0]], [map[0]]), 'Imported 1 tag, 1 rule and 1 site. Skipped 1 line that could not be read');
  });
});

describe('findSiteRow', () => {
  test('the row that has this host in any tag box', () => {
    assert.equal(findSiteRow(map, 'qa.b.com', ['PROD', 'TEST', 'QA']), map[1]);
    assert.equal(findSiteRow(map, 'qa.b.com', ['PROD', 'TEST']), undefined);
    assert.equal(findSiteRow(map, '', ['PROD']), '');
  });
});
