import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HOME } from '../../../extension/constants/defaults.js';

describe('Home helpers', () => {
  test('DEFAULT_HOME carries the Bonjourr-derived defaults', () => {
    assert.equal(DEFAULT_HOME.color, '#185a63');
    assert.equal(DEFAULT_HOME.dark, 65);
    assert.equal(DEFAULT_HOME.perRow, 12);
    assert.equal(DEFAULT_HOME.tilesGap, 80);
    assert.equal(DEFAULT_HOME.seconds, true);
    assert.equal(DEFAULT_HOME.h24, false);
    assert.equal(DEFAULT_HOME.newTab, false);
  });
});
