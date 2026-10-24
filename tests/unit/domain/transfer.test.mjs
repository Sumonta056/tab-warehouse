import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectEnv } from '../../../extension/domain/env.js';
import { cleanImport, exportData, netscapeHtml, parseJson, backupName, addTags } from '../../../extension/domain/transfer.js';

describe('cleanImport', () => {
  test('drops bad env rules, host rows and folder prefs that would break rendering', () => {
    const r = cleanImport({
      sections: [],
      preferences: {
        envRules: [{ pattern: 5, env: 'PROD' }, { pattern: ' Prod.Example ', env: 'PROD' }, { pattern: 'x', env: 'NOPE' }, null, 'str'],
        hostMap: [{ PROD: 'a.com', TEST: 7, STAGE: ' ', evil: 'x' }, { TEST: 3 }, null],
        folders: { A: { sort: 'toString', view: 'matrix', show: 1, closed: { s1: true, s2: 'yes' } }, B: 'bad' },
        order: ['A', 3, null],
        categories: [{ name: ' Ops ', closed: 'yes', folders: ['A', 9] }, { name: '' }, { closed: true }],
        showFavicons: 'true',
      },
    });
    assert.deepEqual(r.preferences.envRules, [{ pattern: 'prod.example', env: 'PROD' }]);
    assert.deepEqual(r.preferences.hostMap, [{ PROD: 'a.com' }]);
    assert.deepEqual(r.preferences.folders, { A: { view: 'matrix', closed: { s1: true } } });
    assert.deepEqual(r.preferences.order, ['A']);
    assert.deepEqual(r.preferences.categories, [{ name: 'Ops', closed: false, folders: ['A'] }]);
    assert.equal('showFavicons' in r.preferences, false);
    assert.doesNotThrow(() => detectEnv({ title: 't', url: 'https://prod.example/x' }, r.preferences.envRules));
  });
  test('keeps board.group only when it is cat or flat', () => {
    const pick = (board) => cleanImport({ sections: [], preferences: { board } }).preferences.board;
    assert.deepEqual(pick({ group: 'flat', evil: 1 }), { group: 'flat' });
    assert.deepEqual(pick({ group: 'cat' }), { group: 'cat' });
    assert.equal(pick({ group: 'grid' }), undefined);
    assert.equal(pick({ group: 1 }), undefined);
    assert.equal(pick('flat'), undefined);
    assert.equal(pick(undefined), undefined);
  });
  test('keeps only sections and links with string titles and URLs', () => {
    const r = cleanImport({
      sections: [
        {
          title: 'Ops',
          unsorted: 'yes',
          links: [{ title: 'ok', url: 'https://a.com' }, { url: 9 }, { title: 3, url: 'https://b.com' }, null],
          parts: [{ title: 'P', links: [{ url: 'https://c.com' }] }, { title: 1 }],
        },
        { title: 7, links: [] },
        null,
      ],
      preferences: 'nope',
    });
    assert.deepEqual(r, {
      sections: [
        {
          title: 'Ops',
          unsorted: false,
          links: [
            { title: 'ok', url: 'https://a.com' },
            { title: '', url: 'https://b.com' },
          ],
          parts: [{ title: 'P', links: [{ title: '', url: 'https://c.com' }] }],
        },
      ],
      preferences: null,
    });
  });
});

describe('cleanImport: custom tags', () => {
  const prefs = (p) => cleanImport({ sections: [], preferences: p }).preferences;

  test('keeps valid custom tags through cleanTags', () => {
    const p = prefs({
      customTags: [{ name: 'qa', plain: ' QA team ', color: 'pink' }, { name: 'PROD', color: 'red' }, { name: 'UAT', color: 'orange' }, 'bad'],
    });
    assert.deepEqual(p.customTags, [
      { name: 'QA', plain: 'QA team', color: 'pink' },
      { name: 'UAT', plain: '', color: 'teal' },
    ]);
  });
  test('accepts labels and site columns for imported tags, drops unknown tags', () => {
    const p = prefs({
      customTags: [{ name: 'QA', plain: '', color: 'pink' }],
      envRules: [
        { pattern: 'qa.example.com', env: 'QA' },
        { pattern: 'uat.example.com', env: 'UAT' },
        { pattern: 'shop.example.com', env: 'PROD' },
      ],
      hostMap: [{ PROD: 'shop.example.com', QA: 'qa.example.com', UAT: 'uat.example.com' }, { UAT: 'only.example.com' }],
    });
    assert.deepEqual(p.envRules, [
      { pattern: 'qa.example.com', env: 'QA' },
      { pattern: 'shop.example.com', env: 'PROD' },
    ]);
    assert.deepEqual(p.hostMap, [{ PROD: 'shop.example.com', QA: 'qa.example.com' }]);
  });
  test('an old backup without customTags imports as before', () => {
    const p = prefs({
      envRules: [
        { pattern: 'qa.example.com', env: 'QA' },
        { pattern: 'test.', env: 'TEST' },
      ],
      hostMap: [{ QA: 'q.example.com' }],
    });
    assert.equal('customTags' in p, false);
    assert.deepEqual(p.envRules, [{ pattern: 'test.', env: 'TEST' }]);
    assert.deepEqual(p.hostMap, []);
  });
});

describe('cleanImport: link notes and priority', () => {
  test('keeps a valid note and priority on each link, drops bad ones', () => {
    const r = cleanImport({
      sections: [
        {
          title: 'A',
          links: [
            { title: 'x', url: 'https://x.com/', note: ' check QA ', pri: 'high' },
            { title: 'y', url: 'https://y.com/', note: 7, pri: 'urgent' },
          ],
          parts: [{ title: 'S', links: [{ title: 'z', url: 'https://z.com/', pri: 'low' }] }],
        },
      ],
    });
    assert.deepEqual(r.sections[0].links, [
      { title: 'x', url: 'https://x.com/', note: 'check QA', pri: 'high' },
      { title: 'y', url: 'https://y.com/' },
    ]);
    assert.deepEqual(r.sections[0].parts[0].links, [{ title: 'z', url: 'https://z.com/', pri: 'low' }]);
  });
  test('keeps a valid due date on each link, drops a bad one', () => {
    const r = cleanImport({
      sections: [
        {
          title: 'A',
          links: [
            { title: 'x', url: 'https://x.com/', due: '2026-04-10T10:00' },
            { title: 'y', url: 'https://y.com/', due: '2026-02-30' },
          ],
        },
      ],
    });
    assert.deepEqual(r.sections[0].links, [
      { title: 'x', url: 'https://x.com/', due: '2026-04-10T10:00' },
      { title: 'y', url: 'https://y.com/' },
    ]);
  });
});

const ROOT = { id: '10', title: 'My Links' };
const SECS = [
  {
    id: '30',
    title: 'Shop & <API>',
    links: [{ id: '31', title: 'Shop "PROD"', url: 'https://shop.example.com/?a=1&b=2', dateAdded: 1700000000000 }],
    parts: [{ id: '35', title: 'Blocked', links: [{ id: '36', title: 'Old', url: 'https://tracker.example.com/1', dateAdded: 1700000005000 }] }],
  },
  { id: '40', title: 'Docs', links: [], parts: [] },
  {
    id: 'unsorted:10',
    title: 'Unsorted',
    virtual: true,
    links: [{ id: '60', title: 'Loose', url: 'https://loose.example.com/', dateAdded: 1700000009000 }],
    parts: [],
  },
];
const SETTINGS = {
  order: ['40', '30', 'gone'],
  folders: { 30: { sort: 'name' }, gone: { sort: 'url' } },
  categories: [{ id: 'c1', name: 'Work', closed: true }],
  folderCat: { 30: 'c1', gone: 'c1' },
  customTags: [{ name: 'QA', plain: 'QA team', color: 'teal' }],
  envRules: [{ pattern: 'qa.', env: 'QA' }],
  hostMap: [{ PROD: 'shop.example.com', QA: 'qa.shop.example.com' }],
  showFavicons: true,
  board: { group: 'flat' },
};

describe('exportData', () => {
  test('writes folders by title, links with their note/priority/due, and the preferences', () => {
    const d = exportData(ROOT, SECS, SETTINGS, { 31: { note: 'n', pri: 'high' }, 36: { due: '2026-11-01' } });
    assert.equal(d.format, 'sumonta-warehouse');
    assert.equal(d.root, 'My Links');
    assert.deepEqual(d.sections[0], {
      title: 'Shop & <API>',
      unsorted: false,
      links: [{ title: 'Shop "PROD"', url: 'https://shop.example.com/?a=1&b=2', dateAdded: 1700000000000, note: 'n', pri: 'high' }],
      parts: [{ title: 'Blocked', links: [{ title: 'Old', url: 'https://tracker.example.com/1', dateAdded: 1700000005000, due: '2026-11-01' }] }],
    });
    assert.equal(d.sections[2].unsorted, true);
    assert.deepEqual(d.preferences.order, ['Docs', 'Shop & <API>'], 'ids become titles, unknown ids drop');
    assert.deepEqual(d.preferences.folders, { 'Shop & <API>': { sort: 'name' } });
    assert.deepEqual(d.preferences.categories, [{ name: 'Work', closed: true, folders: ['Shop & <API>'] }]);
    assert.deepEqual(d.preferences.customTags, SETTINGS.customTags);
    assert.deepEqual(d.preferences.board, { group: 'flat' });
  });

  test('round-trips through parseJson', () => {
    const back = parseJson(JSON.stringify(exportData(ROOT, SECS, SETTINGS, { 31: { note: 'n' } })));
    assert.deepEqual(
      back.sections.map((s) => [s.title, s.unsorted, s.links.length, s.parts.length]),
      [
        ['Shop & <API>', false, 1, 1],
        ['Docs', false, 0, 0],
        ['Unsorted', true, 1, 0],
      ],
    );
    assert.equal(back.sections[0].links[0].note, 'n');
    assert.deepEqual(back.preferences.envRules, [{ pattern: 'qa.', env: 'QA' }]);
    assert.deepEqual(back.preferences.hostMap, [{ PROD: 'shop.example.com', QA: 'qa.shop.example.com' }]);
    assert.equal(back.preferences.showFavicons, true);
  });

  test('an old settings object without customTags or board still exports', () => {
    const d = exportData(ROOT, [], { ...SETTINGS, customTags: undefined, board: undefined }, {});
    assert.deepEqual(d.preferences.customTags, []);
    assert.deepEqual(d.preferences.board, { group: undefined });
  });
});

describe('parseJson', () => {
  test('refuses files that are not a Warehouse export', () => {
    assert.throws(() => parseJson('{"format":"other","sections":[]}'), /not a Warehouse export/);
    assert.throws(() => parseJson('{"format":"sumonta-warehouse"}'), /not a Warehouse export/);
    assert.throws(() => parseJson('null'), /not a Warehouse export/);
    assert.throws(() => parseJson('{oops'));
  });
});

describe('netscapeHtml', () => {
  const html = netscapeHtml(ROOT, SECS);
  test('is a Netscape bookmark file with the root as the top folder', () => {
    assert.ok(html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>'));
    assert.match(html, /<DT><H3>My Links<\/H3>/);
  });
  test('escapes titles and URLs', () => {
    assert.match(html, /<H3>Shop &amp; &lt;API&gt;<\/H3>/);
    assert.match(html, /HREF="https:\/\/shop.example.com\/\?a=1&amp;b=2"/);
    assert.match(html, />Shop &quot;PROD&quot;<\/A>/);
    assert.ok(!html.includes('<API>'));
  });
  test('nests sections inside their folder, writes ADD_DATE in seconds, and puts Unsorted links directly in the root', () => {
    const lines = html.split('\n');
    const at = (s) => lines.findIndex((l) => l.includes(s));
    assert.ok(at('<H3>Blocked</H3>') > at('<H3>Shop &amp;'));
    assert.match(lines[at('>Old</A>')], /^ {16}<DT><A HREF="https:\/\/tracker.example.com\/1" ADD_DATE="1700000005">/);
    assert.match(lines[at('>Loose</A>')], /^ {8}<DT>/);
    assert.ok(!html.includes('<H3>Unsorted</H3>'));
  });
});

describe('backupName and addTags', () => {
  test('backupName is warehouse-<date>.<ext>', () => {
    assert.match(backupName('json'), /^warehouse-\d{4}-\d{2}-\d{2}\.json$/);
  });
  test('addTags keeps local tags and adds only new names', () => {
    assert.deepEqual(
      addTags(
        [{ name: 'QA', color: 'pink' }],
        [
          { name: 'QA', color: 'teal' },
          { name: 'UAT', color: 'red' },
        ],
      ),
      [
        { name: 'QA', color: 'pink' },
        { name: 'UAT', color: 'red' },
      ],
    );
    assert.deepEqual(addTags(undefined, [{ name: 'QA' }]), [{ name: 'QA' }]);
  });
});
