import { base, F } from '../fixtures.js';

const area = 'popup';
const tab = { title: 'Deploy app PROD', url: 'https://deploy.prod.example.com/applications/x?view=tree' };
const folders = (t) => t.$$('#folders .folder').map((b) => b.childNodes[0]?.textContent);
const selected = (t) => t.$('#folders .folder.on')?.childNodes[0]?.textContent;

export default [
  {
    area,
    name: 'shows the active tab title, URL and env badge',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.eq(t.$('#page .field').value, 'Deploy app PROD', 'title');
      t.eq(t.$('#page .target').textContent, tab.url, 'full URL');
      t.eq(t.$('#page .badge')?.textContent, 'PROD', 'badge');
    },
  },
  {
    area,
    name: 'folder list: root first, then folders and nested sections',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.eq(folders(t), ['My Links', 'Sprint tasks', 'Blocked', 'Shop API', 'GITHUB - PIN', 'Empty'], 'list');
      t.eq(selected(t), 'My Links', 'root selected when nothing saved yet');
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
      t.eq(selected(t), 'Blocked', 'two down');
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
    name: 'compact layout: named priority, one-line note beside Page/Site, Save visible with many folders',
    page: 'popup',
    fixture: () =>
      base({
        activeTab: { title: 'Shop PROD', url: 'https://shop.example.com/api/x' },
        extraRoot: Array.from({ length: 30 }, (_, i) => F(String(900 + i), `Folder ${i + 1}`)),
      }),
    async run(t) {
      t.eq(
        t.$$('#meta .pri-pick button').map((b) => b.textContent),
        ['None', 'High', 'Medium', 'Low'],
        'priority names shown',
      );
      t.eq(t.$('#note').tagName, 'INPUT', 'note is one line');
      t.eq(t.$('#note').maxLength, 200, 'note max length');
      const note = t.$('#note').getBoundingClientRect();
      const modes = t.$('#modes').getBoundingClientRect();
      t.ok(Math.abs(note.top - modes.top) < 2, 'note and Page/Site share a row');
      t.ok(note.width > modes.width * 1.8, 'note takes 2 of 3 parts');
      t.ok(t.$('#exists .exists'), 'already-in line shown');
      const body = t.d.body.getBoundingClientRect();
      const save = t.$('#save').getBoundingClientRect();
      t.ok(body.height <= 600, `popup fits Chrome's 600 px (${Math.round(body.height)})`);
      t.ok(save.bottom <= body.bottom && save.top >= 0, 'Save visible without scrolling');
      const list = t.$('#folders');
      t.ok(list.scrollHeight > list.clientHeight, 'folder list scrolls instead');
    },
  },
  {
    area,
    name: 'Enter in the note box saves',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
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
