import { base } from '../fixtures.js';

const area = 'schedule';
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const META = () => ({
  31: { due: day(-3), pri: 'high' },
  24: { due: day(-1) },
  32: { due: day(0), note: 'Before lunch' },
  33: { due: day(2) },
  60: { due: day(40) },
  34: { note: 'No date' },
});
const withMeta = (meta = META(), opts = {}) => {
  const f = base(opts);
  f.store.linkMeta = meta;
  return f;
};
const open = async (t) => {
  t.click(t.$('#scheduleBtn'));
  await t.settle();
};
const headers = (t) => t.$$('#page .grp.dueg').map((g) => [g.dataset.due, g.textContent.trim()]);

export default [
  {
    area,
    name: 'schedule: the third view tab opens every link with a due date, grouped and earliest first',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      const btn = t.$('#scheduleBtn');
      t.eq(btn?.parentElement, t.$('.side .view-tabs'), 'Schedule is in the view tabs');
      t.eq(
        t.$$('.side .view-tabs .view-tab').map((b) => b.id),
        ['homeBtn', 'boardBtn', 'scheduleBtn'],
        'order Home, Board, Schedule',
      );
      t.eq(btn.getAttribute('aria-label'), 'Schedule', 'accessible name');
      await open(t);
      t.ok(btn.classList.contains('on'), 'tab marked on');
      t.eq(btn.getAttribute('aria-current'), 'page', 'aria-current');
      t.ok(!t.$('#homeBtn').classList.contains('on') && !t.$('#boardBtn').classList.contains('on'), 'other tabs off');
      t.eq(t.$('#page h2').textContent, 'Schedule', 'title');
      t.eq(t.$('#page .head .cnt').textContent, '5 links', 'count');
      t.eq(
        headers(t),
        [
          ['overdue', 'Overdue2'],
          ['today', 'Today1'],
          ['soon', 'Next 7 days1'],
          ['later', 'Later1'],
        ],
        'groups in order with counts',
      );
      t.eq(t.rowIds(), ['31', '24', '32', '33', '60'], 'earliest first; links without a date left out');
      t.eq(t.row('24').querySelector('.crumb')?.textContent, 'Sprint tasks › Blocked', 'crumb with section');
      t.eq(t.row('60').querySelector('.crumb')?.textContent, 'Unsorted', 'crumb for a loose link');
      t.ok(t.row('31').querySelector('.pri-bar'), 'priority stripe kept');
      t.ok(t.row('32').querySelector('.note'), 'note kept');
      t.ok(!t.$('#homeFab').hidden, 'floating Home button shows');
    },
  },
  {
    area,
    name: 'schedule: a group header collapses and the state is saved',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await open(t);
      const hdr = t.$('#page .grp.dueg[data-due="overdue"]');
      t.eq(hdr.getAttribute('aria-expanded'), 'true', 'open');
      t.click(hdr);
      await t.settle();
      t.eq(t.$('#page .grp.dueg[data-due="overdue"]').getAttribute('aria-expanded'), 'false', 'closed');
      t.eq(t.rowIds(), ['32', '33', '60'], 'its rows hidden');
      t.eq(t.settings().folders.schedule.closed.overdue, true, 'saved');
    },
  },
  {
    area,
    name: 'schedule: delete a row with the trash button; Undo brings it back with its date',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await open(t);
      t.click(t.row('33').querySelector('.act.del'));
      await t.settle();
      t.ok(!t.row('33'), 'row gone');
      t.ok(!t.node('33'), 'bookmark deleted');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('30').children[2];
      t.eq(back?.url, 'https://stage.shop.example.com/api/x', 'link restored');
      t.eq(t.store.linkMeta[back.id], { due: day(2) }, 'due date restored');
      t.ok(t.row(back.id), 'row back in the schedule');
    },
  },
  {
    area,
    name: 'schedule: rows do not reorder by drag; a drop on a sidebar folder still moves the link',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await open(t);
      t.ok(!t.drag(t.row('33'), t.row('32'), 'before'), 'row drop refused');
      t.drag(t.row('33'), t.nav('Empty'));
      await t.settle();
      t.eq(t.node('33')?.parentId, '50', 'moved to Empty');
      t.ok(t.row('33'), 'still in the schedule');
    },
  },
  {
    area,
    name: 'schedule: no due dates shows what to do',
    page: 'newtab',
    fixture: () => withMeta({ 34: { note: 'No date' } }),
    async run(t) {
      await open(t);
      t.eq(t.$('#page .head .cnt').textContent, '0 links', 'count');
      t.ok(t.$('#page .empty')?.textContent.startsWith('No links with a due date.'), 'empty state');
    },
  },
  {
    area,
    name: 'schedule: a date set elsewhere (popup) shows at once; Escape from Settings returns to the schedule',
    page: 'newtab',
    fixture: () => withMeta({}),
    async run(t) {
      await open(t);
      await t.w.chrome.storage.local.set({ linkMeta: { 41: { due: day(1) } } });
      await t.settle();
      t.eq(t.rowIds(), ['41'], 'new row');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.key(t.d.body, 'Escape');
      await t.settle();
      t.ok(t.$('#scheduleBtn').classList.contains('on'), 'back on the schedule');
    },
  },
  {
    area,
    name: 'schedule: j/k walk Home, Board, Schedule, then folders; the palette lists Schedule',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      t.click(t.$('#boardBtn'));
      await t.settle();
      t.d.activeElement?.blur();
      t.key(t.d.body, 'j');
      await t.settle();
      t.ok(t.$('#scheduleBtn').classList.contains('on'), 'j from Board opens Schedule');
      t.key(t.d.body, 'j');
      await t.settle();
      t.ok(t.nav('Sprint tasks')?.classList.contains('on'), 'then the first folder');
      await t.palette();
      const item = t.$$('#palList .pal-item').find((o) => o.querySelector('.pal-t').textContent === 'Schedule');
      t.ok(item, 'Schedule place in the palette');
      t.click(item);
      await t.settle();
      t.ok(t.$('#scheduleBtn').classList.contains('on'), 'palette opens Schedule');
    },
  },
  {
    area,
    name: 'due chip sits on the right of the row (folder, search, schedule); under the link at 760 px or less',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      const check = (where, id) => {
        const r = t.row(id);
        const chip = r?.querySelector('.due-chip');
        t.ok(chip && !r.querySelector('.txt').contains(chip), `${where}: chip outside the text`);
        t.ok(chip?.parentElement.classList.contains('due-col'), `${where}: in the due column`);
        t.ok(chip.getBoundingClientRect().left >= r.querySelector('.txt').getBoundingClientRect().right, `${where}: right of the text`);
      };
      await t.folder('Shop API');
      check('folder', '31');
      const a = t.row('31').querySelector('.due-chip').getBoundingClientRect().right;
      const b = t.row('33').querySelector('.due-chip').getBoundingClientRect().right;
      t.ok(Math.abs(a - b) <= 1, 'chips line up on the right');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      check('search', '31');
      t.click(t.$('#scheduleBtn'));
      await t.settle();
      check('schedule', '33');
      const fr = t.w.frameElement;
      const w0 = fr.style.width;
      fr.style.width = '700px';
      await t.settle();
      try {
        const r = t.row('33');
        const chip = r.querySelector('.due-chip').getBoundingClientRect();
        const txt = r.querySelector('.txt').getBoundingClientRect();
        t.ok(chip.top >= txt.bottom - 1, 'narrow: chip under the link');
        t.ok(Math.abs(chip.left - txt.left) <= 2, 'narrow: chip lines up with the text');
        t.ok(Math.abs(r.querySelector('.acts').getBoundingClientRect().top - txt.top) <= 6, 'narrow: actions stay on the first line');
      } finally {
        fr.style.width = w0;
        await t.settle();
      }
    },
  },
];
