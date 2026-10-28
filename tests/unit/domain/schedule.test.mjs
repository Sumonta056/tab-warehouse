import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleGroups } from '../../../extension/domain/schedule.js';
import { sections } from '../../../extension/domain/tree.js';
import { L, F } from '../fixtures.mjs';

describe('scheduleGroups', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);
  const tree = F('r', 'R', [
    F('a', 'Shop', [
      L('1', 'Checkout', 'https://shop.example.com/cart'),
      L('2', 'Cart', 'https://shop.example.com/c'),
      F('p', 'Old', [L('3', 'Legacy', 'https://old.example.com/', { parentId: 'p' })]),
    ]),
    F('b', 'Docs', [L('4', 'Guide', 'https://docs.example.com/'), L('5', 'Spec', 'https://docs.example.com/s'), L('6', 'Faq', 'https://docs.example.com/f')]),
  ]);
  const secs = sections(tree, []);
  const meta = {
    1: { due: '2026-11-30' },
    2: { due: '2026-10-24T09:00' },
    3: { due: '2026-10-20' },
    4: { due: '2026-10-24' },
    5: { due: '2026-10-26T10:00' },
    6: { note: 'no date' },
  };
  const shape = (gs) => gs.map((g) => [g.state, g.items.map((x) => x.bm.id)]);

  test('only links with a due date, grouped Overdue, Today, Next 7 days, Later, earliest first', () => {
    assert.deepEqual(shape(scheduleGroups(secs, meta, NOW)), [
      ['overdue', ['3', '2']],
      ['today', ['4']],
      ['soon', ['5']],
      ['later', ['1']],
    ]);
  });
  test('on the same day an all-day link comes before a link with a time', () => {
    const m = { 1: { due: '2026-10-25T08:00' }, 2: { due: '2026-10-25' }, 4: { due: '2026-10-25T07:00' } };
    assert.deepEqual(shape(scheduleGroups(secs, m, NOW)), [['soon', ['2', '4', '1']]]);
  });
  test('a ticked link moves to Done today, after Today and before Next 7 days', () => {
    const m = { ...meta, 4: { due: '2026-10-24', done: '2026-10-24' }, 5: { due: '2026-10-26T10:00', done: '2026-10-24' } };
    assert.deepEqual(shape(scheduleGroups(secs, m, NOW)), [
      ['overdue', ['3', '2']],
      ['done', ['4', '5']],
      ['later', ['1']],
    ]);
    assert.equal(scheduleGroups(secs, m, NOW)[1].name, 'Done today');
  });
  test('each item keeps its folder crumb; empty groups are left out; no dates gives no groups', () => {
    const gs = scheduleGroups(secs, meta, NOW);
    assert.equal(gs[0].items[0].crumb, 'Shop › Old');
    assert.deepEqual(
      scheduleGroups(secs, { 4: { due: '2026-10-24' } }, NOW).map((g) => g.state),
      ['today'],
    );
    assert.deepEqual(scheduleGroups(secs, { 6: { note: 'x' } }, NOW), []);
  });
});
