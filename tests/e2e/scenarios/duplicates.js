import { base, F, L } from '../fixtures.js';

const area = 'duplicates';
const newer = (bm, i) => ({ ...bm, dateAdded: 1800000000000 + i });
const dupes = (opts = {}) =>
  base({
    extraRoot: [
      F('80', 'Copies', [
        newer(L('81', 'Shop copy', 'https://shop.example.com/api/x/'), 0),
        newer(L('82', 'Loose from Slack', 'https://loose.example.com/?utm_source=slack#top'), 1),
      ]),
    ],
    ...opts,
  });
const openDup = async (t) => {
  t.click(t.$('#settingsBtn'));
  await t.settle();
  t.click(t.$('.set-tab[data-tab="dupes"]'));
  await t.settle();
};
const groups = (t) => t.$$('#dupList .dup-group').map((g) => t.$$('.dup-row', g).map((r) => r.dataset.id));
const keep = (t, id) => t.click(t.$(`#dupList .dup-row[data-id="${id}"] button`));
const looseToggle = (t) => t.$('#dupCard input.switch');

export default [
  {
    area,
    name: 'duplicates: Settings › Duplicates lists each address saved more than once, with its folder',
    page: 'newtab',
    fixture: () => dupes(),
    async run(t) {
      await openDup(t);
      t.eq(t.$('#dupCard h3').textContent, 'Duplicate links (1)', 'count in the title');
      t.eq(groups(t), [['31', '81']], 'trailing slash is the same address');
      t.eq(
        t.$$('#dupList .dup-where').map((w) => w.firstChild.textContent),
        ['Shop API', 'Copies'],
        'folder of each copy',
      );
      t.ok(!t.$('#dupOldest'), 'no bulk button for one group');
      t.ok(!t.$('#dupCard .dup-body').textContent.includes('null'), 'no stray text');
      t.click(t.$('.set-tab[data-tab="bookmarks"]'));
      t.ok(!t.$('#dupCard'), 'not on the Bookmarks tab');
    },
  },
  {
    area,
    name: 'duplicates: ignoring tracking parameters adds the utm copy as a group and shows its full address',
    page: 'newtab',
    fixture: () => dupes(),
    async run(t) {
      await openDup(t);
      t.click(looseToggle(t));
      await t.settle();
      t.eq(
        groups(t),
        [
          ['31', '81'],
          ['60', '82'],
        ],
        'second group',
      );
      t.eq(t.$('#dupList .dup-row[data-id="60"] .dup-where').firstChild.textContent, 'Unsorted', 'root link is Unsorted');
      t.eq(t.$('#dupList .dup-row[data-id="82"] .dup-alt')?.textContent, 'https://loose.example.com/?utm_source=slack#top', 'own address shown');
      t.ok(t.$('#dupOldest'), 'bulk button shows');
    },
  },
  {
    area,
    name: 'duplicates: Keep this deletes the other copy; Undo puts it back at the same place with its note',
    page: 'newtab',
    fixture: () => {
      const f = dupes();
      f.store.linkMeta = { 81: { note: 'Use the admin login', pri: 'high' } };
      return f;
    },
    async run(t) {
      await openDup(t);
      keep(t, '31');
      await t.settle();
      t.eq(t.kids('80'), ['82'], 'copy deleted');
      t.eq(t.store.linkMeta?.['81'], undefined, 'its note removed');
      t.eq(t.toast()?.firstChild.textContent, 'Deleted 1 copy', 'toast');
      t.eq(t.$('#dupCard h3').textContent, 'Duplicate links (0)', 'card updates');
      t.ok(t.$('#dupCard .dup-empty'), 'empty state');
      t.ok(t.$('#settingsView .set-tab[data-tab="dupes"].on'), 'stays on the Duplicates tab');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      const back = t.node('80').children[0];
      t.eq([back.title, back.url], ['Shop copy', 'https://shop.example.com/api/x/'], 'restored at index 0');
      t.eq(t.store.linkMeta?.[back.id], { note: 'Use the admin login', pri: 'high' }, 'note restored under the new id');
    },
  },
  {
    area,
    name: 'duplicates: Keep the oldest in every group deletes all newer copies with one Undo',
    page: 'newtab',
    fixture: () => dupes(),
    async run(t) {
      await openDup(t);
      t.click(looseToggle(t));
      await t.settle();
      t.click(t.$('#dupOldest'));
      await t.settle();
      t.eq(t.kids('80'), [], 'both newer copies deleted');
      t.ok(t.node('31') && t.node('60'), 'oldest copies kept');
      t.eq(t.toast()?.firstChild.textContent, 'Deleted 2 copies', 'toast');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      t.eq(
        t.node('80').children.map((n) => n.title),
        ['Shop copy', 'Loose from Slack'],
        'both back in the old order',
      );
    },
  },
  {
    area,
    name: 'duplicates: links in the Home folder are not counted when Home is under the root',
    page: 'newtab',
    fixture: () =>
      base({
        other: [F('70', 'Home', [L('71', 'GitHub', 'https://github.com/')]), F('90', 'Work', [L('91', 'GitHub', 'https://github.com/')])],
        settings: { rootId: '2', home: { folderId: '70', seeded: true } },
      }),
    async run(t) {
      await openDup(t);
      t.eq(t.$('#dupCard h3').textContent, 'Duplicate links (0)', 'Home copy ignored');
    },
  },
];
