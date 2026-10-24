import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { capitalize, plural } from '../../../extension/domain/text.js';

describe('text helpers', () => {
  test('capitalize upper-cases the first letter only', () => {
    assert.equal(capitalize('teal'), 'Teal');
    assert.equal(capitalize('a b'), 'A b');
  });
  test('plural adds s except for one', () => {
    assert.equal(plural(1, 'rule'), '1 rule');
    assert.equal(plural(0, 'rule'), '0 rules');
    assert.equal(plural(3, 'site'), '3 sites');
  });
});
