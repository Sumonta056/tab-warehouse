import { base, F, L } from '../fixtures.js';

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
const chk = (t, id) => t.row(id)?.querySelector('.chk');
const noNav = (t) => t.d.addEventListener('click', (e) => e.target.closest?.('a.row') && e.preventDefault());

export default [
  {
    area,
    name: "today: the Today's top list row sits above the folders, outside #nav, and opens every link with a due date, grouped and earliest first",
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      const btn = t.$('#scheduleBtn');
      t.ok(btn && !btn.closest('#nav') && !btn.closest('.view-tabs'), 'not in #nav and not a view tab');
      t.eq(
        t.$$('.side .view-tabs .view-tab').map((b) => b.id),
        ['homeBtn', 'boardBtn'],
        'two view tabs: Home, Board',
      );
      t.eq(btn.nextElementSibling, t.$('#nav'), 'directly above the folders');
      t.ok(btn.getBoundingClientRect().bottom <= t.$('#nav').getBoundingClientRect().top, 'drawn above the folders');
      t.ok(btn.getBoundingClientRect().top >= t.$('.side .view-tabs').getBoundingClientRect().bottom, 'under the view tabs');
      t.ok(btn.classList.contains('nav'), 'styled like a folder row');
      t.ok(btn.getBoundingClientRect().height >= 28, 'at least 28 px tall');
      t.ok(btn.getAttribute('draggable') !== 'true' && !btn.querySelector('.grip'), 'cannot be dragged');
      t.ok(btn.querySelector('#scheduleIcon svg'), 'icon');
      t.eq(btn.querySelector('.t').textContent, "Today's top list", 'label');
      t.eq(btn.querySelector('#todayCnt').textContent, '3', 'count');
      t.ok(btn.querySelector('#todayCnt').getBoundingClientRect().right > btn.querySelector('.t').getBoundingClientRect().right, 'count on the right');
      t.eq(btn.getAttribute('aria-label'), "Today's top list, 3 open, some overdue", 'accessible name with the count');
      t.ok(btn.title.startsWith("Today's top list"), 'tooltip');
      t.ok(!btn.classList.contains('on') && btn.getAttribute('aria-current') !== 'page', 'not marked on Home');
      btn.addEventListener('contextmenu', (e) => t.ok(!e.defaultPrevented, 'no folder menu on right-click'));
      btn.dispatchEvent(new t.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      await t.settle();
      t.ok(!t.$('.menu'), 'no menu');
      await open(t);
      t.ok(btn.classList.contains('on'), 'row marked on');
      t.eq(btn.getAttribute('aria-current'), 'page', 'aria-current');
      t.ok(!t.$('#homeBtn').classList.contains('on') && !t.$('#boardBtn').classList.contains('on'), 'view tabs off');
      t.ok(!t.$$('#nav .nav.on').length, 'no folder marked on');
      t.ok(!t.$('#homeFab').hidden, 'floating Home button shows');
      t.eq(t.$('#page h2').textContent, "Today's top list", 'title');
      t.eq(t.$('#page .head .cnt').textContent, '0 of 3 done', 'n of m done (m = overdue + today + done today)');
      t.eq(t.$('#page .head .today-bar')?.getAttribute('aria-valuenow'), '0', 'progress bar');
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
      const part = t.$('#page .today-part');
      t.eq(part?.firstChild.textContent, 'Upcoming', 'Upcoming part header');
      t.eq(part?.querySelector('.cnt').textContent, '2 links', 'Upcoming count');
      const kids = [...t.$('#page .list.schedule').children];
      t.ok(
        kids.indexOf(part) > kids.indexOf(t.row('32')) && kids.indexOf(part) < kids.indexOf(t.$('#page .grp.dueg.soon')),
        'Upcoming sits between Today and Next 7 days',
      );
      t.ok(
        t.$$('#page .row').every((r) => r.querySelector('.chk')),
        'every row has a box',
      );
      t.eq(t.row('24').querySelector('.crumb')?.textContent, 'Sprint tasks › Blocked', 'crumb with section');
      t.eq(t.row('60').querySelector('.crumb')?.textContent, 'Unsorted', 'crumb for a loose link');
      t.ok(t.row('31').querySelector('.pri-bar'), 'priority stripe kept');
      t.ok(t.row('32').querySelector('.note'), 'note kept');
      t.ok(!t.$('#homeFab').hidden, 'floating Home button shows');
    },
  },
  {
    area,
    name: "today's top list row: at 180 px and 140 % text the label is cut with …, the icon and count keep their size and nothing overflows",
    page: 'newtab',
    fixture: () => withMeta(META(), { settings: { sideWidth: 180, fontSide: 140 } }),
    async run(t) {
      t.d.documentElement.style.setProperty('--fs-side', '1.4');
      await t.settle();
      const btn = t.$('#scheduleBtn');
      const lbl = btn.querySelector('.t');
      const ic = btn.querySelector('#scheduleIcon');
      const cnt = btn.querySelector('#todayCnt');
      const r = btn.getBoundingClientRect();
      t.ok(Math.round(t.$('.side').getBoundingClientRect().width) <= 181, 'sidebar is 180 px');
      t.eq(t.w.getComputedStyle(lbl).textOverflow, 'ellipsis', 'label ends with …');
      t.ok(lbl.scrollWidth > lbl.clientWidth, 'label is cut');
      t.ok(ic.getBoundingClientRect().width >= 14, 'icon keeps its size');
      t.eq(cnt.textContent, '3', 'count shows');
      t.ok(cnt.scrollWidth <= cnt.clientWidth && cnt.getBoundingClientRect().width >= 18, 'count keeps its size');
      t.ok(
        [ic, lbl, cnt].every((k) => k.getBoundingClientRect().left >= r.left - 0.5 && k.getBoundingClientRect().right <= r.right + 0.5),
        'everything inside the row',
      );
      t.ok(btn.scrollWidth <= btn.clientWidth && t.$('.side').scrollWidth <= t.$('.side').clientWidth, 'no overflow');
      t.d.documentElement.style.setProperty('--side-w', '320px');
      t.d.documentElement.style.setProperty('--fs-side', '1');
      await t.settle();
      t.ok(lbl.scrollWidth <= lbl.clientWidth, 'full label when there is room');
    },
  },
  {
    area,
    name: "today's top list row: stays above the categories, is not dropped on, and global search un-marks it",
    page: 'newtab',
    fixture: () =>
      withMeta(META(), {
        settings: { categories: [{ id: 'c1', name: 'Daily working', closed: false }], folderCat: { 20: 'c1' } },
      }),
    async run(t) {
      const btn = t.$('#scheduleBtn');
      t.eq(btn.nextElementSibling, t.$('#nav'), 'directly above #nav');
      t.ok(t.$('#nav > .cat'), 'categories render in #nav');
      t.ok(btn.getBoundingClientRect().bottom <= t.$('#nav > .cat').getBoundingClientRect().top, 'above the first category');
      await t.folder('Shop API');
      const parent = t.node('31').parentId;
      t.eq(t.drag(t.row('31'), btn), false, 'a link is not dropped on the row');
      await t.settle();
      t.eq(t.node('31').parentId, parent, 'link not moved');
      await open(t);
      t.ok(btn.classList.contains('on'), 'on');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.ok(!btn.classList.contains('on') && btn.getAttribute('aria-current') !== 'page', 'search un-marks the row');
      t.key(t.$('#q'), 'Escape');
      await t.settle();
      t.ok(btn.classList.contains('on') && btn.getAttribute('aria-current') === 'page', 'Escape marks it again');
      t.eq(t.$('#page h2').textContent, "Today's top list", 'back on the page');
    },
  },
  {
    area,
    name: 'today: a group header collapses and the state is saved',
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
    name: 'today: delete a row with the trash button; Undo brings it back with its date',
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
      t.ok(t.row(back.id), 'row back in Today');
    },
  },
  {
    area,
    name: 'today: rows do not reorder by drag; a drop on a sidebar folder still moves the link',
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
    name: 'today: no due dates shows what to do',
    page: 'newtab',
    fixture: () => withMeta({ 34: { note: 'No date' } }),
    async run(t) {
      await open(t);
      t.eq(t.$('#page .head .cnt').textContent, '0 of 0 done', 'count');
      t.ok(!t.$('#page .today-bar'), 'no progress bar');
      t.ok(t.$('#page .empty')?.textContent.startsWith('No links with a due date.'), 'empty state');
    },
  },
  {
    area,
    name: 'today: a date set elsewhere (popup) shows at once; Escape from Settings returns to the schedule',
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
      t.ok(t.$('#scheduleBtn').classList.contains('on'), 'back on Today');
    },
  },
  {
    area,
    name: "today: j/k walk Home, Board, Today's top list, then folders; the palette lists Today's top list",
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      t.click(t.$('#boardBtn'));
      await t.settle();
      t.d.activeElement?.blur();
      t.key(t.d.body, 'j');
      await t.settle();
      t.ok(t.$('#scheduleBtn').classList.contains('on'), 'j from Board opens Today');
      t.key(t.d.body, 'j');
      await t.settle();
      t.ok(t.nav('Sprint tasks')?.classList.contains('on'), 'then the first folder');
      await t.palette();
      const item = t.$$('#palList .pal-item').find((o) => o.querySelector('.pal-t').textContent === "Today's top list");
      t.ok(item, 'Today place in the palette');
      t.click(item);
      await t.settle();
      await t.relay();
      t.ok(t.$('#scheduleBtn').classList.contains('on'), 'palette opens Today');
    },
  },
  {
    area,
    name: 'due chip sits on the right of the row (folder, search, today); under the link at 760 px or less',
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
      check('today', '33');
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
  {
    area,
    name: 'today: tick moves a link to Done today with "Done · deleted tomorrow"; untick puts it back',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await open(t);
      const box = chk(t, '32');
      t.eq(box?.getAttribute('role'), 'checkbox', 'role');
      t.eq(box?.getAttribute('aria-checked'), 'false', 'not ticked');
      t.eq(box?.getAttribute('aria-label'), 'Done: Shop TEST', 'name');
      t.ok(box.getBoundingClientRect().width >= 28 && box.getBoundingClientRect().height >= 28, 'at least 28 px');
      t.click(box);
      await t.settle();
      t.eq(t.store.linkMeta['32'], { note: 'Before lunch', due: day(0), done: day(0) }, 'done = today, note kept');
      t.eq(chk(t, '32').getAttribute('aria-checked'), 'true', 'ticked');
      t.ok(t.row('32').classList.contains('done'), 'row marked done');
      t.eq(t.row('32').querySelector('.due-chip').textContent, 'Done · deleted tomorrow', 'chip text');
      t.ok(t.row('32').querySelector('.due-chip').classList.contains('done'), 'done chip');
      t.eq(
        headers(t),
        [
          ['overdue', 'Overdue2'],
          ['done', 'Done today1'],
          ['soon', 'Next 7 days1'],
          ['later', 'Later1'],
        ],
        'Done today after Today, Today empty and left out',
      );
      t.eq(t.$('#page .head .cnt').textContent, '1 of 3 done', 'head count');
      t.eq(t.$('#page .head .today-bar').getAttribute('aria-valuenow'), '1', 'progress');
      t.click(chk(t, '31'));
      await t.settle();
      t.eq(t.$('#page .head .cnt').textContent, '2 of 3 done', 'second tick');
      t.click(chk(t, '32'));
      await t.settle();
      t.eq(t.store.linkMeta['32'], { note: 'Before lunch', due: day(0) }, 'untick removes done');
      t.eq(chk(t, '32').getAttribute('aria-checked'), 'false', 'unticked');
      t.ok(t.$('#page .grp.dueg.today'), 'back in Today');
      await t.folder('Shop API');
      t.eq(t.row('31').querySelector('.due-chip').textContent, 'Done · deleted tomorrow', 'folder page shows the done chip');
      t.ok(!t.row('31').querySelector('.chk'), 'no box on the folder page');
    },
  },
  {
    area,
    name: 'today: a click on a link opens it and ticks it; a ticked link is not unticked by a click',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await open(t);
      noNav(t);
      const row = t.row('24');
      t.eq(row.getAttribute('target'), '_blank', 'opens in a new tab');
      t.click(row.querySelector('.ttl'));
      await t.settle();
      t.eq(t.store.linkMeta['24'].done, day(0), 'ticked');
      t.click(t.row('24').querySelector('.ttl'));
      await t.settle();
      t.eq(t.store.linkMeta['24'].done, day(0), 'still ticked');
      t.click(t.row('33').querySelector('.act.more'));
      await t.menuShown();
      t.key(t.d, 'Escape');
      await t.settle();
      t.ok(!t.store.linkMeta['33'].done, 'a click on a row button does not tick');
      await t.folder('Shop API');
      noNav(t);
      t.click(t.row('33').querySelector('.ttl'));
      await t.settle();
      t.ok(!t.store.linkMeta['33'].done, 'a click on the folder page does not tick');
    },
  },
  {
    area,
    name: 'today: the row counts open links, red with an overdue link, yellow with only today, hidden at 0',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      const cnt = () => t.$('#scheduleBtn #todayCnt');
      const tab = t.$('#scheduleBtn');
      t.eq(cnt()?.textContent, '3', 'overdue + today');
      t.ok(!cnt().hidden && cnt().classList.contains('overdue'), 'red while one is overdue');
      t.eq(cnt().getAttribute('aria-hidden'), 'true', 'the count itself is not read twice');
      t.eq(
        [tab.getAttribute('aria-label'), tab.title],
        ["Today's top list, 3 open, some overdue", "Today's top list · 3 open, some overdue · links due today and later"],
        'name and tooltip say the count',
      );
      const red = t.w.getComputedStyle(cnt()).color;
      const m = { ...t.store.linkMeta };
      m[31] = { ...m[31], done: day(0) };
      m[24] = { ...m[24], done: day(0) };
      await t.w.chrome.storage.local.set({ linkMeta: m });
      await t.settle();
      t.eq(cnt().textContent, '1', 'ticked links do not count');
      t.ok(!cnt().classList.contains('overdue'), 'yellow with only today');
      t.eq([tab.getAttribute('aria-label'), tab.title], ["Today's top list, 1 open", "Today's top list · 1 open · links due today and later"], 'name follows');
      t.ok(t.w.getComputedStyle(cnt()).color !== red, 'another color');
      m[32] = { ...m[32], done: day(0) };
      await t.w.chrome.storage.local.set({ linkMeta: m });
      await t.settle();
      t.ok(cnt().hidden && !cnt().getClientRects().length, 'hidden at 0');
      t.eq([tab.getAttribute('aria-label'), tab.title], ["Today's top list", "Today's top list · links due today and later"], 'plain name at 0');
      await t.w.chrome.storage.local.set({ linkMeta: META() });
      await t.settle();
      const btn = t.$('#scheduleBtn');
      for (const w of [180, 264, 320]) {
        t.d.documentElement.style.setProperty('--side-w', `${w}px`);
        await t.settle();
        const r = btn.getBoundingClientRect();
        t.ok(cnt().getClientRects().length, `${w} px: count shows`);
        t.ok(
          [...btn.children]
            .filter((k) => k.getClientRects().length)
            .every((k) => k.getBoundingClientRect().left >= r.left && k.getBoundingClientRect().right <= r.right),
          `${w} px: row content fits`,
        );
        t.ok(Math.abs(r.width - t.$('.side .view-tabs').getBoundingClientRect().width) <= 1, `${w} px: row is as wide as the sidebar`);
      }
    },
  },
  {
    area,
    name: 'today: with no link due today the top says what to do and Upcoming still shows',
    page: 'newtab',
    fixture: () => withMeta({ 33: { due: day(2) }, 60: { due: day(40) } }),
    async run(t) {
      await open(t);
      t.eq(t.$('#page .list.schedule > .empty')?.textContent, 'Nothing for today. Use “Add to today” in the ⋯ menu of a link.', 'empty top');
      t.eq(t.$('#page .head .cnt').textContent, '0 of 0 done', 'head');
      t.eq(t.$('#page .today-part .cnt')?.textContent, '2 links', 'Upcoming');
      t.eq(t.rowIds(), ['33', '60'], 'upcoming rows');
      t.ok(t.$('#scheduleBtn #todayCnt').hidden, 'no count');
    },
  },
  {
    area,
    name: 'today: links ticked before today are deleted at start with an Undo that brings back the link, note and priority',
    page: 'newtab',
    fixture: () =>
      withMeta({
        33: { due: day(-2), done: day(-1), note: 'Check stage', pri: 'high' },
        24: { due: day(-1), done: day(-1) },
        32: { due: day(0), done: day(0) },
      }),
    async run(t) {
      await t.until(() => t.toast(), 'the toast');
      t.eq(t.toast()?.firstChild.textContent, 'Deleted 2 done links', 'toast');
      t.ok(!t.node('33') && !t.node('24'), 'both bookmarks deleted');
      t.ok(t.node('32'), 'a link ticked today stays');
      t.eq(Object.keys(t.store.linkMeta), ['32'], 'their entries removed');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      const back = t.node('30').children[2];
      t.eq([back?.title, back?.url], ['Shop STAGE', 'https://stage.shop.example.com/api/x'], 'restored at the same parent and index');
      t.eq(t.store.linkMeta[back.id], { note: 'Check stage', pri: 'high' }, 'note and priority back, no due, no done');
      const old = t.node('23').children[0];
      t.eq(old?.url, 'https://tracker.example.com/issues/100', 'section link restored');
      t.ok(!t.store.linkMeta[old.id], 'no entry for a link that had only a date');
      await t.settle();
      t.eq(t.node('30').children.length, 4, 'nothing swept again');
    },
  },
  {
    area,
    name: 'today: one done link says "Deleted 1 done link"; a tab that finds it already gone shows no toast',
    page: 'newtab',
    fixture: () => withMeta({ 33: { due: day(-2), done: day(-1) } }),
    async run(t) {
      await t.until(() => t.toast(), 'the toast');
      t.eq(t.toast()?.firstChild.textContent, 'Deleted 1 done link', 'toast');
      t.toast().remove();
      let hidden = true;
      Object.defineProperty(t.d, 'hidden', { configurable: true, get: () => hidden });
      const remove = t.w.chrome.bookmarks.remove;
      t.w.chrome.bookmarks.remove = async (id) => {
        await remove(id);
        return remove(id);
      };
      await t.w.chrome.storage.local.set({ linkMeta: { 31: { due: day(-3), done: day(-1) }, 32: { due: day(0) } } });
      await t.settle();
      hidden = false;
      t.d.dispatchEvent(new t.w.Event('visibilitychange'));
      await t.until(() => !t.node('31'), 'the sweep on show');
      await t.settle();
      t.ok(!t.toast(), 'no toast when another tab deleted it first');
      t.eq(t.store.linkMeta, { 32: { due: day(0) } }, 'its entry removed anyway');
      t.ok(t.$('#home'), 'the page still works');
    },
  },
  {
    area,
    name: 'today: ⋯ Add to today sets the date to today, keeps note and priority, clears done; hidden when due today',
    page: 'newtab',
    fixture: () => withMeta({ ...META(), 33: { due: day(-2), done: day(0), note: 'n', pri: 'low' } }),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('34'));
      await t.menuShown();
      const labels = t.menuLabels();
      t.ok(labels.indexOf('Add to today') >= 0 && labels.indexOf('Add to today') === labels.indexOf('Set due date') - 1, 'right before the due date item');
      t.menu('Add to today');
      await t.settle();
      t.eq(t.store.linkMeta['34'], { note: 'No date', due: day(0) }, 'due = today');
      t.ok(t.toast()?.textContent.includes('Added “Shop local” to today'), 'toast');
      t.ok(t.row('34').querySelector('.due-chip.today'), 'chip shows today');
      t.context(t.row('34'));
      await t.menuShown();
      t.ok(!t.menuLabels().includes('Add to today'), 'not offered when due today');
      t.key(t.d, 'Escape');
      t.context(t.row('33'));
      await t.menuShown();
      t.menu('Add to today');
      await t.settle();
      t.eq(t.store.linkMeta['33'], { note: 'n', pri: 'low', due: day(0) }, 'done cleared, note and priority kept');
      t.type(t.$('#q'), 'repo');
      await t.settle();
      t.context(t.row('41'));
      await t.menuShown();
      t.menu('Add to today');
      await t.settle();
      t.eq(t.store.linkMeta['41'], { due: day(0) }, 'from search results');
      await open(t);
      t.context(t.row('31'));
      await t.menuShown();
      t.menu('Add to today');
      await t.settle();
      t.eq(t.store.linkMeta['31'].due, day(0), 'from Today');
      t.eq(t.rowIds().slice(0, 3), ['24', '31', '32'], 'moved from Overdue to Today');
    },
  },
  {
    area,
    name: 'today: the edit form keeps done while the date stays and drops it when the date changes',
    page: 'newtab',
    fixture: () => withMeta({ 32: { due: day(0), done: day(0) } }),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.row('32').querySelector('.act[aria-label="Edit title and URL"]'));
      await t.settle();
      t.click(t.$('#page .edit button[type=submit]'));
      await t.settle();
      t.eq(t.store.linkMeta['32'], { due: day(0), done: day(0) }, 'kept');
      t.click(t.row('32').querySelector('.act[aria-label="Edit title and URL"]'));
      await t.settle();
      t.type(t.$('#page .edit .due-date'), day(3));
      t.click(t.$('#page .edit button[type=submit]'));
      await t.settle();
      t.eq(t.store.linkMeta['32'], { due: day(3) }, 'dropped with a new date');
    },
  },
  {
    area,
    name: "today: a two-digit count and 99+ fit inside the Today's top list row at every sidebar width from 180 to 440 px and text size 80 to 140 %",
    page: 'newtab',
    fixture: () => {
      const f = base({
        extraRoot: [
          F(
            '900',
            'Many',
            Array.from({ length: 120 }, (_, i) => L(`9${i}`, `Task ${i}`, `https://t${i}.example.com/`)),
          ),
        ],
      });
      f.store.linkMeta = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`9${i}`, { due: day(-1) }]));
      return f;
    },
    async run(t) {
      const btn = t.$('#scheduleBtn');
      const cnt = t.$('#scheduleBtn #todayCnt');
      const bad = [];
      for (const [n, text] of [
        [12, '12'],
        [120, '99+'],
      ]) {
        await t.w.chrome.storage.local.set({ linkMeta: Object.fromEntries(Array.from({ length: n }, (_, i) => [`9${i}`, { due: day(-1) }])) });
        await t.settle();
        t.eq(cnt.textContent, text, `${n} open links`);
        for (const fs of ['0.8', '1', '1.4']) {
          t.d.documentElement.style.setProperty('--fs-side', fs);
          for (let w = 180; w <= 440; w += 4) {
            t.d.documentElement.style.setProperty('--side-w', `${w}px`);
            await t.settle();
            const r = btn.getBoundingClientRect();
            const out = [...btn.children]
              .filter((k) => k.getClientRects().length)
              .some((k) => k.getBoundingClientRect().left < r.left - 0.5 || k.getBoundingClientRect().right > r.right + 0.5);
            if (!cnt.getClientRects().length || out || btn.scrollWidth > btn.clientWidth || cnt.scrollWidth > cnt.clientWidth) bad.push(`${text} ${fs} ${w}`);
          }
        }
      }
      t.eq(bad, [], 'count, text size and widths where the count is hidden or the tab overflows');
    },
  },
  {
    area,
    name: 'today: a backup with an old done day imports the links and the next refresh keeps them',
    page: 'newtab',
    fixture: () => withMeta({}),
    async run(t) {
      const { importFile } = await t.w.eval("import('/extension/services/import.js')");
      const old = { due: day(-5), done: day(-4) };
      const data = {
        format: 'sumonta-warehouse',
        version: 1,
        sections: [
          {
            title: 'Shop API',
            links: [
              { title: 'Shop TEST', url: 'https://test.shop.example.com/api/x', ...old },
              { title: 'New', url: 'https://new.example.com/', ...old, note: 'fresh' },
            ],
          },
        ],
      };
      await importFile(new t.w.File([JSON.stringify(data)], 'w.json', { type: 'application/json' }), t.node('10'), t.settings());
      await t.settle();
      await t.w.chrome.bookmarks.update('31', { title: 'Shop PROD 2' });
      await t.settle();
      const fresh = t.node('30').children.find((c) => c.url === 'https://new.example.com/');
      t.ok(t.node('32') && fresh, 'both links still there after refresh');
      t.ok(!t.toast(), 'nothing swept');
      t.eq(t.store.linkMeta['32'], { due: day(-5) }, 'existing link: no done');
      t.eq(t.store.linkMeta[fresh?.id], { note: 'fresh', due: day(-5) }, 'new link: no done');
    },
  },
  {
    area,
    name: 'today: a hidden tab does not delete done links on refresh; it deletes them and shows the toast when shown',
    page: 'newtab',
    fixture: () => withMeta({ 32: { due: day(0), done: day(0) }, 33: { due: day(1) } }),
    async run(t) {
      await t.settle();
      t.ok(t.node('32') && !t.toast(), 'a link ticked today stays at start');
      let hidden = true;
      Object.defineProperty(t.d, 'hidden', { configurable: true, get: () => hidden });
      const Real = t.w.Date;
      const shift = 864e5;
      t.w.Date = class extends Real {
        constructor(...a) {
          if (a.length) super(...a);
          else super(Real.now() + shift);
        }
        static now() {
          return Real.now() + shift;
        }
      };
      try {
        await t.w.chrome.bookmarks.update('31', { title: 'Shop PROD 2' });
        await t.settle();
        t.eq(t.node('31').title, 'Shop PROD 2', 'the hidden tab refreshed');
        t.ok(t.node('32') && !t.toast(), 'a hidden tab deletes nothing');
        t.eq(t.store.linkMeta['32'], { due: day(0), done: day(0) }, 'its entry stays');
        hidden = false;
        t.d.dispatchEvent(new t.w.Event('visibilitychange'));
        await t.until(() => !t.node('32'), 'the sweep on show');
        await t.until(() => t.toast(), 'the toast');
        t.eq(t.toast()?.firstChild.textContent, 'Deleted 1 done link', 'toast in the shown tab');
      } finally {
        t.w.Date = Real;
        delete t.d.hidden;
      }
    },
  },
  {
    area,
    name: 'today: the sweep keeps a ticked Home link and a ticked link outside the root folder',
    page: 'newtab',
    fixture: () =>
      withMeta(
        {
          33: { due: day(-2), done: day(-1) },
          71: { due: day(-2), done: day(-1) },
          80: { due: day(-2), done: day(-1) },
        },
        {
          settings: { home: { folderId: '70', seeded: true } },
          other: [F('70', 'Home', [L('71', 'GitHub', 'https://github.com/')]), L('80', 'Elsewhere', 'https://elsewhere.example.com/')],
        },
      ),
    async run(t) {
      await t.until(() => t.toast(), 'the toast');
      t.eq(t.toast()?.firstChild.textContent, 'Deleted 1 done link', 'only the link under the root');
      t.ok(!t.node('33'), 'a link under the root is deleted');
      t.ok(t.node('71') && t.node('80'), 'the Home link and the link outside the root stay');
      t.ok(t.store.linkMeta['71'] && t.store.linkMeta['80'], 'their entries stay');
    },
  },
  {
    area,
    name: 'today: Undo of a deleted done link brings back note, priority and due date but never done',
    page: 'newtab',
    fixture: () => withMeta({ 32: { due: day(0), done: day(0), note: 'n', pri: 'low' } }),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.row('32').querySelector('.act[aria-label="Delete link"]'));
      await t.settle();
      t.ok(!t.node('32') && !t.store.linkMeta['32'], 'deleted with its entry');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('30').children[1];
      t.eq(back?.url, 'https://test.shop.example.com/api/x', 'restored');
      t.eq(t.store.linkMeta[back.id], { note: 'n', pri: 'low', due: day(0) }, 'no done');
    },
  },
  {
    area,
    name: 'today: a visible tab shown again on a new day deletes the links ticked the day before',
    page: 'newtab',
    fixture: () => withMeta({ 32: { due: day(0), done: day(0) }, 33: { due: day(1) } }),
    async run(t) {
      await t.settle();
      t.ok(t.node('32') && !t.toast(), 'a link ticked today stays at start');
      const Real = t.w.Date;
      const shift = 864e5;
      t.w.Date = class extends Real {
        constructor(...a) {
          if (a.length) super(...a);
          else super(Real.now() + shift);
        }
        static now() {
          return Real.now() + shift;
        }
      };
      try {
        t.d.dispatchEvent(new t.w.Event('visibilitychange'));
        await t.until(() => !t.node('32'), 'the sweep on a new day');
        await t.until(() => t.toast(), 'the toast');
        t.eq(t.toast()?.firstChild.textContent, 'Deleted 1 done link', 'toast');
        t.ok(!t.store.linkMeta['32'] && t.store.linkMeta['33'], 'only the ticked entry is removed');
      } finally {
        t.w.Date = Real;
      }
    },
  },
  {
    area,
    name: 'today: a tab that refreshed while hidden and is shown again the same day keeps links ticked today and shows no toast',
    page: 'newtab',
    fixture: () => withMeta({ 32: { due: day(0), done: day(0) }, 33: { due: day(1) } }),
    async run(t) {
      await t.settle();
      t.ok(t.node('32') && !t.toast(), 'a link ticked today stays at start');
      let hidden = true;
      Object.defineProperty(t.d, 'hidden', { configurable: true, get: () => hidden });
      try {
        await t.w.chrome.bookmarks.update('31', { title: 'Shop PROD 2' });
        await t.settle();
        t.eq(t.node('31').title, 'Shop PROD 2', 'the hidden tab refreshed');
        hidden = false;
        t.d.dispatchEvent(new t.w.Event('visibilitychange'));
        await t.settle();
        await t.sleep(100);
        t.ok(t.node('32'), 'the link ticked today stays');
        t.eq(t.store.linkMeta['32'], { due: day(0), done: day(0) }, 'its entry stays');
        t.ok(!t.toast(), 'no toast');
        t.eq(t.$('#scheduleBtn').getAttribute('aria-label'), "Today's top list", 'count is still right');
      } finally {
        delete t.d.hidden;
      }
    },
  },
];
