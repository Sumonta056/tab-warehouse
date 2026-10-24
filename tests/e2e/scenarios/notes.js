import { base, F, L } from '../fixtures.js';

const area = 'notes';
const tab = { title: 'Deploy app PROD', url: 'https://deploy.prod.example.com/applications/x?view=tree' };
const META = {
  32: { note: 'Ask Sam for the token', pri: 'high' },
  33: { pri: 'high' },
  34: { pri: 'med' },
};
const withMeta = (meta = META, opts = {}) => {
  const f = base(opts);
  f.store.linkMeta = meta;
  return f;
};
const prig = (t) => t.$$('#page .grp.prig').map((g) => g.dataset.pri);
const prigEl = (t, pri) => t.$(`#page .grp.prig[data-pri="${pri}"]`);
const chip = (t, v) => t.$(`#page .pri-filter [data-pri="${v}"]`);

export default [
  {
    area,
    name: 'popup saves a priority and a note with the new bookmark',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#meta .pri-pick [data-pri="high"]'));
      t.eq(t.$('#meta .pri-pick [data-pri="high"]').getAttribute('aria-pressed'), 'true', 'High pressed');
      t.type(t.$('#note'), '  Run after QA  ');
      t.type(t.$('#q'), 'Shop');
      await t.settle();
      t.click(t.$('#save'));
      await t.settle();
      const saved = t.node('30').children.at(-1);
      t.eq(saved.url, tab.url, 'bookmark created');
      t.eq(t.store.linkMeta?.[saved.id], { note: 'Run after QA', pri: 'high' }, 'meta saved by new id');
    },
  },
  {
    area,
    name: 'popup without a note or priority stores nothing extra',
    page: 'popup',
    fixture: () => base({ activeTab: tab }),
    async run(t) {
      t.click(t.$('#save'));
      await t.settle();
      t.eq(t.store.linkMeta, undefined, 'no linkMeta written');
    },
  },
  {
    area,
    name: 'priority groups: High, Medium, Other on top of the list, sort applies inside',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.eq(prig(t), ['high', 'med', 'none'], 'group headers');
      t.eq(
        t.$$('#page .grp.prig').map((g) => g.textContent.replace(/\d+$/, '').trim()),
        ['High', 'Medium', 'Other'],
        'header labels',
      );
      t.eq(t.rowIds(), ['32', '33', '34', '31'], 'manual order inside groups');
      t.ok(t.row('32').querySelector('.pri-bar'), 'stripe on High row');
      t.ok(!t.row('31').querySelector('.pri-bar'), 'no stripe on Other row');
      t.eq(t.row('32').querySelector('.note')?.textContent, 'Ask Sam for the token', 'note line');
      t.click(t.$('.toolbar select'));
      t.$('.toolbar select').value = 'name';
      t.$('.toolbar select').dispatchEvent(new t.w.Event('change', { bubbles: true }));
      await t.settle();
      t.eq(t.rowIds(), ['33', '32', '34', '31'], 'name sort applies inside groups');
    },
  },
  {
    area,
    name: 'folder without any priority keeps the plain list and no filter buttons',
    page: 'newtab',
    fixture: () => withMeta({}),
    async run(t) {
      await t.folder('Shop API');
      t.eq(t.$$('#page .grp.prig').length, 0, 'no priority headers');
      t.ok(!t.$('#page .pri-filter'), 'no filter buttons');
      t.eq(t.rowIds(), ['31', '32', '33', '34'], 'plain order');
    },
  },
  {
    area,
    name: 'a folder with only notes shows the filter buttons but no priority headers',
    page: 'newtab',
    fixture: () => withMeta({ 33: { note: 'flaky' } }),
    async run(t) {
      await t.folder('Shop API');
      t.eq(t.$$('#page .grp.prig').length, 0, 'no priority headers');
      t.ok(chip(t, 'note'), 'Has note button');
    },
  },
  {
    area,
    name: 'filter buttons: High, Has note, All; reset when another folder opens',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.click(chip(t, 'high'));
      await t.settle();
      t.eq(t.rowIds(), ['32', '33'], 'High only');
      t.eq(chip(t, 'high').getAttribute('aria-pressed'), 'true', 'pressed');
      t.click(chip(t, 'note'));
      await t.settle();
      t.eq(t.rowIds(), ['32'], 'Has note only');
      t.click(chip(t, 'low'));
      await t.settle();
      t.eq(t.$('#page .empty')?.textContent, 'Nothing matches the filter.', 'empty Low');
      await t.folder('Sprint tasks');
      await t.folder('Shop API');
      t.eq(chip(t, 'all').getAttribute('aria-pressed'), 'true', 'back to All');
      t.eq(t.rowIds().length, 4, 'all rows');
    },
  },
  {
    area,
    name: 'folder filter and global search match the note text',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.type(t.$('.toolbar input[type=search]'), 'sam');
      await t.settle();
      t.eq(t.rowIds(), ['32'], 'folder filter');
      t.ok(t.row('32').querySelector('.note mark'), 'note text highlighted');
      t.type(t.$('#q'), 'sam token');
      await t.settle();
      t.eq(t.rowIds(), ['32'], 'global search');
    },
  },
  {
    area,
    name: 'sections: priority links first inside each section, no priority headers',
    page: 'newtab',
    fixture: () => withMeta({ 22: { pri: 'high' } }),
    async run(t) {
      await t.folder('Sprint tasks');
      t.eq(t.$$('#page .grp.prig').length, 0, 'no priority headers');
      t.eq(t.rowIds(), ['24', '22', '21'], 'High first in No section');
    },
  },
  {
    area,
    name: 'env sort: priority links first inside each env group',
    page: 'newtab',
    fixture: () => {
      const f = base({
        extraRoot: [
          F('80', 'Mixed', [
            L('81', 'a PROD', 'https://www.example.org/a'),
            L('82', 'b PROD', 'https://www.example.org/b'),
            L('83', 'c TEST', 'https://test.example.org/c'),
          ]),
        ],
        settings: { folders: { 80: { sort: 'env' } } },
      });
      f.store.linkMeta = { 82: { pri: 'low' } };
      return f;
    },
    async run(t) {
      await t.folder('Mixed');
      t.eq(t.$$('#page .grp.prig').length, 0, 'no priority headers');
      t.eq(t.rowIds(), ['82', '81', '83'], 'Low before none inside PROD');
    },
  },
  {
    area,
    name: 'collapse a priority group hides its rows and is saved per folder',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.click(prigEl(t, 'high'));
      await t.settle();
      t.eq(t.settings().folders['30'].closed['pri:high'], true, 'saved');
      t.eq(prigEl(t, 'high').getAttribute('aria-expanded'), 'false', 'aria-expanded');
      t.eq(t.rowIds(), ['34', '31'], 'High rows hidden');
    },
  },
  {
    area,
    name: 'drop a row on a priority header sets that priority and moves it to the end of the group',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.drag(t.row('31'), prigEl(t, 'high'));
      await t.settle();
      t.eq(t.store.linkMeta['31'], { pri: 'high' }, 'priority set');
      t.eq(t.kids('30'), ['32', '33', '31', '34'], 'moved after the last High link');
      t.eq(t.rowIds(), ['32', '33', '31', '34'], 'shown in High');
    },
  },
  {
    area,
    name: 'drop a row before a row of another group takes that row priority',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.drag(t.row('34'), t.row('32'), 'before');
      await t.settle();
      t.eq(t.store.linkMeta['34'], { pri: 'high' }, 'took High');
      t.eq(t.rowIds(), ['34', '32', '33', '31'], 'first in High');
    },
  },
  {
    area,
    name: 'link menu: Mark as Low and Clear priority',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      t.ok(!t.menuLabels().includes('Clear priority'), 'no Clear for a link without priority');
      t.menu('Mark as Low');
      await t.settle();
      t.eq(t.store.linkMeta['31'], { pri: 'low' }, 'Low saved');
      t.context(t.row('33'));
      t.menu('Clear priority');
      await t.settle();
      t.eq(t.store.linkMeta['33'], undefined, 'entry removed');
    },
  },
  {
    area,
    name: 'edit form saves the note and priority; Add note focuses the note box',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      t.menu('Add note');
      await t.settle();
      const note = t.$('#page .edit .note-in');
      t.eq(t.d.activeElement, note, 'note box focused');
      t.type(note, 'Read only');
      t.click(t.$('#page .edit .pri-pick [data-pri="med"]'));
      t.click(t.$('#page .edit button[type=submit]'));
      await t.settle();
      t.eq(t.store.linkMeta['31'], { note: 'Read only', pri: 'med' }, 'saved');
      t.eq(t.row('31').querySelector('.note')?.textContent, 'Read only', 'shown');
    },
  },
  {
    area,
    name: 'delete a link removes its note; Undo restores the link and its note',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('32'));
      t.menu('Delete');
      await t.settle();
      t.eq(t.store.linkMeta['32'], undefined, 'meta removed');
      t.click(t.toast()?.querySelector('button'));
      await t.settle();
      const back = t.node('30').children[1];
      t.eq(back?.url, 'https://test.shop.example.com/api/x', 'link restored');
      t.eq(t.store.linkMeta[back.id], META[32], 'note restored by new id');
    },
  },
  {
    area,
    name: 'a note saved elsewhere (popup) shows in the open folder list',
    page: 'newtab',
    fixture: () => withMeta({}),
    async run(t) {
      await t.folder('Shop API');
      await t.w.chrome.storage.local.set({ linkMeta: { 31: { note: 'from popup', pri: 'low' } } });
      await t.settle();
      t.eq(t.row('31').querySelector('.note')?.textContent, 'from popup', 'note shown');
      t.ok(t.$('#page .grp.prig[data-pri="low"]'), 'Low group shown');
    },
  },
  {
    area,
    name: 'a link removed outside the page loses its stored note',
    page: 'newtab',
    fixture: () => withMeta(),
    async run(t) {
      await t.folder('Shop API');
      await t.w.chrome.bookmarks.remove('33');
      await t.settle();
      t.eq(Object.keys(t.store.linkMeta).sort(), ['32', '34'], 'pruned');
    },
  },
  {
    area,
    name: 'JSON import matches notes by URL and keeps existing notes',
    page: 'newtab',
    fixture: () => withMeta({ 31: { note: 'mine' } }),
    async run(t) {
      const { importFile } = await t.w.eval("import('/extension/services/import.js')");
      const data = {
        format: 'sumonta-warehouse',
        version: 1,
        sections: [
          {
            title: 'Shop API',
            links: [
              { title: 'Shop PROD', url: 'https://shop.example.com/api/x', note: 'theirs', pri: 'high' },
              { title: 'Shop TEST', url: 'https://test.shop.example.com/api/x', pri: 'low' },
              { title: 'New', url: 'https://new.example.com/', note: 'fresh' },
            ],
          },
        ],
      };
      const file = new t.w.File([JSON.stringify(data)], 'w.json', { type: 'application/json' });
      await importFile(file, t.node('10'), t.settings());
      await t.settle();
      const fresh = t.node('30').children.find((c) => c.url === 'https://new.example.com/');
      t.eq(t.store.linkMeta['31'], { note: 'mine' }, 'existing note kept');
      t.eq(t.store.linkMeta['32'], { pri: 'low' }, 'matched by URL');
      t.eq(t.store.linkMeta[fresh?.id], { note: 'fresh' }, 'new link gets its note');
    },
  },
];
