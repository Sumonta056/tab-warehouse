import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dueLabel, dueQuickDate, dueState, gcalUrl, isDue } from '../../../extension/domain/due.js';

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('isDue accepts a real date, with or without a time', () => {
    assert.equal(isDue('2026-04-10'), true);
    assert.equal(isDue('2026-04-10T10:00'), true);
    assert.equal(isDue('2026-02-30'), false);
    assert.equal(isDue('2026-13-01'), false);
    assert.equal(isDue('2026-04-10T24:00'), false);
    assert.equal(isDue('2026-04-10T10:60'), false);
    assert.equal(isDue('10 April'), false);
    assert.equal(isDue(''), false);
    assert.equal(isDue(20260410), false);
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('dueState: a date without a time is overdue from the next day', () => {
    assert.equal(dueState('2026-10-23', NOW), 'overdue');
    assert.equal(dueState('2026-10-24', NOW), 'today');
    assert.equal(dueState('2026-10-25', NOW), 'soon');
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('dueState: a date with a time is overdue after that minute', () => {
    assert.equal(dueState('2026-10-24T11:29', NOW), 'overdue');
    assert.equal(dueState('2026-10-24T11:30', NOW), 'today');
    assert.equal(dueState('2026-10-24T16:00', NOW), 'today');
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('dueState: soon is the next 7 days, later after that, null without a date', () => {
    assert.equal(dueState('2026-10-31', NOW), 'soon');
    assert.equal(dueState('2026-11-01', NOW), 'later');
    assert.equal(dueState('', NOW), null);
    assert.equal(dueState(undefined, NOW), null);
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('dueLabel says when and how late', () => {
    assert.equal(dueLabel('2026-10-20', NOW), 'Overdue · 20 Oct (4 days)');
    assert.equal(dueLabel('2026-10-23T09:00', NOW), 'Overdue · 23 Oct 09:00 (1 day)');
    assert.equal(dueLabel('2026-10-24T10:00', NOW), 'Overdue · today 10:00');
    assert.equal(dueLabel('2026-10-24', NOW), 'Due today');
    assert.equal(dueLabel('2026-10-24T16:00', NOW), 'Today 16:00');
    assert.equal(dueLabel('2026-10-29', NOW), 'Due Thu 29 Oct');
    assert.equal(dueLabel('2026-10-29T10:00', NOW), 'Due Thu 29 Oct 10:00');
    assert.equal(dueLabel('2026-12-11', NOW), 'Due 11 Dec 2026');
    assert.equal(dueLabel('bad', NOW), '');
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('dueQuickDate: today, tomorrow and next week cross month and year ends', () => {
    assert.equal(dueQuickDate(0, NOW), '2026-10-24');
    assert.equal(dueQuickDate(1, NOW), '2026-10-25');
    assert.equal(dueQuickDate(7, NOW), '2026-10-31');
    assert.equal(dueQuickDate(1, new Date(2026, 11, 31, 23, 30)), '2027-01-01');
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('gcalUrl: an all-day event ends on the next day', () => {
    const u = new URL(gcalUrl({ title: 'Q4 checklist', url: 'https://example.com/q4', due: '2026-12-31' }));
    assert.equal(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
    assert.equal(u.searchParams.get('action'), 'TEMPLATE');
    assert.equal(u.searchParams.get('text'), 'Q4 checklist');
    assert.equal(u.searchParams.get('dates'), '20261231/20270101');
    assert.equal(u.searchParams.get('details'), 'https://example.com/q4');
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('gcalUrl: a timed event lasts 30 minutes in local time and carries the note', () => {
    const u = new URL(gcalUrl({ title: '', url: 'https://example.com/a', note: 'Read first', due: '2026-04-10T23:45' }));
    assert.equal(u.searchParams.get('dates'), '20260410T234500/20260411T001500');
    assert.equal(u.searchParams.get('text'), 'https://example.com/a');
    assert.equal(u.searchParams.get('details'), 'Read first\n\nhttps://example.com/a');
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('gcalUrl is empty without a valid date', () => {
    assert.equal(gcalUrl({ title: 'x', url: 'https://example.com', due: '' }), '');
  });
});
