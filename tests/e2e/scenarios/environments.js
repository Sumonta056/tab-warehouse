import { base } from '../fixtures.js';

const area = 'environments';
const empty = () => base({ settings: { envRules: [], hostMap: [] } });
const openEnv = async (t) => {
  t.click(t.$('#settingsBtn'));
  await t.settle();
  t.click(t.$('.set-tab[data-tab="env"]'));
};
const ruleRows = (t) => t.$$('#envLabels .env-rule[data-i]');
const patterns = (t) => ruleRows(t).map((r) => r.querySelector('.env-in').value);
const tryIt = async (t, url) => {
  t.type(t.$('#envTry'), url);
  await t.sleep(20);
  return { badge: t.$('.env-result .badge').textContent, why: t.$('.env-result .why').textContent };
};
const submit = (form) => form.dispatchEvent(new form.ownerDocument.defaultView.Event('submit', { bubbles: true, cancelable: true }));

export default [
  {
    area,
    name: 'environments: a fresh install has no labels or sites; the page explains itself and Try it says so',
    page: 'newtab',
    fixture: () => base({ settings: { envRules: undefined, hostMap: undefined } }),
    async run(t) {
      await openEnv(t);
      t.eq(t.settings().envRules ?? [], [], 'no default labels');
      t.ok(t.$('.env-intro h3')?.textContent === 'What is this?', 'explanation card');
      t.eq(
        t.$$('.env-legend .badge').map((b) => b.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'legend shows all labels',
      );
      t.ok(t.$('.env-legend').textContent.includes('Live — the real site'), 'plain-language names');
      t.eq(ruleRows(t).length, 0, 'no label rows');
      t.ok(t.$('#envLabels .env-empty')?.textContent.startsWith('No labels yet.'), 'labels empty state');
      t.ok(t.$('#envSites .env-empty')?.textContent.startsWith('No sites yet.'), 'sites empty state');
      const r = await tryIt(t, 'https://test.shop.example.com/cart');
      t.eq([r.badge, r.why], ['No label', 'There are no labels yet.'], 'Try it with no labels');
      t.ok(t.$('.env-others').textContent.includes('Fill in step 2'), 'hint for step 2');
    },
  },
  {
    area,
    name: 'environments: Add examples fills both lists and Try it shows the label, the matching rule and the other versions',
    page: 'newtab',
    fixture: empty,
    async run(t) {
      await openEnv(t);
      t.click(t.$$('#envLabels .env-empty button')[0]);
      await t.settle();
      t.click(t.$$('#envSites .env-empty button')[0]);
      await t.settle();
      t.eq(
        t.settings().envRules.map((r) => r.pattern),
        ['localhost', 'staging.', 'test.', 'shop.example.com'],
        'example labels saved',
      );
      t.eq(t.settings().hostMap.length, 1, 'example site saved');
      let r = await tryIt(t, 'https://test.shop.example.com/cart');
      t.eq([r.badge, r.why], ['TEST', 'Label 3 matched: the address contains “test.”.'], 'TEST via rule 3');
      const others = t.$$('.env-other').map((o) => [o.querySelector('.badge').textContent, o.querySelector('.u')?.textContent]);
      t.eq(
        others,
        [
          ['PROD', 'https://shop.example.com/cart'],
          ['STAGE', 'https://staging.shop.example.com/cart'],
          ['LOCAL', 'http://localhost:3000/cart'],
        ],
        'same page in the other versions',
      );
      t.click(t.$$('.env-samples .chip').find((b) => b.textContent === 'news.example.org'));
      t.eq(t.$('.env-result .why').textContent, 'No label matches this address.', 'sample chip without a match');
      t.ok(t.$('.env-others').textContent.includes('not in step 2'), 'site not in the table');
    },
  },
  {
    area,
    name: 'environments: add, edit and remove a label (with Undo); a pasted full address becomes its host',
    page: 'newtab',
    fixture: empty,
    async run(t) {
      await openEnv(t);
      t.type(t.$('#envAddPattern'), 'https://QA.Example.com/some/page');
      const sel = t.$('#envLabels .env-rule.add select');
      sel.value = 'STAGE';
      sel.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      submit(t.$('#envLabels .env-rule.add'));
      await t.settle();
      t.eq(t.settings().envRules, [{ pattern: 'qa.example.com', env: 'STAGE' }], 'added as host, lower case');
      t.eq(t.d.activeElement, t.$('#envAddPattern'), 'focus back in the add box');
      t.ok(t.$('#envLabels h3').textContent.includes('Labels (1)'), 'count updated');
      submit(t.$('#envLabels .env-rule.add'));
      await t.settle();
      t.eq(t.settings().envRules.length, 1, 'empty add does nothing');
      const row = ruleRows(t)[0];
      const rsel = row.querySelector('select');
      rsel.value = 'PROD';
      rsel.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      t.ok(rsel.classList.contains('PROD'), 'select takes the label color');
      t.type(row.querySelector('.env-in'), 'qa.');
      await t.settle();
      t.eq(t.settings().envRules, [{ pattern: 'qa.', env: 'PROD' }], 'edited');
      t.click(row.querySelector('.x'));
      await t.settle();
      t.eq(t.settings().envRules, [], 'removed');
      t.ok(t.toast()?.textContent.startsWith('Removed label'), 'toast');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      t.eq(t.settings().envRules, [{ pattern: 'qa.', env: 'PROD' }], 'Undo restores');
      t.type(ruleRows(t)[0].querySelector('.env-in'), '  ');
      await t.settle();
      t.eq(t.settings().envRules, [], 'clearing the text removes the label');
    },
  },
  {
    area,
    name: 'environments: reorder labels with Alt+arrows and drag; the first match wins',
    page: 'newtab',
    fixture: () =>
      base({
        settings: {
          envRules: [
            { pattern: 'shop', env: 'PROD' },
            { pattern: 'test.', env: 'TEST' },
            { pattern: 'local', env: 'LOCAL' },
          ],
          hostMap: [],
        },
      }),
    async run(t) {
      await openEnv(t);
      t.eq((await tryIt(t, 'https://test.shop.example.com')).badge, 'PROD', 'rule 1 wins');
      t.key(ruleRows(t)[1].querySelector('.env-in'), 'ArrowUp', { altKey: true });
      await t.settle();
      t.eq(patterns(t), ['test.', 'shop', 'local'], 'Alt+↑ moved it up');
      t.eq(t.d.activeElement, ruleRows(t)[0].querySelector('.env-in'), 'focus follows the row');
      t.eq((await tryIt(t, 'https://test.shop.example.com')).badge, 'TEST', 'new first match wins');
      t.key(ruleRows(t)[0].querySelector('.env-in'), 'ArrowUp', { altKey: true });
      t.eq(patterns(t), ['test.', 'shop', 'local'], 'top row cannot move up');
      t.drag(ruleRows(t)[0].querySelector('.grip'), ruleRows(t)[2], 'after');
      await t.settle();
      t.eq(patterns(t), ['shop', 'local', 'test.'], 'drag after the last row');
      t.drag(ruleRows(t)[2].querySelector('.grip'), ruleRows(t)[0], 'before');
      await t.settle();
      t.eq(patterns(t), ['test.', 'shop', 'local'], 'drag before the first row');
      t.eq(
        t.settings().envRules.map((r) => r.pattern),
        ['test.', 'shop', 'local'],
        'order saved',
      );
    },
  },
  {
    area,
    name: 'environments: add, edit and remove a site (with Undo); Try it uses it',
    page: 'newtab',
    fixture: empty,
    async run(t) {
      await openEnv(t);
      submit(t.$('#envSites .env-site.add'));
      await t.settle();
      t.eq(t.settings().hostMap, [], 'all-empty add does nothing');
      t.type(t.$('#envAddPROD'), 'app.example.com');
      t.type(t.$('#envAddLOCAL'), 'http://localhost:5000/');
      submit(t.$('#envSites .env-site.add'));
      await t.settle();
      t.eq(t.settings().hostMap, [{ PROD: 'app.example.com', TEST: '', STAGE: '', LOCAL: 'localhost:5000' }], 'added; full address cleaned');
      const cells = t.$$('#envSites .env-site[data-i] .env-in');
      t.type(cells[1], 'test.app.example.com');
      await t.settle();
      t.eq(t.settings().hostMap[0].TEST, 'test.app.example.com', 'edited');
      await tryIt(t, 'https://app.example.com/x?y=1');
      const others = t.$$('.env-other').map((o) => o.querySelector('.u')?.textContent || o.textContent);
      t.eq(others, ['https://test.app.example.com/x?y=1', 'STAGENot set in step 2', 'http://localhost:5000/x?y=1'], 'other versions from the site row');
      t.click(t.$('#envSites .env-site[data-i] .x'));
      await t.settle();
      t.eq(t.settings().hostMap, [], 'removed');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      t.eq(t.settings().hostMap.length, 1, 'Undo restores');
    },
  },
  {
    area,
    name: 'environments: Copy writes both lists as text; Import replaces them with Undo; bad text changes nothing',
    page: 'newtab',
    fixture: () => base({ settings: { envRules: [{ pattern: 'old.', env: 'TEST' }], hostMap: [] } }),
    async run(t) {
      await openEnv(t);
      t.click(t.$('#envCopy'));
      await t.until(() => t.toast(), 'copy toast');
      t.ok(t.$('#envText').value.includes('old. TEST'), 'text has the labels');
      t.ok(t.$('#envText').value.includes('# Same site in each version'), 'text has the sites header');
      t.type(t.$('#envText'), 'only nonsense here');
      t.click(t.$('#envImport'));
      await t.settle();
      t.eq(t.settings().envRules, [{ pattern: 'old.', env: 'TEST' }], 'bad text imports nothing');
      t.ok(t.toast()?.textContent.startsWith('Nothing to import'), 'says why');
      t.type(t.$('#envText'), '# Labels\nlocalhost LOCAL\nqa. stage\nbroken line here\n\n# Sites\nshop.example.com - - localhost:3000');
      t.click(t.$('#envImport'));
      await t.settle();
      t.eq(
        t.settings().envRules,
        [
          { pattern: 'localhost', env: 'LOCAL' },
          { pattern: 'qa.', env: 'STAGE' },
        ],
        'labels replaced',
      );
      t.eq(t.settings().hostMap, [{ PROD: 'shop.example.com', TEST: '', STAGE: '', LOCAL: 'localhost:3000' }], 'sites replaced');
      t.eq(t.toast()?.firstChild.textContent, 'Imported 2 labels and 1 site. Skipped 1 line that could not be read', 'toast counts');
      t.eq(patterns(t), ['localhost', 'qa.'], 'rows redrawn');
      t.click(t.toast().querySelector('button'));
      await t.settle();
      t.eq(t.settings().envRules, [{ pattern: 'old.', env: 'TEST' }], 'Undo restores labels');
      t.eq(t.settings().hostMap, [], 'Undo restores sites');
    },
  },
  {
    area,
    name: 'environments: a label added in settings shows on the folder page',
    page: 'newtab',
    fixture: empty,
    async run(t) {
      await t.folder('Shop API');
      t.eq(
        t.$$('#page .row .badge').map((b) => b.textContent),
        ['PROD', 'TEST', 'STAGE', 'LOCAL'],
        'only title words without labels',
      );
      await openEnv(t);
      t.type(t.$('#envAddPattern'), 'shop');
      const sel = t.$('#envLabels .env-rule.add select');
      sel.value = 'STAGE';
      sel.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      submit(t.$('#envLabels .env-rule.add'));
      await t.settle();
      t.click(t.$('.set-done'));
      await t.settle();
      t.eq(
        t.$$('#page .row .badge').map((b) => b.textContent),
        ['STAGE', 'STAGE', 'STAGE', 'LOCAL'],
        'label rule wins over title words; others keep their title word',
      );
    },
  },
];
