import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_MAX } from '../../../extension/constants/limits.js';
import { cleanMeta, priFirst, priGroups, withoutDone } from '../../../extension/domain/meta.js';
import { L } from '../fixtures.mjs';

describe('link notes and priority', () => {
  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('cleanMeta keeps a known priority and a trimmed note', () => {
    assert.deepEqual(cleanMeta({ note: '  check QA  ', pri: 'high' }), { note: 'check QA', pri: 'high' });
    assert.deepEqual(cleanMeta({ pri: 'low' }), { pri: 'low' });
    assert.deepEqual(cleanMeta({ note: 'only a note' }), { note: 'only a note' });
  });
});

describe('link notes and priority', () => {
  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('cleanMeta cuts the note to NOTE_MAX characters', () => {
    assert.equal(NOTE_MAX, 200);
    assert.equal(cleanMeta({ note: 'x'.repeat(250) }).note.length, NOTE_MAX);
  });
});

describe('link notes and priority', () => {
  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('cleanMeta drops bad values and returns null when nothing is left', () => {
    assert.deepEqual(cleanMeta({ note: 'ok', pri: 'urgent' }), { note: 'ok' });
    assert.deepEqual(cleanMeta({ note: 42, pri: 'med' }), { pri: 'med' });
    assert.equal(cleanMeta({ note: '   ', pri: '' }), null);
    assert.equal(cleanMeta({}), null);
    assert.equal(cleanMeta(null), null);
    assert.equal(cleanMeta('high'), null);
  });
});

describe('link notes and priority', () => {
  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('priGroups: High, Medium, Low, Other; keeps the sort order inside each group; skips empty groups', () => {
    const g = priGroups(links, meta);
    assert.deepEqual(
      g.map((x) => x.pri),
      ['high', 'low', null],
    );
    assert.deepEqual(ids(g[0].links), ['3', '5']);
    assert.deepEqual(ids(g[1].links), ['2']);
    assert.deepEqual(ids(g[2].links), ['1', '4']);
  });
});

describe('link notes and priority', () => {
  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('priGroups: no priority anywhere → one Other group', () => {
    const g = priGroups(links, { 4: { note: 'x' } });
    assert.equal(g.length, 1);
    assert.equal(g[0].pri, null);
    assert.deepEqual(ids(g[0].links), ['1', '2', '3', '4', '5']);
  });
});

describe('link notes and priority', () => {
  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('priFirst: the same order as one flat list, input not changed', () => {
    assert.deepEqual(ids(priFirst(links, meta)), ['3', '5', '2', '1', '4']);
    assert.deepEqual(ids(links), ['1', '2', '3', '4', '5']);
  });
});

describe('due dates', () => {
  test('cleanMeta keeps a valid due date and drops a bad one', () => {
    assert.deepEqual(cleanMeta({ due: '2026-04-10' }), { due: '2026-04-10' });
    assert.deepEqual(cleanMeta({ note: 'read', due: '2026-04-10T10:00' }), { note: 'read', due: '2026-04-10T10:00' });
    assert.deepEqual(cleanMeta({ pri: 'high', due: 'tomorrow' }), { pri: 'high' });
    assert.equal(cleanMeta({ due: '' }), null);
  });
  test('cleanMeta keeps done only as a real date next to a valid due date', () => {
    assert.deepEqual(cleanMeta({ due: '2026-10-27', done: '2026-10-27' }), { due: '2026-10-27', done: '2026-10-27' });
    assert.deepEqual(cleanMeta({ pri: 'low', due: '2026-10-27', done: '2026-10-27T10:00' }), { pri: 'low', due: '2026-10-27' });
    assert.deepEqual(cleanMeta({ pri: 'low', done: '2026-10-27' }), { pri: 'low' });
    assert.deepEqual(cleanMeta({ pri: 'low', due: 'soon', done: '2026-10-27' }), { pri: 'low' });
    assert.equal(cleanMeta({ done: '2026-10-27' }), null);
    assert.deepEqual(cleanMeta({ due: '2026-10-27', done: '2026-02-30' }), { due: '2026-10-27' });
  });
  test('withoutDone keeps note, priority and due and never done', () => {
    assert.deepEqual(withoutDone({ note: 'n', pri: 'high', due: '2026-10-27', done: '2026-10-27' }), { note: 'n', pri: 'high', due: '2026-10-27' });
    assert.equal(withoutDone({ done: '2026-10-27' }), null);
    assert.equal(withoutDone(undefined), null);
  });
});
