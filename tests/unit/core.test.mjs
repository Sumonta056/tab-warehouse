import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENVS,
  DEFAULT_HOME,
  SIDE_WIDTH,
  explainEnv,
  envText,
  parseEnvText,
  hostOf,
  pathKey,
  displayUrl,
  isGithub,
  sameAsUrl,
  detectEnv,
  deriveUrl,
  findById,
  findFolderByTitle,
  resolveRoot,
  flatten,
  folderList,
  sections,
  sortLinks,
  buildMatrix,
  googleIcon,
  normalizeUrl,
  clampSideWidth,
  clockText,
  msToNextTick,
  letterIcon,
  loadSettings,
  saveSettings,
  THEMES,
  themeVars,
  DEFAULT_SIDE_LOOK,
  sideLookVars,
} from '../../lib/core.js';

const SAMPLE_ENV_RULES = [
  { pattern: 'localhost', env: 'LOCAL' },
  { pattern: '127.0.0.1', env: 'LOCAL' },
  { pattern: 'stage', env: 'STAGE' },
  { pattern: 'sandbox', env: 'TEST' },
  { pattern: 'test', env: 'TEST' },
  { pattern: '-dev', env: 'TEST' },
  { pattern: 'dev.', env: 'TEST' },
  { pattern: 'shop.example.com', env: 'PROD' },
  { pattern: 'api.example.com', env: 'PROD' },
  { pattern: 'www.example.com', env: 'PROD' },
  { pattern: 'console.aws.amazon.com', env: 'PROD' },
  { pattern: 'prod', env: 'PROD' },
];
const SAMPLE_HOST_MAP = [
  { PROD: 'shop.example.com', TEST: 'shop-test.example.com', STAGE: 'shop-stage.example.com', LOCAL: 'localhost:8080' },
  { PROD: 'api.example.com', TEST: 'api-test.example.com', STAGE: '', LOCAL: 'localhost:8080' },
  { PROD: 'www.example.com', TEST: 'test.example.com', STAGE: '', LOCAL: '' },
];

const L = (id, title, url, extra = {}) => ({ id, title, url, ...extra });
const F = (id, title, children = [], extra = {}) => ({ id, title, children, ...extra });

describe('URL helpers', () => {
  test('hostOf lowercases host and keeps port; bad URL gives empty string', () => {
    assert.equal(hostOf('https://Shop.example.com/x'), 'shop.example.com');
    assert.equal(hostOf('http://localhost:8080/a'), 'localhost:8080');
    assert.equal(hostOf('not a url'), '');
    assert.equal(hostOf(undefined), '');
  });
  test('pathKey is path + query, no host or hash', () => {
    assert.equal(pathKey('https://a.com/x/y?z=1#h'), '/x/y?z=1');
    assert.equal(pathKey('bad'), '');
  });
  test('displayUrl strips scheme and one trailing slash', () => {
    assert.equal(displayUrl('https://a.com/'), 'a.com');
    assert.equal(displayUrl('http://a.com/x/'), 'a.com/x');
    assert.equal(displayUrl('chrome://extensions'), 'chrome://extensions');
    assert.equal(displayUrl(null), '');
  });
  test('isGithub only for github.com', () => {
    assert.equal(isGithub('https://github.com/x'), true);
    assert.equal(isGithub('https://gist.github.com/x'), false);
  });
  test('sameAsUrl detects titles that repeat the URL', () => {
    assert.equal(sameAsUrl('', 'https://a.com/x'), true);
    assert.equal(sameAsUrl('a.com/x', 'https://a.com/x'), true);
    assert.equal(sameAsUrl('https://a.com/x/', 'https://a.com/x'), true);
    assert.equal(sameAsUrl('Shop', 'https://a.com/x'), false);
  });
  test('normalizeUrl adds https only when there is no scheme', () => {
    assert.equal(normalizeUrl('example.com'), 'https://example.com');
    assert.equal(normalizeUrl('  http://x.io  '), 'http://x.io');
    assert.equal(normalizeUrl('chrome://flags'), 'chrome://flags');
    assert.equal(normalizeUrl(''), '');
    assert.equal(normalizeUrl(null), '');
  });
});

describe('detectEnv', () => {
  const env = (url, title = '') => detectEnv({ url, title }, SAMPLE_ENV_RULES);
  test('host rules win in order', () => {
    assert.equal(env('http://localhost:3000'), 'LOCAL');
    assert.equal(env('http://127.0.0.1:5000'), 'LOCAL');
    assert.equal(env('https://shop-stage.example.com'), 'STAGE');
    assert.equal(env('https://shop-test.example.com'), 'TEST');
    assert.equal(env('https://api-dev.x.com'), 'TEST');
    assert.equal(env('https://shop.example.com/global'), 'PROD');
    assert.equal(env('https://deploy-green.prod.example.net'), 'PROD');
  });
  test('first matching rule wins (stage beats prod in the same host)', () => {
    assert.equal(env('https://stage.prod.example.com'), 'STAGE');
  });
  test('falls back to whole-word env in the title', () => {
    assert.equal(env('https://example.com', 'Dashboard PROD'), 'PROD');
    assert.equal(env('https://example.com', 'my test page'), 'TEST');
    assert.equal(env('https://example.com', 'DEV box'), 'TEST');
    assert.equal(env('https://example.com', 'production'), '');
  });
  test('no match gives empty string', () => {
    assert.equal(env('https://github.com/x', 'Repo'), '');
  });
  test('custom rules are honoured and case-insensitive on pattern', () => {
    assert.equal(detectEnv({ url: 'https://qa.example.org' }, [{ pattern: 'QA.', env: 'TEST' }]), 'TEST');
  });
});

describe('deriveUrl', () => {
  test('swaps host and keeps path + query', () => {
    assert.equal(deriveUrl('https://shop.example.com/a/b?c=1', 'TEST', SAMPLE_HOST_MAP), 'https://shop-test.example.com/a/b?c=1');
  });
  test('localhost target switches to http', () => {
    assert.equal(deriveUrl('https://shop.example.com/a', 'LOCAL', SAMPLE_HOST_MAP), 'http://localhost:8080/a');
  });
  test('missing target host gives null', () => {
    assert.equal(deriveUrl('https://api.example.com/a', 'STAGE', SAMPLE_HOST_MAP), null);
  });
  test('unknown host gives null', () => {
    assert.equal(deriveUrl('https://unknown.com/a', 'TEST', SAMPLE_HOST_MAP), null);
  });
});

describe('bookmark tree helpers', () => {
  const tree = F('0', '', [
    F('1', 'Bookmarks bar', [
      F('10', 'My Links', [
        F('11', 'Shop API', [L('111', 'a', 'https://a.com')]),
        F('12', 'Tasks', [L('121', 'b', 'https://b.com'), F('122', 'Blocked', [L('1221', 'c', 'https://c.com')])]),
        L('13', 'loose', 'https://loose.com'),
      ]),
    ]),
    F('2', 'Other bookmarks', []),
  ]);
  test('findById and findFolderByTitle', () => {
    assert.equal(findById(tree, '122').title, 'Blocked');
    assert.equal(findById(tree, 'nope'), null);
    assert.equal(findFolderByTitle(tree, 'My Links').id, '10');
    assert.equal(findFolderByTitle(tree, 'a'), null);
  });
  test('resolveRoot: id first, then name, then first child', () => {
    assert.equal(resolveRoot(tree, { rootId: '12', rootName: 'My Links' }).id, '12');
    assert.equal(resolveRoot(tree, { rootId: 'gone', rootName: 'My Links' }).id, '10');
    assert.equal(resolveRoot(tree, { rootId: null, rootName: 'Missing' }).id, '1');
  });
  test('resolveRoot with fresh-install settings (no root name) uses the first top-level folder', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    assert.equal(resolveRoot(tree, await loadSettings()).id, '1');
  });
  test('flatten gives every link with its folder path', () => {
    const r = flatten(findById(tree, '10'));
    assert.deepEqual(
      r.map((x) => [x.id, x.path]),
      [
        ['111', 'Shop API'],
        ['121', 'Tasks'],
        ['1221', 'Tasks › Blocked'],
        ['13', ''],
      ],
    );
  });
  test('folderList gives nested folders with depth', () => {
    assert.deepEqual(
      folderList(findById(tree, '10')).map((f) => [f.title, f.depth]),
      [
        ['Shop API', 0],
        ['Tasks', 0],
        ['Blocked', 1],
      ],
    );
  });
});

describe('sections()', () => {
  const root = F('10', 'Root', [
    F('a', 'A', [L('a1', 'x', 'https://x.com')], { index: 0 }),
    F('b', 'B', [L('b1', 'y', 'https://y.com'), F('b2', 'Part', [L('b21', 'z', 'https://z.com')])], { index: 1 }),
    F('c', 'C', [], { index: 2 }),
    L('l1', 'loose', 'https://l.com'),
  ]);
  test('saved order first, unknown folders appended in tree order, Unsorted last', () => {
    const s = sections(root, ['c', 'a']);
    assert.deepEqual(
      s.map((x) => x.id),
      ['c', 'a', 'b', 'unsorted:10'],
    );
    assert.equal(s.at(-1).virtual, true);
  });
  test('no loose links means no Unsorted section', () => {
    const s = sections(F('r', 'R', [F('a', 'A', [])]), []);
    assert.equal(
      s.some((x) => x.virtual),
      false,
    );
  });
  test('parts are direct subfolders; all = direct links + part links', () => {
    const b = sections(root, []).find((x) => x.id === 'b');
    assert.deepEqual(
      b.links.map((x) => x.id),
      ['b1'],
    );
    assert.deepEqual(
      b.parts.map((x) => [x.id, x.title, x.links.length]),
      [['b2', 'Part', 1]],
    );
    assert.deepEqual(
      b.all.map((x) => x.id),
      ['b1', 'b21'],
    );
  });
  test('hidden ids are excluded (Home folder never becomes a sidebar section)', () => {
    assert.deepEqual(
      sections(root, [], ['b']).map((x) => x.id),
      ['a', 'c', 'unsorted:10'],
    );
  });
  test('Unsorted has empty parts and all = loose links', () => {
    const u = sections(root, []).at(-1);
    assert.deepEqual(u.parts, []);
    assert.deepEqual(
      u.all.map((x) => x.id),
      ['l1'],
    );
  });
});

describe('sortLinks', () => {
  const links = [
    L('1', 'Beta', 'https://b.com/2', { index: 2, dateAdded: 10 }),
    L('2', 'alpha', 'https://shop-test.example.com/1', { index: 0, dateAdded: 30 }),
    L('3', 'Gamma', 'http://localhost:8080/1', { index: 1, dateAdded: 20 }),
    L('4', 'item 10', 'https://a.com/10', { index: 3, dateAdded: 5 }),
    L('5', 'item 9', 'https://a.com/9', { index: 4, dateAdded: 1 }),
  ];
  const ids = (sort) => sortLinks(links, sort, SAMPLE_ENV_RULES).map((x) => x.id);
  test('manual = Chrome index', () => assert.deepEqual(ids('manual'), ['2', '3', '1', '4', '5']));
  test('name is case-insensitive and numeric-aware', () => assert.deepEqual(ids('name'), ['2', '1', '3', '5', '4']));
  test('date added = newest first', () => assert.deepEqual(ids('added'), ['2', '3', '1', '4', '5']));
  test('env = PROD, TEST, STAGE, LOCAL, then none', () => {
    const r = sortLinks(links, 'env', SAMPLE_ENV_RULES).map((x) => detectEnv(x, SAMPLE_ENV_RULES));
    assert.deepEqual(r.slice(0, 2), ['TEST', 'LOCAL']);
    assert.deepEqual(r.slice(2), ['', '', '']);
  });
  test('host then path', () => assert.deepEqual(ids('host').slice(0, 2), ['5', '4']));
  test('does not mutate the input array', () => {
    const before = links.map((x) => x.id);
    sortLinks(links, 'name', SAMPLE_ENV_RULES);
    assert.deepEqual(
      links.map((x) => x.id),
      before,
    );
  });
});

describe('buildMatrix', () => {
  test('groups the same path across envs; no-env links go to rest', () => {
    const { rows, rest } = buildMatrix(
      [L('1', 'p', 'https://shop.example.com/api/x?q=1'), L('2', 't', 'https://shop-test.example.com/api/x'), L('3', 'n', 'https://github.com/a')],
      SAMPLE_ENV_RULES,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].key, '/api/x');
    assert.equal(rows[0].cells.PROD.length, 1);
    assert.equal(rows[0].cells.TEST.length, 1);
    assert.deepEqual(
      rest.map((x) => x.id),
      ['3'],
    );
  });
});

describe('Home helpers', () => {
  test('googleIcon maps Google apps by host and Docs by path', () => {
    assert.match(googleIcon('https://mail.google.com/mail/u/0/#inbox'), /gmail_2020q4_48dp\.png$/);
    assert.match(googleIcon('https://drive.google.com/drive/u/0/my-drive'), /drive_/);
    assert.match(googleIcon('https://calendar.google.com/'), /calendar_/);
    assert.match(googleIcon('https://keep.google.com/u/0/#home'), /keep_/);
    assert.match(googleIcon('https://meet.google.com/abc'), /meet_/);
    assert.match(googleIcon('https://docs.google.com/spreadsheets/d/1'), /sheets_/);
    assert.match(googleIcon('https://docs.google.com/presentation/d/1'), /slides_/);
    assert.match(googleIcon('https://docs.google.com/forms/d/1'), /forms_/);
    assert.match(googleIcon('https://docs.google.com/document/d/1'), /docs_/);
    assert.match(googleIcon('https://docs.google.com/'), /docs_/);
  });
  test('googleIcon is null for everything else', () => {
    assert.equal(googleIcon('https://www.google.com/'), null);
    assert.equal(googleIcon('https://gemini.google.com/app'), null);
    assert.equal(googleIcon('https://github.com'), null);
    assert.equal(googleIcon('bad'), null);
  });
  test('clampSideWidth keeps 180..440 and falls back on junk', () => {
    assert.equal(clampSideWidth(100), SIDE_WIDTH.min);
    assert.equal(clampSideWidth(9999), SIDE_WIDTH.max);
    assert.equal(clampSideWidth(300.6), 301);
    assert.equal(clampSideWidth('abc'), SIDE_WIDTH.initial);
    assert.equal(clampSideWidth(undefined), SIDE_WIDTH.initial);
  });
  test('clockText 12h / 24h / seconds', () => {
    const d = new Date(2026, 9, 22, 19, 4, 7);
    assert.equal(clockText(d, { h24: false, seconds: true }), '7:04:07');
    assert.equal(clockText(d, { h24: true, seconds: true }), '19:04:07');
    assert.equal(clockText(d, { h24: false, seconds: false }), '7:04');
    assert.equal(clockText(new Date(2026, 0, 1, 0, 5, 0), { h24: false, seconds: false }), '12:05');
    assert.equal(clockText(new Date(2026, 0, 1, 12, 0, 0), { h24: false, seconds: false }), '12:00');
    assert.equal(clockText(new Date(2026, 0, 1, 9, 0, 0), { h24: true, seconds: false }), '09:00');
  });
  test('msToNextTick aligns to the next second or minute', () => {
    const d = new Date(2026, 0, 1, 10, 0, 42, 250);
    assert.equal(msToNextTick(d, true), 750);
    assert.equal(msToNextTick(d, false), 17750);
  });
  test('DEFAULT_HOME carries the Bonjourr-derived defaults', () => {
    assert.equal(DEFAULT_HOME.color, '#185a63');
    assert.equal(DEFAULT_HOME.dark, 65);
    assert.equal(DEFAULT_HOME.perRow, 12);
    assert.equal(DEFAULT_HOME.seconds, true);
    assert.equal(DEFAULT_HOME.h24, false);
    assert.equal(DEFAULT_HOME.newTab, false);
  });
});

describe('settings storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => ({ [k]: store[k] }),
          set: async (o) => {
            Object.assign(store, JSON.parse(JSON.stringify(o)));
          },
        },
      },
    };
  });
  test('fresh install returns all defaults', async () => {
    const s = await loadSettings();
    assert.deepEqual(s.categories, []);
    assert.deepEqual(s.folderCat, {});
    assert.deepEqual(s.partColors, {});
    assert.equal(s.sideWidth, SIDE_WIDTH.initial);
    assert.deepEqual(s.home, DEFAULT_HOME);
    assert.deepEqual(s.envRules, [], 'no default labels');
    assert.deepEqual(s.hostMap, [], 'no default sites');
  });
  test('saveSettings merges a patch and keeps other keys', async () => {
    await saveSettings({ order: ['a'] });
    await saveSettings({ sideWidth: 300 });
    const s = await loadSettings();
    assert.deepEqual(s.order, ['a']);
    assert.equal(s.sideWidth, 300);
  });
  test('old stored home object without new keys still gets defaults', async () => {
    store.settings = { home: { color: '#000000' } };
    const s = await loadSettings();
    assert.equal(s.home.color, '#000000');
    assert.equal(s.home.perRow, DEFAULT_HOME.perRow);
  });
  test('ENVS order is fixed (CSS depends on it)', () => {
    assert.deepEqual(ENVS, ['PROD', 'TEST', 'STAGE', 'LOCAL']);
  });
});

describe('themes', () => {
  test('preset sets all four accent tokens; unknown or empty falls back to blue', () => {
    assert.deepEqual(themeVars('green'), { '--accent': '#6fd99a', '--accent-bg': '#143122', '--accent-text': '#cdf5dc', '--accent-ink': '#06200f' });
    assert.deepEqual(themeVars('nope'), themeVars('blue'));
    assert.deepEqual(themeVars(undefined), themeVars('blue'));
    assert.equal(Object.keys(THEMES).length, 7);
  });
  test('custom hex derives tokens; ink is dark on light colors and white on dark colors', () => {
    const v = themeVars('#ff00aa');
    assert.equal(v['--accent'], '#ff00aa');
    assert.match(v['--accent-bg'], /color-mix/);
    assert.equal(themeVars('#ffff66')['--accent-ink'], '#111');
    assert.equal(themeVars('#202060')['--accent-ink'], '#fff');
    assert.deepEqual(themeVars('#ff00a'), themeVars('blue'));
  });
  test('loadSettings defaults theme to blue', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    assert.equal((await loadSettings()).theme, 'blue');
  });
});

describe('sidebar look', () => {
  test('loadSettings merges sideLook one level deep over the defaults', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({ settings: { sideLook: { mode: 'image' } } }) } } };
    assert.deepEqual((await loadSettings()).sideLook, { ...DEFAULT_SIDE_LOOK, mode: 'image' });
  });
  test('solid mode (or image mode without an image) is the plain color', () => {
    const solid = { '--side-color': '#1b1b1b', '--side-dark': '1', '--side-blur': '0px', '--side-img': 'none' };
    assert.deepEqual(sideLookVars(DEFAULT_SIDE_LOOK, 'data:x'), solid);
    assert.deepEqual(sideLookVars({ ...DEFAULT_SIDE_LOOK, mode: 'image' }, ''), solid);
  });
  test('image mode uses the image, darkness and blur', () => {
    assert.deepEqual(sideLookVars({ mode: 'image', color: '#102030', dark: 55, blur: 8 }, 'data:x'), {
      '--side-color': '#102030',
      '--side-dark': '0.55',
      '--side-blur': '8px',
      '--side-img': 'url("data:x")',
    });
  });
});

describe('environment labels: explain and text format', () => {
  test('explainEnv names the matching rule, or the title word, or nothing', () => {
    const rules = [
      { pattern: 'test.', env: 'TEST' },
      { pattern: 'shop.example.com', env: 'PROD' },
    ];
    assert.deepEqual(explainEnv({ url: 'https://test.shop.example.com/a' }, rules), { env: 'TEST', rule: 0 });
    assert.deepEqual(explainEnv({ url: 'https://shop.example.com/a' }, rules), { env: 'PROD', rule: 1 });
    assert.deepEqual(explainEnv({ url: 'https://x.org', title: 'Admin DEV' }, rules), { env: 'TEST', rule: -1, word: 'DEV' });
    assert.deepEqual(explainEnv({ url: 'https://x.org', title: '' }, []), { env: '', rule: -1 });
  });
  test('envText and parseEnvText round-trip both lists', () => {
    const rules = [
      { pattern: 'localhost', env: 'LOCAL' },
      { pattern: 'test.', env: 'TEST' },
    ];
    const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: 'localhost:3000' }];
    const text = envText(rules, map);
    assert.match(text, /^# Labels/);
    assert.ok(text.includes('shop.example.com test.shop.example.com - localhost:3000'));
    assert.deepEqual(parseEnvText(text), { rules, hostMap: map, skipped: 0 });
  });
  test('parseEnvText skips bad lines, ignores comments and blanks, lower-cases, accepts any order', () => {
    const p = parseEnvText('a.com B.COM - -\n# note\n\nFoo.com prod\nthis is bad\nx.com NOPE\n- - - -');
    assert.deepEqual(p.rules, [{ pattern: 'foo.com', env: 'PROD' }]);
    assert.deepEqual(p.hostMap, [{ PROD: 'a.com', TEST: 'b.com', STAGE: '', LOCAL: '' }]);
    assert.equal(p.skipped, 3);
    assert.deepEqual(parseEnvText(''), { rules: [], hostMap: [], skipped: 0 });
  });
});

describe('no built-in company or personal data', () => {
  test('fresh-install settings hold no company names, hosts or labels', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    const s = await loadSettings();
    assert.equal(s.rootName, '');
    assert.deepEqual([s.envRules, s.hostMap], [[], []]);
    assert.doesNotMatch(JSON.stringify(s), /acme\.no|shop|My Links|sumonta|gitbook|vercel/i);
  });
  test('letterIcon has no company special cases', () => {
    assert.equal(letterIcon({ url: 'https://shop.example.com/x', title: 'Shop API' }), 'La');
    assert.equal(letterIcon({ url: 'https://www.example.com/', title: 'News' }), 'Ne');
    assert.equal(letterIcon({ url: 'https://github.com/a', title: 'Repo' }), 'gh');
  });
});
