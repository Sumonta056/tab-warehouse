import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { brandName } from '../../../extension/domain/settings.js';

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
