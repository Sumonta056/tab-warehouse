import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { clockText, msToNextTick } from '../../../extension/domain/clock.js';

describe('Home helpers', () => {
  test('clockText 12h / 24h / seconds', () => {
    const d = new Date(2026, 9, 22, 19, 4, 7);
    assert.equal(clockText(d, { h24: false, seconds: true }), '7:04:07');
    assert.equal(clockText(d, { h24: true, seconds: true }), '19:04:07');
    assert.equal(clockText(d, { h24: false, seconds: false }), '7:04');
    assert.equal(clockText(new Date(2026, 0, 1, 0, 5, 0), { h24: false, seconds: false }), '12:05');
    assert.equal(clockText(new Date(2026, 0, 1, 12, 0, 0), { h24: false, seconds: false }), '12:00');
    assert.equal(clockText(new Date(2026, 0, 1, 9, 0, 0), { h24: true, seconds: false }), '09:00');
  });
});

describe('Home helpers', () => {
  test('msToNextTick aligns to the next second or minute', () => {
    const d = new Date(2026, 0, 1, 10, 0, 42, 250);
    assert.equal(msToNextTick(d, true), 750);
    assert.equal(msToNextTick(d, false), 17750);
  });
});
