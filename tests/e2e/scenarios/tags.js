import { base, SAMPLE_ENV_RULES } from '../fixtures.js';

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
      t.key(t.d.body, 'k', { metaKey: true });
      await t.settle();
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
      t.eq(t.toast()?.firstChild.textContent, 'Imported 1 tag, 2 labels and 0 sites', 'toast counts the tag');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      t.eq(t.settings().customTags, [QA], 'Undo removes the new tag');
      t.eq(t.settings().envRules, [{ pattern: 'stage.shop.example.com', env: 'QA' }], 'Undo restores labels');
    },
  },
];
