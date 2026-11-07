import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { brandName, withDefaults } from '../../../extension/domain/settings.js';

describe('brandName', () => {
  test('falls back to the product name without a name', () => {
    assert.equal(brandName({}), 'Tab Warehouse');
    assert.equal(brandName({ userName: '   ' }), 'Tab Warehouse');
    assert.equal(brandName(undefined), 'Tab Warehouse');
  });
  test('uses the trimmed name', () => {
    assert.equal(brandName({ userName: ' Sumonta ' }), "Sumonta's Warehouse");
  });
});

describe('withDefaults', () => {
  test('pinned and recent folders start empty and keep stored values', () => {
    const d = withDefaults(undefined);
    assert.deepEqual([d.savePins, d.saveRecent], [[], []]);
    const s = withDefaults({ savePins: ['1'], saveRecent: ['2', '1'] });
    assert.deepEqual([s.savePins, s.saveRecent], [['1'], ['2', '1']]);
  });
});
