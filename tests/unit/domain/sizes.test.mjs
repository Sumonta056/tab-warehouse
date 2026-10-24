import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SIDE_WIDTH } from '../../../extension/constants/limits.js';
import { clampFont, clampSideWidth } from '../../../extension/domain/sizes.js';

describe('Home helpers', () => {
  test('clampSideWidth keeps 180..440 and falls back on junk', () => {
    assert.equal(clampSideWidth(100), SIDE_WIDTH.min);
    assert.equal(clampSideWidth(9999), SIDE_WIDTH.max);
    assert.equal(clampSideWidth(300.6), 301);
    assert.equal(clampSideWidth('abc'), SIDE_WIDTH.initial);
    assert.equal(clampSideWidth(undefined), SIDE_WIDTH.initial);
  });
});

describe('clampFont', () => {
  test('keeps 80-140 and rounds', () => {
    assert.equal(clampFont(120), 120);
    assert.equal(clampFont(112.6), 113);
    assert.equal(clampFont(50), 80);
    assert.equal(clampFont(300), 140);
  });
  test('bad values fall back to 100', () => {
    assert.equal(clampFont(undefined), 100);
    assert.equal(clampFont('big'), 100);
  });
});
