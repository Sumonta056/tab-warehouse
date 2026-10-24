import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { priMatch, linkMatcher, isFiltering, hasMeta } from '../../../extension/domain/filter.js';

const NOW = new Date(2026, 9, 24, 12, 0);

describe('priMatch', () => {
  test('all, note, due, overdue and a priority', () => {
    assert.equal(priMatch(undefined, 'all', NOW), true);
    assert.equal(priMatch({ note: 'x' }, 'note', NOW), true);
    assert.equal(priMatch({ pri: 'high' }, 'note', NOW), false);
    assert.equal(priMatch({ due: '2026-10-30' }, 'due', NOW), true);
    assert.equal(priMatch({}, 'due', NOW), false);
    assert.equal(priMatch({ due: '2026-10-20' }, 'overdue', NOW), true);
    assert.equal(priMatch({ due: '2026-10-24' }, 'overdue', NOW), false);
    assert.equal(priMatch({ pri: 'med' }, 'med', NOW), true);
    assert.equal(priMatch({ pri: 'low' }, 'med', NOW), false);
    assert.equal(priMatch(undefined, 'high', NOW), false);
  });
});

describe('linkMatcher', () => {
  const meta = { 1: { note: 'deploy checklist', pri: 'high' }, 2: { pri: 'low' } };
  const links = [
    { id: '1', title: 'Jenkins', url: 'https://ci.example.com' },
    { id: '2', title: 'Docs', url: 'https://docs.example.com' },
    { id: '3', title: 'Jenkins old', url: 'https://old.example.com' },
  ];
  const ids = (f) => links.filter(f).map((x) => x.id);
  test('text matches title, URL and note; every term must match', () => {
    assert.deepEqual(ids(linkMatcher(meta, 'jenkins', 'all', NOW)), ['1', '3']);
    assert.deepEqual(ids(linkMatcher(meta, 'checklist', 'all', NOW)), ['1']);
    assert.deepEqual(ids(linkMatcher(meta, 'jenkins old', 'all', NOW)), ['3']);
  });
  test('combines with the priority filter', () => {
    assert.deepEqual(ids(linkMatcher(meta, '', 'low', NOW)), ['2']);
    assert.deepEqual(ids(linkMatcher(meta, 'jenkins', 'high', NOW)), ['1']);
    assert.deepEqual(ids(linkMatcher(meta, 'docs', 'high', NOW)), []);
  });
});

describe('isFiltering / hasMeta', () => {
  test('filtering when there is text or a filter other than All', () => {
    assert.equal(isFiltering('', 'all'), false);
    assert.equal(isFiltering('x', 'all'), true);
    assert.equal(isFiltering('', 'note'), true);
  });
  test('hasMeta is true when any link has an entry', () => {
    assert.equal(hasMeta([{ id: '1' }], {}), false);
    assert.equal(hasMeta([{ id: '1' }, { id: '2' }], { 2: { pri: 'low' } }), true);
  });
});
