import { base } from '../fixtures.js';

const area = 'popup';
const tab = { title: 'Argo app PROD', url: 'https://deploy.prod.example.com/applications/x?view=tree' };
const folders = (t) => t.$$('#folders .folder').map((b) => b.childNodes[0]?.textContent);
const selected = (t) => t.$('#folders .folder.on')?.childNodes[0]?.textContent;

export default [
  {
    area,
    name: 'shows the active tab title, URL and env badge',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.eq(t.$('#page .field').value, 'Argo app PROD', 'title');
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
      t.eq(folders(t), ['My Links', 'Sprint board', 'Blocked', 'Shop API', 'GITHUB - PIN', 'Empty'], 'list');
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
      t.eq(selected(t), 'Sprint board', 'one up');
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
      t.click(t.$$('#modes .chip').find((c) => c.textContent === 'Whole site'));
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
      t.click(t.$$('#modes .chip').find((c) => c.textContent === 'Whole site'));
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
      t.ok(t.$$('#modes .chip').find((c) => c.textContent === 'Whole site')?.disabled, 'file:// disabled');
      t.H.activeTab = { title: 'Extensions', url: 'chrome://extensions/' };
      await t.reload('popup');
      t.ok(t.$$('#modes .chip').find((c) => c.textContent === 'Whole site')?.disabled, 'chrome:// disabled');
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
    name: 'no active tab shows a message and disables Save',
    page: 'popup',
    fixture: () => base({ activeTab: null }),
    async run(t) {
      t.ok(t.$('#page .muted')?.textContent.startsWith('No tab to save'), 'message');
      t.ok(t.$('#save').disabled, 'Save disabled');
    },
  },
];
