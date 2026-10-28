import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, isDueToday, sweepDone, sweptText, todayBadge, todayCount, todayList, undoneMeta, upNext } from '../../../extension/domain/today.js';
import { sections } from '../../../extension/domain/tree.js';
import { L, F } from '../fixtures.mjs';

describe("today's list", () => {
  const NOW = new Date(2026, 9, 27, 11, 30);
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
    1: { due: '2026-10-27' },
    2: { due: '2026-10-27T09:00' },
    3: { due: '2026-10-20' },
    4: { due: '2026-10-27', done: '2026-10-27' },
    5: { due: '2026-10-29' },
    6: { note: 'no date' },
  };
  const ids = (xs) => xs.map((x) => x.bm.id);

  test('dayKey is the local date; isDueToday looks only at the day of a valid due', () => {
    assert.equal(dayKey(NOW), '2026-10-27');
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
    assert.equal(isDueToday('2026-10-27', NOW), true);
    assert.equal(isDueToday('2026-10-27T18:00', NOW), true);
    assert.equal(isDueToday('2026-10-26', NOW), false);
    assert.equal(isDueToday('2026-10-27T25:00', NOW), false);
    assert.equal(isDueToday(undefined, NOW), false);
  });

  test('todayList: overdue first, then today, then done today; upcoming and undated left out', () => {
    const list = todayList(secs, meta, NOW);
    assert.deepEqual(ids(list), ['3', '2', '1', '4']);
    assert.deepEqual(
      list.map((x) => x.state),
      ['overdue', 'overdue', 'today', 'done'],
    );
    assert.equal(list[0].crumb, 'Shop › Old');
    assert.deepEqual(todayList(secs, {}, NOW), []);
  });

  test('a ticked link is done even when its due date is overdue or later', () => {
    const m = { 3: { due: '2026-10-20', done: '2026-10-27' }, 5: { due: '2026-12-01', done: '2026-10-27' } };
    assert.deepEqual(
      todayList(secs, m, NOW).map((x) => [x.bm.id, x.state]),
      [
        ['3', 'done'],
        ['5', 'done'],
      ],
    );
  });

  test('todayCount counts open links and says when one is overdue', () => {
    assert.deepEqual(todayCount(todayList(secs, meta, NOW)), { n: 3, overdue: true });
    assert.deepEqual(todayCount(todayList(secs, { 1: { due: '2026-10-27' } }, NOW)), { n: 1, overdue: false });
    assert.deepEqual(todayCount(todayList(secs, { 4: meta[4] }, NOW)), { n: 0, overdue: false });
  });

  test('upNext: the first open link, its place k of m, and skip walks the open links round', () => {
    const list = todayList(secs, meta, NOW);
    const at = (skip) => {
      const x = upNext(list, skip);
      return [x.bm.id, x.k, x.m, x.open, x.state];
    };
    assert.deepEqual(at(0), ['3', 2, 4, 3, 'overdue']);
    assert.deepEqual(at(1), ['2', 3, 4, 3, 'overdue']);
    assert.deepEqual(at(2), ['1', 4, 4, 3, 'today']);
    assert.deepEqual(at(3), ['3', 2, 4, 3, 'overdue']);
    assert.deepEqual(upNext(list), upNext(list, 0));
    assert.equal(upNext(todayList(secs, { 4: meta[4] }, NOW)), null);
    assert.equal(upNext([]), null);
  });

  test('sweepDone picks links ticked before today, never today or undated', () => {
    const t = F('r', 'R', [
      F('a', 'A', [L('1', 'a', 'https://a/'), L('2', 'b', 'https://b/'), F('p', 'P', [L('3', 'c', 'https://c/', { parentId: 'p' })])]),
      L('4', 'd', 'https://d/'),
    ]);
    const s = sections(t, []);
    const m = {
      1: { due: '2026-10-25', done: '2026-10-26' },
      2: { due: '2026-10-27', done: '2026-10-27' },
      3: { due: '2026-10-20', done: '2026-10-21' },
      4: { due: '2026-10-20', done: 'yesterday' },
    };
    assert.deepEqual(
      sweepDone(s, m, NOW).map((b) => b.id),
      ['1', '3'],
    );
    assert.deepEqual(
      sweepDone(s, m, new Date(2026, 9, 28, 0, 0)).map((b) => b.id),
      ['1', '2', '3'],
    );
    assert.deepEqual(sweepDone(s, undefined, NOW), []);
  });

  test('sweepDone looks only at the links Today can show: never the Home folder', () => {
    const t = F('r', 'R', [F('a', 'A', [L('1', 'a', 'https://a/')]), F('h', 'Home', [L('2', 'b', 'https://b/')])]);
    const m = { 1: { due: '2026-10-25', done: '2026-10-26' }, 2: { due: '2026-10-25', done: '2026-10-26' } };
    assert.deepEqual(
      sweepDone(sections(t, [], ['h']), m, NOW).map((b) => b.id),
      ['1'],
    );
  });

  test('todayBadge: count text capped at 99+, accessible name and tooltip with the real count', () => {
    assert.deepEqual(todayBadge({ n: 0, overdue: false }), { text: '', label: "Today's top list", title: "Today's top list · links due today and later" });
    assert.deepEqual(todayBadge({ n: 3, overdue: false }), {
      text: '3',
      label: "Today's top list, 3 open",
      title: "Today's top list · 3 open · links due today and later",
    });
    assert.deepEqual(todayBadge({ n: 99, overdue: true }), {
      text: '99',
      label: "Today's top list, 99 open, some overdue",
      title: "Today's top list · 99 open, some overdue · links due today and later",
    });
    assert.equal(todayBadge({ n: 100, overdue: false }).text, '99+');
    assert.equal(todayBadge({ n: 100, overdue: false }).label, "Today's top list, 100 open");
  });

  test('undoneMeta keeps the note and priority and drops due and done', () => {
    assert.deepEqual(undoneMeta({ note: 'n', pri: 'high', due: '2026-10-26', done: '2026-10-26' }), { note: 'n', pri: 'high' });
    assert.equal(undoneMeta({ due: '2026-10-26', done: '2026-10-26' }), null);
    assert.equal(undoneMeta(undefined), null);
  });

  test('sweptText', () => {
    assert.equal(sweptText(1), 'Deleted 1 done link');
    assert.equal(sweptText(3), 'Deleted 3 done links');
  });
});
