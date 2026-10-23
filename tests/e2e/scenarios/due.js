import { base } from '../fixtures.js';

const area = 'due';
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const META = () => ({
  31: { due: day(-3) },
  32: { note: 'Read first', due: day(2) },
  33: { due: day(40) },
});
const withMeta = (meta = META()) => {
  const f = base();
  f.store.linkMeta = meta;
  return f;
};
const chip = (t, v) => t.$(`#page .pri-filter [data-pri="${v}"]`);
const dueChip = (t, id) => t.row(id).querySelector('.due-chip');

export default [
  {
    area,
    name: 'due chip on the row: red when overdue, blue within 7 days, plain later',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.ok(dueChip(t, '31')?.classList.contains('overdue'), 'overdue chip');
      t.ok(dueChip(t, '31').textContent.startsWith('Overdue · '), 'overdue label');
      t.ok(dueChip(t, '31').textContent.endsWith('(3 days)'), 'days late');
      t.ok(dueChip(t, '32')?.classList.contains('soon'), 'soon chip');
      t.ok(dueChip(t, '33')?.classList.contains('later'), 'later chip');
      t.eq(dueChip(t, '33').title, day(40), 'stored value is the tooltip');
      t.ok(!t.row('34').querySelector('.due-chip'), 'no chip without a date');
    },
  },
  {
    area,
    name: 'filter buttons: Overdue and Has due date',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.click(chip(t, 'overdue'));
      await t.settle();
      t.eq(t.rowIds(), ['31'], 'Overdue only');
      t.click(chip(t, 'due'));
      await t.settle();
      t.eq(t.rowIds().sort(), ['31', '32', '33'], 'every link with a date');
    },
  },
  {
    area,
    name: 'Overdue filter with nothing late says so',
    page: 'newtab',
    fixture: () => withMeta({ 32: { due: day(2) } }),
    async run(t) {
      await t.folder('Shop API');
      t.click(chip(t, 'overdue'));
      await t.settle();
      t.eq(t.$('#page .empty')?.textContent, 'Nothing matches the filter.', 'empty state');
    },
  },
  {
    area,
    name: 'a due date alone shows the filter buttons',
    page: 'newtab',
    fixture: () => withMeta({ 33: { due: day(40) } }),
    async run(t) {
      await t.folder('Shop API');
      t.ok(chip(t, 'due'), 'filter shown');
    },
  },
  {
    area,
    name: 'link menu: Set due date focuses the date box; edit form saves date and time',
    page: 'newtab',
    fixture: () => withMeta({ 32: { note: 'Read first', pri: 'high' } }),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('32'));
      t.ok(!t.menuLabels().includes('Add to Google Calendar'), 'no calendar item without a date');
      t.ok(!t.menuLabels().includes('Clear due date'), 'no clear item without a date');
      t.menu('Set due date');
      await t.settle();
      const date = t.$('#page .edit .due-date');
      t.eq(t.d.activeElement, t.$('#page .edit .due-q'), 'Today chip focused');
      t.type(date, '2030-04-10');
      t.type(t.$('#page .edit .due-time'), '10:00');
      t.click(t.$('#page .edit button[type=submit]'));
      await t.settle();
      t.eq(t.store.linkMeta['32'], { note: 'Read first', pri: 'high', due: '2030-04-10T10:00' }, 'note and priority kept, due added');
      t.eq(dueChip(t, '32')?.textContent, 'Due 10 Apr 2030 10:00', 'chip shown');
      t.ok(!t.tabs.some((x) => x.url?.includes('calendar.google.com')), 'no calendar tab when the box is off');
    },
  },
  {
    area,
    name: 'edit form keeps an existing due date when only the title changes',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('33'));
      t.menu('Edit title / URL');
      await t.settle();
      t.eq(t.$('#page .edit .due-date').value, day(40), 'date filled in');
      t.click(t.$('#page .edit button[type=submit]'));
      await t.settle();
      t.eq(t.store.linkMeta['33'], { due: day(40) }, 'due kept');
    },
  },
  {
    area,
    name: 'edit form: "Also add to Google Calendar" opens the event after save',
    page: 'newtab',
    fixture: () => withMeta({}),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      t.menu('Set due date');
      await t.settle();
      t.ok(t.$('#page .edit .due-cal-box').disabled, 'box disabled without a date');
      t.type(t.$('#page .edit .due-date'), '2030-04-10');
      t.click(t.$('#page .edit .due-cal-box'));
      t.click(t.$('#page .edit button[type=submit]'));
      await t.settle();
      const cal = t.tabs.find((x) => x.url?.startsWith('https://calendar.google.com/calendar/render'));
      t.ok(cal, 'calendar tab opened');
      const q = new URL(cal?.url || 'https://x').searchParams;
      t.eq(q.get('text'), 'Shop PROD', 'event title');
      t.eq(q.get('dates'), '20300410/20300411', 'all-day dates');
      t.eq(q.get('details'), 'https://shop.example.com/api/x', 'link in details');
    },
  },
  {
    area,
    name: 'link menu: Add to Google Calendar and Clear due date',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('32'));
      t.ok(t.menuLabels().includes('Change due date'), 'Change label when a date exists');
      t.menu('Add to Google Calendar');
      await t.settle();
      const cal = t.tabs.find((x) => x.url?.startsWith('https://calendar.google.com/calendar/render'));
      t.ok(cal, 'calendar tab opened');
      t.eq(new URL(cal?.url || 'https://x').searchParams.get('details'), 'Read first\n\nhttps://test.shop.example.com/api/x', 'note and link in details');
      t.context(t.row('32'));
      t.menu('Clear due date');
      await t.settle();
      t.eq(t.store.linkMeta['32'], { note: 'Read first' }, 'only the date removed');
      t.ok(!dueChip(t, '32'), 'chip gone');
    },
  },
];
