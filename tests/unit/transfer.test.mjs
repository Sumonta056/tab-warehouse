import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanImport } from '../../extension/lib/transfer.js';
import { imageSaveError, sortLinks, detectEnv } from '../../extension/lib/core.js';

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

describe('imageSaveError', () => {
  test('names a full storage', () => {
    assert.match(imageSaveError(new Error('Resource::kQuotaBytes quota exceeded')), /^Not enough storage space/);
  });
  test('falls back to the unreadable image message', () => {
    assert.equal(imageSaveError(new Error('The source image could not be decoded.')), 'That file is not an image the browser can read.');
    assert.equal(imageSaveError(undefined), 'That file is not an image the browser can read.');
  });
});

describe('sortLinks keeps input order for equal keys', () => {
  const links = [
    { id: 'a', index: 0, title: 'Same', url: 'https://x.com/p' },
    { id: 'b', index: 1, title: 'same', url: 'https://y.com/p' },
    { id: 'c', index: 2, title: 'Same', url: 'https://z.com/p' },
  ];
  for (const sort of ['name', 'env']) {
    test(sort, () =>
      assert.deepEqual(
        sortLinks(links, sort, []).map((l) => l.id),
        ['a', 'b', 'c'],
      ),
    );
  }
  test('does not change the input array', () => {
    const copy = [...links].reverse();
    const before = copy.map((l) => l.id);
    sortLinks(copy, 'name', []);
    assert.deepEqual(
      copy.map((l) => l.id),
      before,
    );
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
});
