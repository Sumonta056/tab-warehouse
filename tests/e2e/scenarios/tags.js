import { base, F, L, SAMPLE_ENV_RULES, SAMPLE_HOST_MAP } from '../fixtures.js';

const area = 'tags';
const QA = { name: 'QA', plain: 'QA team', color: 'pink' };
const withQa = (settings = {}) =>
  base({ settings: { customTags: [QA], envRules: [{ pattern: 'stage.shop.example.com', env: 'QA' }, ...SAMPLE_ENV_RULES], ...settings } });
const openEnv = async (t) => {
  t.click(t.$('#settingsBtn'));
  await t.settle();
  t.click(t.$('.set-tab[data-tab="env"]'));
  await t.settle();
};
const tagRows = (t) => t.$$('#envTags .tag-row[data-i]');
const names = (t) => tagRows(t).map((r) => r.querySelector('.tag-name').value);
const submit = (form) => form.dispatchEvent(new form.ownerDocument.defaultView.Event('submit', { bubbles: true, cancelable: true }));
const addTag = async (t, name, plain = '', color = '') => {
  t.type(t.$('#tagAddName'), name);
  t.type(t.$('#tagAddPlain'), plain);
  if (color) t.click(t.$(`#envTags .tag-row.add .tag-sw[data-tag="${color}"]`));
  submit(t.$('#envTags .tag-row.add'));
  await t.settle();
};
const MIXED = F('80', 'Mixed', [
  L('81', 'Plain', 'https://plain.example.net/'),
  L('82', 'QA one', 'https://stage.shop.example.com/b'),
  L('83', 'Live', 'https://shop.example.com/c'),
]);
const withMixed = () =>
  base({
    extraRoot: [MIXED],
    settings: { customTags: [QA], envRules: [{ pattern: 'stage.shop.example.com', env: 'QA' }, ...SAMPLE_ENV_RULES], folders: { 80: { sort: 'env' } } },
  });
const QA_SITE = { ...SAMPLE_HOST_MAP[0], STAGE: '', QA: 'stage.shop.example.com' };
const isTag = (b, name, color) => b?.textContent === name && b.classList.contains('tag') && b.dataset.tag === color;

export default [
  {
    area,
    name: 'tags: add a tag; it shows in its list, the label select, the legend and the sites columns',
    page: 'newtab',
    fixture: () => base({ settings: { envRules: [], hostMap: [] } }),
    async run(t) {
      await openEnv(t);
      t.eq(t.$('#envTags h3')?.textContent, 'Your tags (0)', 'card title');
      t.eq(
        t.$$('#envTags .tag-builtin .badge').map((b) => b.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'built-in tags shown, locked',
      );
      await addTag(t, 'qa', ' QA team ', 'pink');
      t.eq(t.settings().customTags, [QA], 'saved upper-case with plain name and color');
      t.eq(t.$('#envTags h3').textContent, 'Your tags (1)', 'count');
      t.ok(isTag(tagRows(t)[0].querySelector('.badge'), 'QA', 'pink'), 'row badge in its color');
      t.eq(t.$('#tagAddName').value, '', 'add box cleared');
      t.eq(t.d.activeElement, t.$('#tagAddName'), 'focus back in the add box');
      t.ok(
        t.$$('#envLabels .env-rule.add select option').some((o) => o.value === 'QA' && o.textContent === 'QA · QA team'),
        'label select offers the tag',
      );
      t.ok(
        t.$$('.env-legend .badge').some((b) => isTag(b, 'QA', 'pink')),
        'legend shows the tag',
      );
      t.eq(
        t.$$('#envSites .env-site.head .badge').map((b) => b.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL', 'QA'],
        'sites have a column for the tag',
      );
      t.ok(t.$('#envAddQA'), 'add-site box for the tag');
    },
  },
  {
    area,
    name: 'tags: a bad or taken name is refused with the reason',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openEnv(t);
      await addTag(t, 'PROD');
      t.eq(t.toast()?.firstChild.textContent, 'PROD is a built-in name.', 'built-in name');
      await addTag(t, 'Q-A');
      t.eq(t.toast()?.firstChild.textContent, 'Use 1 to 8 capital letters or digits.', 'bad characters');
      t.eq(t.settings().customTags ?? [], [], 'nothing saved');
      await addTag(t, 'QA');
      await addTag(t, 'qa');
      t.eq(t.toast()?.firstChild.textContent, 'There is already a tag QA.', 'taken');
      t.eq(names(t), ['QA'], 'only one QA');
      t.eq(t.settings().customTags[0].color, 'teal', 'first color when none is picked');
    },
  },
  {
    area,
    name: 'tags: a label with a custom tag shows its colored badge in Try it, on the folder page, the Board and the palette',
    page: 'newtab',
    fixture: () => withQa(),
    async run(t) {
      await openEnv(t);
      t.type(t.$('#envTry'), 'https://stage.shop.example.com/cart');
      await t.sleep(20);
      t.ok(isTag(t.$('.env-result .badge'), 'QA', 'pink'), 'Try it');
      t.ok(t.$('#envLabels .env-rule[data-i="0"] select').classList.contains('tag'), 'label select colored as a tag');
      t.eq(t.$('#envLabels .env-rule[data-i="0"] select').dataset.tag, 'pink', 'label select color');
      t.click(t.$('.set-done'));
      await t.settle();
      await t.folder('Shop API');
      t.ok(isTag(t.row('33').querySelector('.badge'), 'QA', 'pink'), 'folder page row');
      t.ok(t.row('31').querySelector('.badge').classList.contains('PROD'), 'built-in badge unchanged');
      t.click(t.$('#boardBtn'));
      await t.settle();
      t.ok(isTag(t.$('#page .bcard[data-id="33"] .badge'), 'QA', 'pink'), 'Board card');
      await t.palette();
      t.type(t.$('#palQ'), 'shop stage');
      await t.settle();
      t.ok(isTag(t.$('#palList .pal-item .badge'), 'QA', 'pink'), 'palette item');
    },
  },
  {
    area,
    name: 'tags: rename updates its labels and site column; a bad name is refused; plain name and color save',
    page: 'newtab',
    fixture: () => withQa({ hostMap: [{ PROD: 'shop.example.com', TEST: '', STAGE: '', LOCAL: '', QA: 'stage.shop.example.com' }] }),
    async run(t) {
      await openEnv(t);
      const row = () => tagRows(t)[0];
      t.type(row().querySelector('.tag-name'), 'PROD');
      await t.settle();
      t.eq(t.toast()?.firstChild.textContent, 'PROD is a built-in name.', 'refused');
      t.eq(row().querySelector('.tag-name').value, 'QA', 'old name back');
      t.type(row().querySelector('.tag-name'), 'uat');
      await t.settle();
      t.eq(t.settings().customTags[0].name, 'UAT', 'renamed');
      t.eq(t.settings().envRules[0], { pattern: 'stage.shop.example.com', env: 'UAT' }, 'label follows');
      t.eq(t.settings().hostMap, [{ PROD: 'shop.example.com', TEST: '', STAGE: '', LOCAL: '', UAT: 'stage.shop.example.com' }], 'site column follows');
      t.type(row().querySelector('.tag-plain'), 'Users');
      await t.settle();
      t.eq(t.settings().customTags[0].plain, 'Users', 'plain name saved');
      t.click(row().querySelector('.tag-sw[data-tag="red"]'));
      await t.settle();
      t.eq(t.settings().customTags[0].color, 'red', 'color saved');
      t.eq(row().querySelector('.tag-sw[data-tag="red"]').getAttribute('aria-pressed'), 'true', 'color marked');
    },
  },
  {
    area,
    name: 'tags: delete asks first, then removes the tag, its labels and its site column',
    page: 'newtab',
    fixture: () =>
      withQa({
        hostMap: [
          { PROD: 'shop.example.com', TEST: '', STAGE: '', LOCAL: '', QA: 'stage.shop.example.com' },
          { PROD: '', TEST: '', STAGE: '', LOCAL: '', QA: 'only.qa.example.com' },
        ],
      }),
    async run(t) {
      await openEnv(t);
      const del = () => t.$('#envTags .tag-row[data-i="0"] button[aria-label="Delete tag QA"]');
      t.confirm(false);
      t.click(del());
      await t.settle();
      t.eq(t.settings().customTags, [QA], 'kept when not confirmed');
      t.confirm(true);
      t.click(del());
      await t.settle();
      t.eq(t.settings().customTags, [], 'tag deleted');
      t.eq(t.settings().envRules, SAMPLE_ENV_RULES, 'its labels removed');
      t.eq(t.settings().hostMap, [{ PROD: 'shop.example.com', TEST: '', STAGE: '', LOCAL: '' }], 'its column removed; an empty site removed');
      t.eq(
        t.$$('#envSites .env-site.head .badge').map((b) => b.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'column gone',
      );
    },
  },
  {
    area,
    name: 'tags: Alt+arrows reorder tags',
    page: 'newtab',
    fixture: () => base({ settings: { customTags: [QA, { name: 'UAT', plain: '', color: 'red' }] } }),
    async run(t) {
      await openEnv(t);
      t.key(tagRows(t)[0], 'ArrowDown', { altKey: true });
      await t.settle();
      t.eq(
        t.settings().customTags.map((x) => x.name),
        ['UAT', 'QA'],
        'moved down',
      );
      t.eq(names(t), ['UAT', 'QA'], 'rows redrawn');
      t.eq(t.d.activeElement, tagRows(t)[1].querySelector('.tag-name'), 'focus follows the tag');
    },
  },
  {
    area,
    name: 'tags: Copy includes the tags; Import adds new tags with their labels; Undo removes them',
    page: 'newtab',
    fixture: () => withQa({ envRules: [{ pattern: 'stage.shop.example.com', env: 'QA' }], hostMap: [] }),
    async run(t) {
      await openEnv(t);
      t.click(t.$('#envCopy'));
      await t.until(() => t.toast(), 'copy toast');
      t.ok(t.$('#envText').value.includes('QA pink QA team'), 'text has the tag');
      t.ok(t.$('#envText').value.includes('stage.shop.example.com QA'), 'text has its label');
      t.ok(t.$('#envText').value.includes('PROD TEST STAGE LOCAL QA'), 'sites header names the tag column');
      t.type(t.$('#envText'), 'UAT red Users\nuat.example.com UAT\nstage.shop.example.com QA');
      t.click(t.$('#envImport'));
      await t.settle();
      t.eq(t.settings().customTags, [QA, { name: 'UAT', plain: 'Users', color: 'red' }], 'new tag added, old kept');
      t.eq(
        t.settings().envRules,
        [
          { pattern: 'uat.example.com', env: 'UAT' },
          { pattern: 'stage.shop.example.com', env: 'QA' },
        ],
        'labels replaced',
      );
      t.eq(t.toast()?.firstChild.textContent, 'Imported 1 tag, 2 rules and 0 sites', 'toast counts the tag');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      t.eq(t.settings().customTags, [QA], 'Undo removes the new tag');
      t.eq(t.settings().envRules, [{ pattern: 'stage.shop.example.com', env: 'QA' }], 'Undo restores labels');
    },
  },
  {
    area,
    name: 'tags: Tag sort shows a group for a custom tag after the built-ins, in its color',
    page: 'newtab',
    fixture: () => withMixed(),
    async run(t) {
      await t.folder('Mixed');
      const grps = t.$$('#body .grp');
      t.eq(
        grps.map((g) => g.dataset.env),
        ['PROD', 'QA', 'NONE'],
        'groups',
      );
      t.ok(grps[1].classList.contains('tag') && grps[1].dataset.tag === 'pink', 'QA header in its color');
      t.ok(grps[1].textContent.startsWith('QA'), 'QA header text');
      t.ok(grps[2].textContent.startsWith('NO TAG'), 'untagged header text');
      t.ok(t.row('82'), 'QA link shown');
      t.click(grps[1]);
      await t.settle();
      t.eq(t.settings().folders['80'].closed.QA, true, 'QA collapsed');
      t.ok(!t.row('82'), 'QA row hidden');
    },
  },
  {
    area,
    name: 'tags: the Board sorts a custom tag after the built-ins and before untagged links',
    page: 'newtab',
    fixture: () => withMixed(),
    async run(t) {
      t.click(t.$('#boardBtn'));
      await t.settle();
      t.eq(
        t.$$('#page .bcol[data-id="80"] .bcard').map((c) => c.dataset.id),
        ['83', '82', '81'],
        'card order',
      );
    },
  },
  {
    area,
    name: 'tags: the Tag matrix has a column for a custom tag with its links in its color',
    page: 'newtab',
    fixture: () => withQa({ hostMap: [QA_SITE] }),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'Tag matrix'));
      await t.settle();
      t.eq(
        t.$$('.matrix thead th.env').map((th) => th.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL', 'QA'],
        'columns',
      );
      t.eq(t.$$('.matrix tbody tr').length, 1, 'one path row');
      const qa = t.$$('.matrix tbody tr td')[5].querySelector('.pill');
      t.ok(qa?.classList.contains('tag') && qa.dataset.tag === 'pink', 'QA pill in its color');
      t.eq(qa?.getAttribute('href'), 'https://stage.shop.example.com/api/x', 'QA pill opens the link');
      t.ok(t.$$('.matrix tbody tr td')[3].querySelector('.pill.none'), 'empty STAGE cell');
    },
  },
  {
    area,
    name: 'tags: the Tag matrix derives a missing custom tag from the site row',
    page: 'newtab',
    fixture: () =>
      withQa({
        envRules: [{ pattern: 'qa.shop.example.com', env: 'QA' }, ...SAMPLE_ENV_RULES],
        hostMap: [{ ...SAMPLE_HOST_MAP[0], QA: 'qa.shop.example.com' }],
      }),
    async run(t) {
      await t.folder('Shop API');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'Tag matrix'));
      await t.settle();
      const d = t.$$('.matrix tbody tr td')[5].querySelector('.pill.derive');
      t.ok(d?.title.startsWith('https://qa.shop.example.com/api/x'), 'derive into QA');
      t.click(d);
      await t.settle();
      t.eq(t.tabs.at(-1)?.url, 'https://qa.shop.example.com/api/x', 'opened derived URL');
      t.click(t.$('.matrix tbody tr button[aria-label="Row menu"]'));
      t.ok(t.menuLabels().includes('Save derived links (QA)'), `row menu (${t.menuLabels().join(', ')})`);
    },
  },
  {
    area,
    name: 'tags: the link menu opens the same page on a custom tag and from it',
    page: 'newtab',
    fixture: () => withQa({ hostMap: [QA_SITE] }),
    async run(t) {
      await t.folder('Shop API');
      t.context(t.row('31'));
      t.ok(t.menuLabels().includes('Open on QA'), `from PROD (${t.menuLabels().join(', ')})`);
      t.menu('Open on QA');
      t.eq(t.tabs.at(-1)?.url, 'https://stage.shop.example.com/api/x', 'opened on QA');
      t.context(t.row('33'));
      t.ok(
        ['Open on PROD', 'Open on TEST', 'Open on LOCAL'].every((l) => t.menuLabels().includes(l)),
        `from QA (${t.menuLabels().join(', ')})`,
      );
    },
  },
  {
    area,
    name: 'tags: the popup shows a custom tag badge and opens the page in a custom tag',
    page: 'popup',
    fixture: () => ({ ...withQa({ hostMap: [QA_SITE] }), activeTab: { title: 'Shop', url: 'https://shop.example.com/api/x', index: 3 } }),
    async run(t) {
      t.ok(t.$('#page .badge').classList.contains('PROD'), 'built-in badge');
      const qa = t.$('#switch .env-go[data-env="QA"]');
      t.ok(qa, 'QA button');
      t.ok(isTag(qa?.querySelector('.badge'), 'QA', 'pink'), 'QA badge in its color');
      t.eq(qa?.querySelector('.u').textContent, 'https://stage.shop.example.com/api/x', 'QA address');
      t.eq(qa?.querySelector('.n').textContent, 'QA team', 'plain name');
    },
  },
  {
    area,
    name: 'tags: the popup badge of a page with a custom tag is in its color',
    page: 'popup',
    fixture: () => ({ ...withQa({ hostMap: [QA_SITE] }), activeTab: { title: 'Shop', url: 'https://stage.shop.example.com/api/x', index: 3 } }),
    async run(t) {
      t.ok(isTag(t.$('#page .badge'), 'QA', 'pink'), 'page badge');
      t.eq(
        t.$$('#switch .env-go').map((b) => b.dataset.env),
        ['PROD', 'TEST', 'LOCAL'],
        'other versions from the QA host',
      );
    },
  },
  {
    area,
    name: 'tags: Backup JSON carries custom tags; import adds new ones and keeps local ones',
    page: 'newtab',
    fixture: () => withQa({ hostMap: [QA_SITE] }),
    async run(t) {
      const { exportJson } = await t.w.eval("import('/extension/ui/export.js')");
      const { importFile } = await t.w.eval("import('/extension/services/import.js')");
      const full = () => ({ order: [], folders: {}, categories: [], folderCat: {}, board: {}, ...t.settings() });
      let blob;
      const keep = t.w.URL.createObjectURL;
      t.w.URL.createObjectURL = (b) => ((blob = b), 'blob:x');
      await exportJson({ title: 'My Links' }, [], full());
      t.w.URL.createObjectURL = keep;
      const out = JSON.parse(await blob.text());
      t.eq(out.preferences.customTags, [QA], 'exported');
      t.eq(out.preferences.hostMap, [QA_SITE], 'site column exported');
      const data = {
        format: 'sumonta-warehouse',
        version: 1,
        sections: [],
        preferences: {
          customTags: [
            { name: 'QA', plain: 'Other', color: 'red' },
            { name: 'UAT', plain: 'Users', color: 'yellow' },
          ],
          envRules: [
            { pattern: 'uat.example.com', env: 'UAT' },
            { pattern: 'stage.shop.example.com', env: 'QA' },
          ],
          hostMap: [{ PROD: 'shop.example.com', UAT: 'uat.example.com' }],
        },
      };
      const file = new t.w.File([JSON.stringify(data)], 'w.json', { type: 'application/json' });
      await importFile(file, t.node('10'), full());
      await t.settle();
      t.eq(t.settings().customTags, [QA, { name: 'UAT', plain: 'Users', color: 'yellow' }], 'new tag added, local QA kept');
      t.eq(
        t.settings().envRules,
        [
          { pattern: 'uat.example.com', env: 'UAT' },
          { pattern: 'stage.shop.example.com', env: 'QA' },
        ],
        'labels imported',
      );
      t.eq(t.settings().hostMap, [{ PROD: 'shop.example.com', UAT: 'uat.example.com' }], 'sites imported');
    },
  },
  {
    area,
    name: 'tags: the matrix empty state, the palette and Backup use the word tags',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'Tag matrix'));
      await t.settle();
      t.eq(
        t.$('#body .empty')?.textContent,
        'No link in this folder has a tag, so there is nothing to lay out as a matrix. Use List view or add tags by address in Settings › Tags.',
        'empty state',
      );
      await t.palette();
      t.type(t.$('#palQ'), 'tags');
      await t.settle();
      t.ok(
        t.$$('#palList .pal-item').some((i) => i.textContent.includes('Settings › Tags')),
        'palette place',
      );
      t.key(t.$('#palQ'), 'Escape');
      await t.settle();
      t.ok(t.H.closed, 'palette closed');
      await t.open('newtab');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.click(t.$('.set-tab[data-tab="backup"]'));
      await t.settle();
      t.ok(t.$('#page').textContent.includes('JSON keeps sidebar order, categories, per-folder sort, tags and link notes.'), 'backup text');
    },
  },
];
