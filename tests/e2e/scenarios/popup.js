import { base, F, L } from '../fixtures.js';

const area = 'popup';
const tab = { title: 'Deploy app PROD', url: 'https://deploy.prod.example.com/applications/x?view=tree' };
const folders = (t) => t.$$('#folders .folder').map((b) => b.querySelector('.t')?.textContent);
const selected = (t) => t.$('#folders .folder.on')?.querySelector('.t')?.textContent;
const row = (t, title) => t.$$('#folders .folder').find((b) => b.querySelector('.t')?.textContent === title);
const fold = (t, title) => row(t, title)?.querySelector('.fold');
const chips = (t) => t.$$('#chips .save-chip').map((c) => c.querySelector('.ct').textContent);
const chip = (t, title) => t.$$('#chips .save-chip').find((c) => c.querySelector('.ct').textContent === title);
const pin = (t, title) => row(t, title)?.querySelector('.pin');
const many = () => Array.from({ length: 8 }, (_, i) => F(String(900 + i), `Reading list number ${i + 1} with a long name`));
const deep = () =>
  F('20', 'Work', [
    L('21', 'Plan', 'https://tracker.example.com/plan'),
    F('23', 'Priority', [F('25', 'Today', [L('26', 'Old', 'https://tracker.example.com/old')])]),
    F('24', 'Weekly report', []),
  ]);

export default [
  {
    area,
    name: 'shows the active tab title, URL and env badge',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      const title = t.$('#page .field');
      t.eq(title.value, 'Deploy app PROD', 'title');
      t.eq(Math.round(title.getBoundingClientRect().height), 28, 'title is 28 px tall');
      t.eq(t.w.getComputedStyle(title).borderTopColor, 'rgba(0, 0, 0, 0)', 'no border until hover or focus');
      title.focus();
      t.ok(t.w.getComputedStyle(title).borderTopColor !== 'rgba(0, 0, 0, 0)', 'border on focus');
      const target = t.$('#page .target');
      t.eq(target.textContent, tab.url, 'full URL');
      t.eq(target.title, tab.url, 'full URL as tooltip');
      t.eq(t.w.getComputedStyle(target).whiteSpace, 'nowrap', 'URL on one line');
      t.eq(t.w.getComputedStyle(target).textOverflow, 'ellipsis', 'URL cut with …');
      const badge = t.$('#page .badge');
      t.eq(badge?.textContent, 'PROD', 'badge');
      t.ok(
        Math.abs(badge.getBoundingClientRect().top + badge.getBoundingClientRect().height / 2 - (title.getBoundingClientRect().top + 14)) < 3,
        'badge on the title row',
      );
      t.ok(badge.getBoundingClientRect().left > title.getBoundingClientRect().right - 1, 'badge at the right of the title');
      t.ok(!t.$('#page .ico'), 'no favicon in the header');
    },
  },
  {
    area,
    name: 'folder list: root first, then its folders closed; the root has no arrow',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.eq(folders(t), ['My Links', 'Sprint tasks', 'Shop API', 'GITHUB - PIN', 'Empty'], 'list');
      t.eq(selected(t), 'My Links', 'root selected when nothing saved yet');
      t.ok(!row(t, 'My Links').querySelector('.fold'), 'root has no arrow');
      t.eq(
        t.$$('#folders .fold').map((b) => [b.textContent, b.getAttribute('aria-label'), b.getAttribute('aria-expanded')]),
        [['▸', 'Expand Sprint tasks', 'false']],
        'only folders with child folders get an arrow',
      );
      t.ok(
        t.$$('#folders .folder').every((r) => Math.round(r.getBoundingClientRect().height) === 28),
        'rows are 28 px',
      );
      t.eq(Math.round(fold(t, 'Sprint tasks').getBoundingClientRect().height), 28, 'arrow is 28 px');
      t.click(fold(t, 'Sprint tasks'));
      t.eq(folders(t), ['My Links', 'Sprint tasks', 'Blocked', 'Shop API', 'GITHUB - PIN', 'Empty'], 'the arrow opens it');
      t.eq(
        [fold(t, 'Sprint tasks').textContent, fold(t, 'Sprint tasks').getAttribute('aria-label'), fold(t, 'Sprint tasks').getAttribute('aria-expanded')],
        ['▾', 'Collapse Sprint tasks', 'true'],
        'open arrow',
      );
      t.eq(selected(t), 'My Links', 'the arrow does not change the selection');
      t.eq(t.d.activeElement, t.$('#q'), 'focus stays in the search box');
      t.click(fold(t, 'Sprint tasks'));
      t.eq(folders(t), ['My Links', 'Sprint tasks', 'Shop API', 'GITHUB - PIN', 'Empty'], 'and closes it again');
    },
  },
  {
    area,
    name: 'last save folder is preselected',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { lastSaveFolder: '40' } }),
    async run(t) {
      t.eq(selected(t), 'GITHUB - PIN', 'preselected');
      t.ok(t.$('#save').textContent.includes('Save to GITHUB - PIN'), 'button names the folder');
    },
  },
  {
    area,
    name: 'folder collapse: only the parents of the preselected folder are open',
    page: 'popup',
    fixture: () => base({ activeTab: tab, tasks: deep(), settings: { lastSaveFolder: '25' } }),
    async run(t) {
      t.eq(folders(t), ['My Links', 'Work', 'Priority', 'Today', 'Weekly report', 'Shop API', 'GITHUB - PIN', 'Empty'], 'path to the folder is open');
      t.eq(selected(t), 'Today', 'preselected');
      t.ok(!fold(t, 'Today') && row(t, 'Today').querySelector('.fold-sp'), 'a folder without child folders has no arrow');
      t.click(fold(t, 'Work'));
      t.eq(folders(t), ['My Links', 'Work', 'Shop API', 'GITHUB - PIN', 'Empty'], 'closing a parent hides its folders');
      t.eq(selected(t), 'Work', 'the selection moves to the closed parent');
      t.click(fold(t, 'Work'));
      t.eq(folders(t), ['My Links', 'Work', 'Priority', 'Today', 'Weekly report', 'Shop API', 'GITHUB - PIN', 'Empty'], 'open state of children is kept');
      await t.reload();
      t.eq(
        folders(t),
        ['My Links', 'Work', 'Priority', 'Today', 'Weekly report', 'Shop API', 'GITHUB - PIN', 'Empty'],
        'a new open starts from the preselected folder again',
      );
      t.H.store.settings.lastSaveFolder = '40';
      await t.reload();
      t.eq(folders(t), ['My Links', 'Work', 'Shop API', 'GITHUB - PIN', 'Empty'], 'everything else closed on each open');
    },
  },
  {
    area,
    name: 'folder collapse: → opens, ← closes, ← on a closed folder goes to its parent, ↑/↓ skip hidden folders',
    page: 'popup',
    fixture: () => base({ activeTab: tab, tasks: deep() }),
    async run(t) {
      const q = t.$('#q');
      t.key(q, 'ArrowDown');
      t.eq(selected(t), 'Work', 'down to Work');
      t.key(q, 'ArrowDown');
      t.eq(selected(t), 'Shop API', 'down skips the closed folders of Work');
      t.key(q, 'ArrowUp');
      const right = new t.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      q.dispatchEvent(right);
      t.ok(right.defaultPrevented, '→ is used by the list');
      t.eq(folders(t), ['My Links', 'Work', 'Priority', 'Weekly report', 'Shop API', 'GITHUB - PIN', 'Empty'], '→ opens Work');
      t.eq(selected(t), 'Work', 'Work stays selected');
      t.key(q, 'ArrowRight');
      t.eq(selected(t), 'Work', '→ on an open folder does nothing');
      t.key(q, 'ArrowDown');
      t.eq(selected(t), 'Priority', 'down into Work');
      t.key(q, 'ArrowRight');
      t.key(q, 'ArrowDown');
      t.eq(selected(t), 'Today', '→ opened Priority');
      t.key(q, 'ArrowLeft');
      t.eq(selected(t), 'Priority', '← on a folder without children goes to its parent');
      t.key(q, 'ArrowLeft');
      t.eq(folders(t), ['My Links', 'Work', 'Priority', 'Weekly report', 'Shop API', 'GITHUB - PIN', 'Empty'], '← closes Priority');
      t.key(q, 'ArrowLeft');
      t.eq(selected(t), 'Work', '← on a closed folder goes to its parent');
      t.key(q, 'ArrowLeft');
      t.eq(folders(t), ['My Links', 'Work', 'Shop API', 'GITHUB - PIN', 'Empty'], '← closes Work');
      t.key(q, 'ArrowLeft');
      t.eq(selected(t), 'My Links', '← goes to the root');
      t.key(q, 'ArrowLeft');
      t.eq(selected(t), 'My Links', 'the root stays open');
      t.eq(folders(t), ['My Links', 'Work', 'Shop API', 'GITHUB - PIN', 'Empty'], 'the root never closes');
    },
  },
  {
    area,
    name: 'folder collapse: search text shows the flat list with full paths and no arrows',
    page: 'popup',
    fixture: () => base({ activeTab: tab, tasks: deep() }),
    async run(t) {
      t.type(t.$('#q'), 'today');
      await t.settle();
      t.eq(folders(t), ['My Links › Work › Priority › Today'], 'hidden folders are found by path');
      t.ok(!t.$('#folders .fold') && !t.$('#folders .fold-sp'), 'no arrows');
      const left = new t.w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
      t.$('#q').dispatchEvent(left);
      t.ok(!left.defaultPrevented, '← moves the caret in the box');
      t.key(t.$('#q'), 'Escape');
      t.eq(folders(t), ['My Links', 'Work', 'Shop API', 'GITHUB - PIN', 'Empty'], 'Escape brings the tree back');
    },
  },
  {
    area,
    name: 'filter by path; exact name hides Create; new name shows Create',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.type(t.$('#q'), 'shop api');
      await t.settle();
      t.eq(t.$$('#folders .folder').length, 1, 'one match, no create item');
      t.type(t.$('#q'), 'Brand new');
      await t.settle();
      t.ok(t.$('#folders .folder.create')?.textContent.includes('Create "Brand new"'), 'create item');
    },
  },
  {
    area,
    name: 'Enter saves to the selected folder and remembers it',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.type(t.$('#q'), 'Shop');
      await t.settle();
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      const saved = t.node('30').children.at(-1);
      t.eq([saved.title, saved.url], [tab.title, tab.url], 'bookmark created');
      t.eq(t.settings().lastSaveFolder, '30', 'remembered');
      t.ok(t.$('#status').textContent.startsWith('Saved to Shop API'), 'status');
      await t.sleep(1000);
      t.ok(t.H.closed, 'popup closes');
    },
  },
  {
    area,
    name: 'arrow keys move the selection',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.key(t.$('#q'), 'ArrowDown');
      t.key(t.$('#q'), 'ArrowDown');
      t.eq(selected(t), 'Shop API', 'two down');
      t.key(t.$('#q'), 'ArrowUp');
      t.eq(selected(t), 'Sprint tasks', 'one up');
    },
  },
  {
    area,
    name: 'Create "<name>" makes the folder under the root and saves into it',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.type(t.$('#q'), 'Brand new');
      await t.settle();
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      const f = t.node('10').children.find((c) => c.title === 'Brand new');
      t.ok(f && !f.url, 'folder under root');
      t.eq(f?.children?.[0]?.url, tab.url, 'link inside');
      t.eq(t.settings().lastSaveFolder, f?.id, 'remembered new folder');
    },
  },
  {
    area,
    name: 'Whole site saves the origin with the host as title',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$$('#modes .chip').find((c) => c.textContent === 'Site'));
      await t.settle();
      t.eq(t.$('#page .target').textContent, 'https://deploy.prod.example.com/', 'origin');
      t.eq(t.$('#page .field').value, 'deploy.prod.example.com', 'host title');
      t.click(t.$('#save'));
      await t.settle();
      t.eq(t.node('10').children.find((c) => c.url === 'https://deploy.prod.example.com/')?.title, 'deploy.prod.example.com', 'saved to root');
    },
  },
  {
    area,
    name: 'an edited title is kept when switching modes',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.type(t.$('#page .field'), 'My title');
      t.click(t.$$('#modes .chip').find((c) => c.textContent === 'Site'));
      await t.settle();
      t.eq(t.$('#page .field').value, 'My title', 'kept');
    },
  },
  {
    area,
    name: 'Whole site is only for http(s) pages (file:// and chrome:// are off)',
    page: 'popup',
    fixture: () => base({ activeTab: { title: 'Local file', url: 'file:///Users/me/notes.html' } }),
    async run(t) {
      t.ok(t.$$('#modes .chip').find((c) => c.textContent === 'Site')?.disabled, 'file:// disabled');
      t.H.activeTab = { title: 'Extensions', url: 'chrome://extensions/' };
      await t.reload('popup');
      t.ok(t.$$('#modes .chip').find((c) => c.textContent === 'Site')?.disabled, 'chrome:// disabled');
    },
  },
  {
    area,
    name: 'already saved: shows where, Remove deletes, Undo restores',
    page: 'popup',
    fixture: () => base({ activeTab: { title: 'Shop PROD', url: 'https://shop.example.com/api/x' } }),
    async run(t) {
      t.click(t.$('#saved .saved-in'));
      t.ok(t.$('#exists .exists')?.textContent.includes('My Links › Shop API'), 'location shown');
      t.click(t.$('#exists .exists button'));
      await t.settle();
      t.ok(!t.node('31'), 'removed');
      t.ok(!t.$('#exists .exists'), 'notice gone');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      t.eq(t.node('30').children[0]?.url, 'https://shop.example.com/api/x', 'restored at index 0');
    },
  },
  {
    area,
    name: 'already saved: Undo of Remove brings back note, priority and due date but never done',
    page: 'popup',
    fixture: () => {
      const f = base({ activeTab: { title: 'Shop PROD', url: 'https://shop.example.com/api/x' } });
      f.store.linkMeta = { 31: { note: 'n', pri: 'high', due: '2026-10-26', done: '2026-10-26' } };
      return f;
    },
    async run(t) {
      t.click(t.$('#saved .saved-in'));
      t.click(t.$('#exists .exists button'));
      await t.settle();
      t.ok(!t.node('31') && !t.store.linkMeta['31'], 'removed with its entry');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('30').children[0];
      t.eq(t.store.linkMeta[back.id], { note: 'n', pri: 'high', due: '2026-10-26' }, 'no done');
    },
  },
  {
    area,
    name: 'compact layout: one toolbar row, a 380 px popup, Save visible with many folders',
    page: 'popup',
    fixture: () =>
      base({
        activeTab: { title: 'Shop PROD', url: 'https://shop.example.com/api/x' },
        extraRoot: Array.from({ length: 30 }, (_, i) => F(String(900 + i), `Folder ${i + 1}`)),
      }),
    async run(t) {
      t.eq(Math.round(t.d.body.getBoundingClientRect().width), 380, 'popup is 380 px wide');
      const pris = t.$$('#meta .pri-pick button');
      t.eq(
        pris.map((b) => [b.getAttribute('aria-label'), b.title, b.textContent]),
        [
          ['No priority', 'No priority', ''],
          ['High priority', 'High priority', ''],
          ['Medium priority', 'Medium priority', ''],
          ['Low priority', 'Low priority', ''],
        ],
        'four dot buttons with a label and a tooltip',
      );
      t.ok(
        pris.every((b) => {
          const r = b.getBoundingClientRect();
          return Math.round(r.width) === 28 && Math.round(r.height) === 28 && t.w.getComputedStyle(b).borderTopLeftRadius === '50%';
        }),
        'round 28 px buttons',
      );
      t.eq(pris[0].getAttribute('aria-pressed'), 'true', 'None pressed');
      const noteBtn = t.$('#noteBtn');
      t.eq(noteBtn.getAttribute('aria-label'), 'Add a note', 'note button label');
      const order = [pris[0], pris[3], t.$('#meta .tool-sep'), noteBtn, t.$('#dueBtn'), t.$('#modes')];
      const boxes = order.map((el) => el.getBoundingClientRect());
      t.ok(
        boxes.every((r, i) => !i || r.left >= boxes[i - 1].right - 1),
        'priority, divider, Note, Due, then Page/Site from left to right',
      );
      t.ok(
        boxes.every((r) => Math.abs(r.top + r.height / 2 - (boxes[0].top + boxes[0].height / 2)) < 2),
        'all on one row',
      );
      t.ok(boxes.at(-1).right >= t.$('#meta').getBoundingClientRect().right - 13, 'Page/Site at the right');
      t.eq(Math.round(noteBtn.getBoundingClientRect().height), 28, 'Note is 28 px');
      t.eq(Math.round(t.$('#dueBtn').getBoundingClientRect().height), 28, 'Due is 28 px');
      t.ok(t.$('#noteRow').hidden, 'note row hidden on open');
      t.eq(t.$('#note').maxLength, 200, 'note max length');
      t.eq(Math.round(t.$('.pick .search').getBoundingClientRect().height), 28, 'search box is 28 px');
      const chips = t.$('#chips');
      t.ok(chips && chips.hidden && !chips.children.length, 'chips row is there, empty and hidden');
      t.ok(
        chips.compareDocumentPosition(t.$('#folders')) & 4 && t.$('.pick .search').compareDocumentPosition(chips) & 4,
        'chips between the search box and the list',
      );
      t.ok(!t.$('.hints') && !t.$('.kbd'), 'no key hints');
      const open = t.$('#openBoard');
      t.eq([open.getAttribute('aria-label'), open.title, open.textContent], ['Open Tab Warehouse', 'Open Tab Warehouse', ''], 'icon button');
      t.eq(Math.round(open.getBoundingClientRect().height), 36, 'Open Tab Warehouse is 36 px');
      const body = t.d.body.getBoundingClientRect();
      const save = t.$('#save').getBoundingClientRect();
      t.ok(save.height >= 44, `Save at least 44 px (${Math.round(save.height)})`);
      t.ok(save.left >= open.getBoundingClientRect().right && save.right >= body.right - 13, 'Save fills the rest of the row');
      t.ok(body.height <= 600, `popup fits Chrome's 600 px (${Math.round(body.height)})`);
      t.ok(save.bottom <= body.bottom && save.top >= 0, 'Save visible without scrolling');
      const list = t.$('#folders');
      t.ok(list.scrollHeight > list.clientHeight, 'folder list scrolls instead');
      t.click(open);
      await t.settle();
      t.ok(t.tabs.at(-1)?.url?.endsWith('newtab.html'), 'opens Tab Warehouse');
    },
  },
  {
    area,
    name: 'note button: shows the note row and focuses it; pressing again hides and clears it',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      const btn = t.$('#noteBtn');
      t.eq(btn.getAttribute('aria-expanded'), 'false', 'collapsed');
      t.click(btn);
      t.ok(!t.$('#noteRow').hidden, 'row shown');
      t.eq(btn.getAttribute('aria-expanded'), 'true', 'expanded');
      t.ok(btn.classList.contains('on'), 'marked on');
      t.eq(t.d.activeElement, t.$('#note'), 'note focused');
      t.ok(t.$('#noteRow').getBoundingClientRect().top >= t.$('#meta .tool-row').getBoundingClientRect().bottom, 'under the toolbar');
      t.type(t.$('#note'), 'Check logs');
      t.click(btn);
      t.ok(t.$('#noteRow').hidden, 'hidden again');
      t.ok(!btn.classList.contains('on'), 'not on');
      t.eq(t.$('#note').value, '', 'cleared');
      t.click(t.$('#save'));
      await t.settle();
      const saved = t.node('10').children.find((c) => c.url === tab.url);
      t.ok(saved, 'saved');
      t.eq(t.store.linkMeta?.[saved?.id], undefined, 'a hidden note is not saved');
    },
  },
  {
    area,
    name: 'Enter in the note box saves',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#noteBtn'));
      t.type(t.$('#note'), 'Check logs');
      t.key(t.$('#note'), 'Enter');
      await t.settle();
      const saved = t.node('10').children.find((c) => c.url === tab.url);
      t.ok(saved, 'saved to the selected folder');
      t.eq(t.store.linkMeta?.[saved?.id]?.note, 'Check logs', 'note stored');
    },
  },
  {
    area,
    name: 'due date: date and time are saved with the link; no calendar tab when the box is off',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#dueBtn'));
      const cal = t.$('#meta .due-cal-box');
      t.ok(cal.disabled, 'calendar box disabled without a date');
      t.ok(t.$('#meta .due-clr').hidden, 'clear hidden without a date');
      t.type(t.$('#meta .due-date'), '2026-04-10');
      t.type(t.$('#meta .due-time'), '10:00');
      t.ok(!cal.disabled && !cal.checked, 'box enabled and off by default');
      t.click(t.$('#save'));
      await t.settle();
      const saved = t.node('10').children.find((c) => c.url === tab.url);
      t.eq(t.store.linkMeta?.[saved?.id]?.due, '2026-04-10T10:00', 'due stored');
      t.ok(!t.tabs.some((x) => x.url?.includes('calendar.google.com')), 'no calendar tab');
    },
  },
  {
    area,
    name: 'due date: "Also add to Google Calendar" opens the filled-in event after save',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#dueBtn'));
      t.type(t.$('#meta .due-date'), '2026-04-10');
      t.click(t.$('#meta .due-cal-box'));
      t.click(t.$('#save'));
      await t.settle();
      const saved = t.node('10').children.find((c) => c.url === tab.url);
      t.eq(t.store.linkMeta?.[saved?.id]?.due, '2026-04-10', 'all-day due stored');
      const cal = t.tabs.find((x) => x.url?.startsWith('https://calendar.google.com/calendar/render'));
      t.ok(cal, 'calendar tab opened');
      const q = new URL(cal?.url || 'https://x').searchParams;
      t.eq(q.get('dates'), '20260410/20260411', 'all-day dates');
      t.eq(q.get('text'), 'Deploy app PROD', 'event title is the link title');
    },
  },
  {
    area,
    name: 'due date: clearing the date turns the calendar box off',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#dueBtn'));
      t.type(t.$('#meta .due-date'), '2026-04-10');
      const cal = t.$('#meta .due-cal-box');
      t.click(cal);
      t.click(t.$('#meta .due-clr'));
      t.ok(cal.disabled && !cal.checked, 'box off and disabled');
      t.eq(t.$('#meta .due-date').value, '', 'date cleared');
    },
  },
  {
    area,
    name: 'due date: hidden until Due is pressed; pressing Due again hides and clears it',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      const btn = t.$('#dueBtn');
      t.ok(t.$('#duePick').hidden, 'picker hidden on open');
      t.eq(btn.getAttribute('aria-expanded'), 'false', 'collapsed');
      t.ok(btn.getBoundingClientRect().height >= 28, 'Due button at least 28 px');
      t.click(btn);
      t.ok(!t.$('#duePick').hidden, 'picker shown');
      t.eq(btn.getAttribute('aria-expanded'), 'true', 'expanded');
      t.eq(t.d.activeElement, t.$('#meta .due-q'), 'Today chip focused');
      t.type(t.$('#meta .due-date'), '2026-04-10');
      t.click(btn);
      t.ok(t.$('#duePick').hidden, 'hidden again');
      t.click(t.$('#save'));
      await t.settle();
      const saved = t.node('10').children.find((c) => c.url === tab.url);
      t.eq(t.store.linkMeta?.[saved?.id], undefined, 'a hidden date is not saved');
    },
  },
  {
    area,
    name: 'due date: quick chips set the date, the summary says it, Pick a date and Add a time show the boxes',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#dueBtn'));
      const chips = [...t.$$('#duePick .due-q')].map((b) => b.textContent);
      t.eq(chips, ['Today', 'Tomorrow', 'Next week', 'Pick a date…'], 'chips in order');
      t.ok(t.$('#duePick .due-row').hidden, 'date and time boxes hidden');
      t.ok(t.$('#duePick .due-sum').hidden, 'no summary without a date');
      const tomorrow = t.$$('#duePick .due-q')[1];
      t.click(tomorrow);
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      t.eq(t.$('#meta .due-date').value, ymd, 'date is tomorrow');
      t.eq(tomorrow.getAttribute('aria-pressed'), 'true', 'Tomorrow marked');
      t.ok(!t.$('#duePick .due-sum').hidden, 'summary shown');
      t.ok(t.$('#duePick .due-now').classList.contains('soon'), 'summary colored as soon');
      t.ok(/^Due \w{3} \d{1,2} \w{3}$/.test(t.$('#duePick .due-now').textContent), `summary label (${t.$('#duePick .due-now').textContent})`);
      t.ok(t.$('#duePick .due-q').getBoundingClientRect().height >= 28, 'chips at least 28 px');
      t.click(t.$('#duePick .due-add-time'));
      t.ok(!t.$('#duePick .due-row').hidden, 'boxes shown by Add a time');
      t.eq(t.d.activeElement, t.$('#meta .due-time'), 'time box focused');
      t.ok(t.$('#duePick .due-add-time').hidden, 'Add a time hidden once the boxes show');
      t.ok(t.$('#duePick .due-quick').hidden, 'chips hidden while the boxes show');
      t.type(t.$('#meta .due-time'), '10:00');
      t.click(t.$('#save'));
      await t.settle();
      const saved = t.node('10').children.find((c) => c.url === tab.url);
      t.eq(t.store.linkMeta?.[saved?.id]?.due, `${ymd}T10:00`, 'date and time stored');
    },
  },
  {
    area,
    name: 'due date: Pick a date shows the date box and focuses it; clear hides the boxes again',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#dueBtn'));
      t.click(t.$('#duePick .due-pick-date'));
      t.ok(!t.$('#duePick .due-row').hidden, 'boxes shown');
      t.eq(t.d.activeElement, t.$('#meta .due-date'), 'date box focused');
      t.type(t.$('#meta .due-date'), '2030-04-10');
      t.eq(t.$('#duePick .due-now').textContent, 'Due 10 Apr 2030', 'summary');
      t.ok(![...t.$$('#duePick .due-q')].some((b) => b.getAttribute('aria-pressed') === 'true'), 'no quick chip marked');
      t.click(t.$('#meta .due-clr'));
      t.ok(t.$('#duePick .due-row').hidden && t.$('#duePick .due-sum').hidden, 'boxes and summary hidden');
      t.ok(!t.$('#duePick .due-quick').hidden, 'chips back');
    },
  },
  {
    area,
    name: 'due date: with "Open this page in" rows and many folders the popup still fits 600 px, open or closed',
    page: 'popup',
    fixture: () =>
      base({
        activeTab: { title: 'Shop PROD', url: 'https://shop.example.com/api/x', index: 3 },
        extraRoot: Array.from({ length: 30 }, (_, i) => F(String(900 + i), `Folder ${i + 1}`)),
      }),
    async run(t) {
      t.ok(!t.$('#switch').hidden, 'switch rows shown');
      const check = (when) => {
        const body = t.d.body.getBoundingClientRect();
        const bar = t.$('.bar').getBoundingClientRect();
        const list = t.$('#folders').getBoundingClientRect();
        t.ok(body.height <= 600, `${when}: fits 600 px (${Math.round(body.height)})`);
        t.ok(list.bottom <= bar.top + 1, `${when}: folder list ends above the bottom bar (${Math.round(list.bottom)} / ${Math.round(bar.top)})`);
        t.ok(list.height >= 44, `${when}: at least one folder row visible (${Math.round(list.height)})`);
      };
      check('closed');
      t.click(t.$('#dueBtn'));
      check('open');
      t.click(t.$$('#duePick .due-q')[1]);
      check('open with a date');
      t.click(t.$('#duePick .due-add-time'));
      check('open with the date and time boxes');
      t.click(t.$('#noteBtn'));
      check('with the note row too');
      t.click(t.$('#saved .saved-in'));
      t.ok(!t.$('#exists').hidden, 'copy list open');
      check('with the copy list too');
      const save = t.$('#save').getBoundingClientRect();
      t.ok(save.bottom <= t.d.body.getBoundingClientRect().bottom && save.height >= 44, 'Save still whole');
    },
  },
  {
    area,
    name: 'chips: Pinned folders first with a solid border and a pin, then Recent folders dashed, numbered with tooltips',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { lastSaveFolder: '30', savePins: ['40', '23'], saveRecent: ['30', '40', 'gone', '50'] } }),
    async run(t) {
      const box = t.$('#chips');
      t.ok(!box.hidden, 'chips row shown');
      t.eq(chips(t), ['GITHUB - PIN', 'Blocked', 'Shop API', 'Empty'], 'pins in order, then recent not pinned; unknown ids left out');
      const els = t.$$('#chips .save-chip');
      t.eq(
        els.map((c) => [c.classList.contains('pinned'), !!c.querySelector('svg'), t.w.getComputedStyle(c).borderTopStyle]),
        [
          [true, true, 'solid'],
          [true, true, 'solid'],
          [false, false, 'dashed'],
          [false, false, 'dashed'],
        ],
        'pinned solid with a pin icon, recent dashed',
      );
      t.eq(
        els.map((c) => c.querySelector('.ck').textContent),
        ['1', '2', '3', '4'],
        'numbers 1–4',
      );
      t.eq(
        els.map((c) => c.title),
        [
          'My Links › GITHUB - PIN · pinned · Alt+1',
          'My Links › Sprint tasks › Blocked · pinned · Alt+2',
          'My Links › Shop API · recent · Alt+3',
          'My Links › Empty · recent · Alt+4',
        ],
        'tooltips',
      );
      t.ok(
        els.every((c) => Math.round(c.getBoundingClientRect().height) === 28),
        'chips are 28 px',
      );
      t.eq(
        els.map((c) => c.classList.contains('on')),
        [false, false, true, false],
        'the chip of the selected folder is on',
      );
      t.key(t.$('#q'), 'ArrowDown');
      t.eq(selected(t), 'GITHUB - PIN', 'arrow moves the selection');
      t.eq(
        t.$$('#chips .save-chip').map((c) => c.classList.contains('on')),
        [true, false, false, false],
        'the on chip follows the selection',
      );
      t.type(t.$('#q'), 'Shop');
      await t.settle();
      t.ok(box.hidden, 'chips hidden while the search box has text');
      t.key(t.$('#q'), 'Escape');
      await t.settle();
      t.ok(!box.hidden, 'chips back when the search is cleared');
    },
  },
  {
    area,
    name: 'chips: at most 6, cut with … and on at most 2 rows',
    page: 'popup',
    fixture: () =>
      base({
        activeTab: tab,
        extraRoot: many(),
        settings: { savePins: ['900', '901', '902'], saveRecent: ['903', '904', '905', '906', '907'] },
      }),
    async run(t) {
      const els = t.$$('#chips .save-chip');
      t.eq(els.length, 6, '6 chips');
      t.eq(
        els.map((c) => c.querySelector('.ck').textContent),
        ['1', '2', '3', '4', '5', '6'],
        'numbered 1–6',
      );
      const ct = els[0].querySelector('.ct');
      t.eq(t.w.getComputedStyle(ct).textOverflow, 'ellipsis', 'title cut with …');
      t.ok(ct.scrollWidth > ct.clientWidth, 'long title is cut');
      t.ok(ct.getBoundingClientRect().width <= 110, 'title at most 110 px');
      const tops = [...new Set(els.map((c) => Math.round(c.getBoundingClientRect().top)))];
      t.ok(tops.length <= 2, `at most 2 rows (${tops.length})`);
      t.ok(t.d.body.getBoundingClientRect().height <= 600, 'popup fits 600 px');
      t.click(t.$('#dueBtn'));
      t.click(t.$$('#duePick .due-q')[1]);
      t.click(t.$('#duePick .due-add-time'));
      t.click(t.$('#noteBtn'));
      const body = t.d.body.getBoundingClientRect();
      const save = t.$('#save').getBoundingClientRect();
      t.ok(body.height <= 600 && save.bottom <= body.bottom, `with note and due open the popup still fits 600 px (${Math.round(body.height)})`);
      t.ok(t.$('#folders').getBoundingClientRect().height >= 44, 'at least one folder row visible');
    },
  },
  {
    area,
    name: 'chips: a click selects the folder, opens its parents and puts focus back in the search box; Enter saves there',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { saveRecent: ['23'] } }),
    async run(t) {
      t.ok(!row(t, 'Blocked'), 'Blocked hidden under a closed parent');
      t.click(chip(t, 'Blocked'));
      await t.settle();
      t.eq(selected(t), 'Blocked', 'selected');
      t.ok(fold(t, 'Sprint tasks')?.getAttribute('aria-expanded') === 'true', 'parent opened');
      t.eq(t.d.activeElement, t.$('#q'), 'focus back in the search box');
      t.ok(chip(t, 'Blocked').classList.contains('on'), 'chip on');
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      t.eq(t.node('23').children.at(-1)?.url, tab.url, 'saved into Blocked');
    },
  },
  {
    area,
    name: 'chips: Alt+1 … Alt+6 select chip N',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { savePins: ['40'], saveRecent: ['23', '30'] } }),
    async run(t) {
      const alt = (n) => {
        const e = new t.w.KeyboardEvent('keydown', { key: '¡', code: `Digit${n}`, altKey: true, bubbles: true, cancelable: true });
        t.$('#q').dispatchEvent(e);
        return e.defaultPrevented;
      };
      t.ok(alt(2), 'Alt+2 handled');
      t.eq(selected(t), 'Blocked', 'Alt+2 selects chip 2 and opens its parent');
      t.eq(t.d.activeElement, t.$('#q'), 'focus in the search box');
      alt(3);
      t.eq(selected(t), 'Shop API', 'Alt+3');
      alt(1);
      t.eq(selected(t), 'GITHUB - PIN', 'Alt+1');
      t.ok(!alt(5), 'no chip 5: nothing happens');
      const altIn = (el, opts = {}) => {
        const e = new t.w.KeyboardEvent('keydown', { key: '£', code: 'Digit3', altKey: true, bubbles: true, cancelable: true, ...opts });
        el.dispatchEvent(e);
        return e.defaultPrevented;
      };
      t.click(t.$('#noteBtn'));
      t.ok(!altIn(t.$('#note')), 'Alt+3 in the note box is not taken');
      t.eq(selected(t), 'GITHUB - PIN', 'Alt+3 in the note box keeps the folder');
      t.ok(!altIn(t.$('#page .field')), 'Alt+3 in the title field is not taken');
      t.eq(selected(t), 'GITHUB - PIN', 'Alt+3 in the title field keeps the folder');
      t.ok(!altIn(t.$('#q'), { shiftKey: true, key: '€' }), 'Alt+Shift+3 in the search box is not taken');
      t.eq(selected(t), 'GITHUB - PIN', 'Alt+Shift+3 keeps the folder');
      t.$('#q').focus();
      t.eq(selected(t), 'GITHUB - PIN', 'selection kept');
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      t.eq(t.node('40').children.at(-1)?.url, tab.url, 'Enter saves to the chip folder');
    },
  },
  {
    area,
    name: 'chips: right-click on a Pinned folder chip offers Unpin; a Recent folder chip has no menu',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { savePins: ['40', '30'], saveRecent: ['50', '40'] } }),
    async run(t) {
      t.context(chip(t, 'Empty'));
      t.ok(!t.$('.menu'), 'no menu on a recent chip');
      t.context(chip(t, 'Shop API'));
      await t.menuShown();
      t.eq(t.menuLabels(), ['Unpin'], 'menu');
      t.menu('Unpin');
      await t.settle();
      t.eq(t.settings().savePins, ['40'], 'unpinned and saved');
      t.eq(chips(t), ['GITHUB - PIN', 'Empty'], 'chip gone');
      t.context(chip(t, 'GITHUB - PIN'));
      await t.menuShown();
      t.menu('Unpin');
      await t.settle();
      t.eq(chips(t), ['Empty', 'GITHUB - PIN'], 'a recent folder stays as a recent chip');
      t.ok(chip(t, 'GITHUB - PIN').classList.contains('recent'), 'now dashed');
    },
  },
  {
    area,
    name: 'pin button: on every folder row, shown while pinned, toggles the pin and saves at once',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { savePins: ['40'] } }),
    async run(t) {
      t.ok(
        t.$$('#folders .folder').every((r) => r.querySelector('.pin')),
        'every folder row has a pin button',
      );
      const p = pin(t, 'GITHUB - PIN');
      t.eq(
        [p.getAttribute('aria-label'), p.getAttribute('aria-pressed'), p.title, p.tabIndex],
        ['Unpin GITHUB - PIN', 'true', 'Unpin GITHUB - PIN', -1],
        'pinned button',
      );
      t.eq(t.w.getComputedStyle(p).opacity, '1', 'always shown while pinned');
      const r = p.getBoundingClientRect();
      t.eq([Math.round(r.width), Math.round(r.height)], [28, 28], '28 px');
      t.ok(
        r.right <= row(t, 'GITHUB - PIN').getBoundingClientRect().right + 1 &&
          r.left > row(t, 'GITHUB - PIN').querySelector('.n').getBoundingClientRect().right - 1,
        'at the right of the row',
      );
      const q = pin(t, 'Shop API');
      t.eq([q.getAttribute('aria-label'), q.getAttribute('aria-pressed')], ['Pin Shop API', 'false'], 'unpinned button');
      t.eq(t.w.getComputedStyle(q).opacity, '0', 'hidden until hover or focus');
      q.focus();
      t.eq(t.w.getComputedStyle(q).opacity, '1', 'shown on focus');
      t.click(q);
      await t.settle();
      t.eq(t.settings().savePins, ['40', '30'], 'saved at once');
      t.eq(selected(t), 'My Links', 'the pin button does not change the selection');
      t.eq(t.d.activeElement, t.$('#q'), 'focus back in the search box');
      t.eq(pin(t, 'Shop API').getAttribute('aria-pressed'), 'true', 'pressed now');
      t.eq(chips(t), ['GITHUB - PIN', 'Shop API'], 'chip added');
      t.click(pin(t, 'GITHUB - PIN'));
      await t.settle();
      t.eq(t.settings().savePins, ['30'], 'unpinned');
      t.eq(chips(t), ['Shop API'], 'chip removed');
      t.type(t.$('#q'), 'Shop');
      await t.settle();
      t.ok(pin(t, 'My Links › Shop API'), 'search rows have the pin button too');
      t.ok(!t.$('#folders .folder.create .pin'), 'the Create item has none');
    },
  },
  {
    area,
    name: 'pin button: a full list shows "You can pin up to 6 folders." and saves nothing',
    page: 'popup',
    fixture: () => base({ activeTab: tab, extraRoot: many(), settings: { savePins: ['900', '901', '902', '903', '904', '905'] } }),
    async run(t) {
      t.click(pin(t, 'Shop API'));
      await t.settle();
      t.eq(t.toast()?.textContent, 'You can pin up to 6 folders.', 'toast');
      t.eq(t.settings().savePins, ['900', '901', '902', '903', '904', '905'], 'nothing saved');
      t.eq(pin(t, 'Shop API').getAttribute('aria-pressed'), 'false', 'not pinned');
    },
  },
  {
    area,
    name: 'pin button: a pin that is not a folder under the root does not count toward the 6',
    page: 'popup',
    fixture: () => base({ activeTab: tab, extraRoot: many(), settings: { savePins: ['900', '901', 'gone', '902', '903', '904'] } }),
    async run(t) {
      t.eq(t.$$('#chips .save-chip').length, 5, '5 chips show');
      t.click(pin(t, 'Shop API'));
      await t.settle();
      t.ok(!t.toast(), 'no full-list toast');
      t.eq(t.settings().savePins, ['900', '901', '902', '903', '904', '30'], 'pinned; the unknown id is dropped');
      t.eq(t.$$('#chips .save-chip').length, 6, '6 chips');
    },
  },
  {
    area,
    name: 'a save from the popup puts the folder first in Recent folders; Create uses the new folder id',
    page: 'popup',
    fixture: () => base({ activeTab: tab, settings: { saveRecent: ['40', '30', '50', '20', '23', '10'] } }),
    async run(t) {
      t.type(t.$('#q'), 'Shop');
      await t.settle();
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      t.eq(t.settings().saveRecent, ['30', '40', '50', '20', '23', '10'], 'moved to the front');
      t.eq(t.settings().lastSaveFolder, '30', 'last save folder too');
      await t.reload();
      t.type(t.$('#q'), 'Reading list');
      await t.settle();
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      const f = t.node('10').children.find((c) => c.title === 'Reading list');
      t.eq(t.settings().saveRecent, [f?.id, '30', '40', '50', '20', '23'], 'new folder first, cut to 6');
    },
  },
  {
    area,
    name: 'no active tab shows a message and disables Save',
    page: 'popup',
    fixture: () => base({ activeTab: null }),
    async run(t) {
      t.ok(t.$('#page .muted')?.textContent.startsWith('No tab to save'), 'message');
      t.ok(t.$('#save').disabled, 'Save disabled');
    },
  },
];
