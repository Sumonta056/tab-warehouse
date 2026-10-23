import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENVS,
  brandName,
  clampFont,
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
  switchTargets,
  findById,
  findFolderByTitle,
  resolveRoot,
  flatten,
  folderList,
  sections,
  sortLinks,
  PRIS,
  PRI_NAMES,
  NOTE_MAX,
  cleanMeta,
  isDue,
  dueState,
  dueLabel,
  gcalUrl,
  priGroups,
  priFirst,
  matchLink,
  dupKey,
  searchLinks,
  xmlEscape,
  omniboxSuggestions,
  omniboxTarget,
  findDuplicates,
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
  DEFAULT_BOARD,
  sideLookVars,
  TAG_COLORS,
  tagNameError,
  cleanTags,
  tagNames,
  tagPlain,
} from '../../extension/lib/core.js';
import { commandLabel, shortcutKeys } from '../../extension/lib/core.js';

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
  { pattern: 'www.example.org', env: 'PROD' },
  { pattern: 'console.aws.amazon.com', env: 'PROD' },
  { pattern: 'prod', env: 'PROD' },
];
const SAMPLE_HOST_MAP = [
  { PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: 'stage.shop.example.com', LOCAL: 'localhost:8080' },
  { PROD: 'api.example.com', TEST: 'api-test.example.com', STAGE: '', LOCAL: 'localhost:8080' },
  { PROD: 'www.example.org', TEST: 'test.example.org', STAGE: '', LOCAL: '' },
];

const L = (id, title, url, extra = {}) => ({ id, title, url, ...extra });
const F = (id, title, children = [], extra = {}) => ({ id, title, children, ...extra });

describe('URL helpers', () => {
  test('hostOf lowercases host and keeps port; bad URL gives empty string', () => {
    assert.equal(hostOf('https://Shop.EXAMPLE.com/x'), 'shop.example.com');
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
    assert.equal(env('https://stage.shop.example.com'), 'STAGE');
    assert.equal(env('https://test.shop.example.com'), 'TEST');
    assert.equal(env('https://api-dev.x.com'), 'TEST');
    assert.equal(env('https://shop.example.com/global'), 'PROD');
    assert.equal(env('https://blue.prod.example.net'), 'PROD');
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
    assert.equal(detectEnv({ url: 'https://qa.example.io' }, [{ pattern: 'QA.', env: 'TEST' }]), 'TEST');
  });
});

describe('switchTargets', () => {
  test('lists the other versions of this page from its site row', () => {
    assert.deepEqual(switchTargets('https://shop.example.com/a/b?c=1#x', SAMPLE_HOST_MAP), {
      from: 'PROD',
      to: [
        { env: 'TEST', url: 'https://test.shop.example.com/a/b?c=1#x' },
        { env: 'STAGE', url: 'https://stage.shop.example.com/a/b?c=1#x' },
        { env: 'LOCAL', url: 'http://localhost:8080/a/b?c=1#x' },
      ],
    });
  });

  test('skips empty boxes; host case does not matter', () => {
    assert.deepEqual(switchTargets('https://WWW.example.org/x', SAMPLE_HOST_MAP), { from: 'PROD', to: [{ env: 'TEST', url: 'https://test.example.org/x' }] });
  });

  test('null when the site has no row or the URL is not valid', () => {
    assert.equal(switchTargets('https://example.com/', SAMPLE_HOST_MAP), null);
    assert.equal(switchTargets('not a url', SAMPLE_HOST_MAP), null);
    assert.equal(switchTargets('https://shop.example.com/', []), null);
  });
});

describe('deriveUrl', () => {
  test('swaps host and keeps path + query', () => {
    assert.equal(deriveUrl('https://shop.example.com/a/b?c=1', 'TEST', SAMPLE_HOST_MAP), 'https://test.shop.example.com/a/b?c=1');
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
        F('12', 'Sprint tasks', [L('121', 'b', 'https://b.com'), F('122', 'Blocked', [L('1221', 'c', 'https://c.com')])]),
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
        ['121', 'Sprint tasks'],
        ['1221', 'Sprint tasks › Blocked'],
        ['13', ''],
      ],
    );
  });
  test('folderList gives nested folders with depth', () => {
    assert.deepEqual(
      folderList(findById(tree, '10')).map((f) => [f.title, f.depth]),
      [
        ['Shop API', 0],
        ['Sprint tasks', 0],
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
    L('2', 'alpha', 'https://test.shop.example.com/1', { index: 0, dateAdded: 30 }),
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

describe('link notes and priority', () => {
  test('levels are High, Medium, Low in that order', () => {
    assert.deepEqual(PRIS, ['high', 'med', 'low']);
    assert.deepEqual(
      PRIS.map((p) => PRI_NAMES[p]),
      ['High', 'Medium', 'Low'],
    );
  });

  test('cleanMeta keeps a known priority and a trimmed note', () => {
    assert.deepEqual(cleanMeta({ note: '  check QA  ', pri: 'high' }), { note: 'check QA', pri: 'high' });
    assert.deepEqual(cleanMeta({ pri: 'low' }), { pri: 'low' });
    assert.deepEqual(cleanMeta({ note: 'only a note' }), { note: 'only a note' });
  });

  test('cleanMeta cuts the note to NOTE_MAX characters', () => {
    assert.equal(NOTE_MAX, 200);
    assert.equal(cleanMeta({ note: 'x'.repeat(250) }).note.length, NOTE_MAX);
  });

  test('cleanMeta drops bad values and returns null when nothing is left', () => {
    assert.deepEqual(cleanMeta({ note: 'ok', pri: 'urgent' }), { note: 'ok' });
    assert.deepEqual(cleanMeta({ note: 42, pri: 'med' }), { pri: 'med' });
    assert.equal(cleanMeta({ note: '   ', pri: '' }), null);
    assert.equal(cleanMeta({}), null);
    assert.equal(cleanMeta(null), null);
    assert.equal(cleanMeta('high'), null);
  });

  const links = [L('1', 'A'), L('2', 'B'), L('3', 'C'), L('4', 'D'), L('5', 'E')];
  const meta = { 2: { pri: 'low' }, 3: { pri: 'high' }, 4: { note: 'no priority' }, 5: { pri: 'high' } };
  const ids = (xs) => xs.map((x) => x.id);

  test('priGroups: High, Medium, Low, Other; keeps the sort order inside each group; skips empty groups', () => {
    const g = priGroups(links, meta);
    assert.deepEqual(
      g.map((x) => x.pri),
      ['high', 'low', null],
    );
    assert.deepEqual(ids(g[0].links), ['3', '5']);
    assert.deepEqual(ids(g[1].links), ['2']);
    assert.deepEqual(ids(g[2].links), ['1', '4']);
  });

  test('priGroups: no priority anywhere → one Other group', () => {
    const g = priGroups(links, { 4: { note: 'x' } });
    assert.equal(g.length, 1);
    assert.equal(g[0].pri, null);
    assert.deepEqual(ids(g[0].links), ['1', '2', '3', '4', '5']);
  });

  test('priFirst: the same order as one flat list, input not changed', () => {
    assert.deepEqual(ids(priFirst(links, meta)), ['3', '5', '2', '1', '4']);
    assert.deepEqual(ids(links), ['1', '2', '3', '4', '5']);
  });

  test('matchLink: every term must match title, URL or note', () => {
    const bm = L('9', 'Build deploy', 'https://ci.example.com/job/web');
    assert.equal(matchLink(bm, '', ''), true);
    assert.equal(matchLink(bm, '', 'build example'), true);
    assert.equal(matchLink(bm, 'Ask Sam for the token', 'sam'), true);
    assert.equal(matchLink(bm, 'Ask Sam for the token', 'build token'), true);
    assert.equal(matchLink(bm, '', 'sam'), false);
    assert.equal(matchLink(bm, undefined, 'build'), true);
  });
});

describe('due dates', () => {
  const NOW = new Date(2026, 9, 24, 11, 30);

  test('isDue accepts a real date, with or without a time', () => {
    assert.equal(isDue('2026-04-10'), true);
    assert.equal(isDue('2026-04-10T10:00'), true);
    assert.equal(isDue('2026-02-30'), false);
    assert.equal(isDue('2026-13-01'), false);
    assert.equal(isDue('2026-04-10T24:00'), false);
    assert.equal(isDue('2026-04-10T10:60'), false);
    assert.equal(isDue('10 April'), false);
    assert.equal(isDue(''), false);
    assert.equal(isDue(20260410), false);
  });

  test('cleanMeta keeps a valid due date and drops a bad one', () => {
    assert.deepEqual(cleanMeta({ due: '2026-04-10' }), { due: '2026-04-10' });
    assert.deepEqual(cleanMeta({ note: 'read', due: '2026-04-10T10:00' }), { note: 'read', due: '2026-04-10T10:00' });
    assert.deepEqual(cleanMeta({ pri: 'high', due: 'tomorrow' }), { pri: 'high' });
    assert.equal(cleanMeta({ due: '' }), null);
  });

  test('dueState: a date without a time is overdue from the next day', () => {
    assert.equal(dueState('2026-10-23', NOW), 'overdue');
    assert.equal(dueState('2026-10-24', NOW), 'today');
    assert.equal(dueState('2026-10-25', NOW), 'soon');
  });

  test('dueState: a date with a time is overdue after that minute', () => {
    assert.equal(dueState('2026-10-24T11:29', NOW), 'overdue');
    assert.equal(dueState('2026-10-24T11:30', NOW), 'today');
    assert.equal(dueState('2026-10-24T16:00', NOW), 'today');
  });

  test('dueState: soon is the next 7 days, later after that, null without a date', () => {
    assert.equal(dueState('2026-10-31', NOW), 'soon');
    assert.equal(dueState('2026-11-01', NOW), 'later');
    assert.equal(dueState('', NOW), null);
    assert.equal(dueState(undefined, NOW), null);
  });

  test('dueLabel says when and how late', () => {
    assert.equal(dueLabel('2026-10-20', NOW), 'Overdue · 20 Oct (4 days)');
    assert.equal(dueLabel('2026-10-23T09:00', NOW), 'Overdue · 23 Oct 09:00 (1 day)');
    assert.equal(dueLabel('2026-10-24T10:00', NOW), 'Overdue · today 10:00');
    assert.equal(dueLabel('2026-10-24', NOW), 'Due today');
    assert.equal(dueLabel('2026-10-24T16:00', NOW), 'Today 16:00');
    assert.equal(dueLabel('2026-10-29', NOW), 'Due Thu 29 Oct');
    assert.equal(dueLabel('2026-10-29T10:00', NOW), 'Due Thu 29 Oct 10:00');
    assert.equal(dueLabel('2026-12-11', NOW), 'Due 11 Dec 2026');
    assert.equal(dueLabel('bad', NOW), '');
  });

  test('gcalUrl: an all-day event ends on the next day', () => {
    const u = new URL(gcalUrl({ title: 'Q4 checklist', url: 'https://example.com/q4', due: '2026-12-31' }));
    assert.equal(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
    assert.equal(u.searchParams.get('action'), 'TEMPLATE');
    assert.equal(u.searchParams.get('text'), 'Q4 checklist');
    assert.equal(u.searchParams.get('dates'), '20261231/20270101');
    assert.equal(u.searchParams.get('details'), 'https://example.com/q4');
  });

  test('gcalUrl: a timed event lasts 30 minutes in local time and carries the note', () => {
    const u = new URL(gcalUrl({ title: '', url: 'https://example.com/a', note: 'Read first', due: '2026-04-10T23:45' }));
    assert.equal(u.searchParams.get('dates'), '20260410T234500/20260411T001500');
    assert.equal(u.searchParams.get('text'), 'https://example.com/a');
    assert.equal(u.searchParams.get('details'), 'Read first\n\nhttps://example.com/a');
  });

  test('gcalUrl is empty without a valid date', () => {
    assert.equal(gcalUrl({ title: 'x', url: 'https://example.com', due: '' }), '');
  });
});

describe('searchLinks', () => {
  const tree = F('r', 'R', [
    F('a', 'Shop', [
      L('1', 'Checkout', 'https://shop.example.com/cart'),
      F('p', 'Old', [L('2', 'Legacy cart', 'https://old.example.com/cart', { parentId: 'p' })]),
    ]),
    F('b', 'Docs', [L('3', 'Guide', 'https://docs.example.com/')]),
  ]);
  const secs = sections(tree, []);
  const ids = (hits) => hits.map((x) => x.bm.id);

  test('every term must match title, URL, folder crumb, note or label', () => {
    assert.deepEqual(ids(searchLinks(secs, 'cart')), ['1', '2']);
    assert.deepEqual(ids(searchLinks(secs, 'shop old')), ['2']);
    assert.deepEqual(searchLinks(secs, 'shop old')[0].crumb, 'Shop › Old');
    assert.deepEqual(ids(searchLinks(secs, 'refund', { 3: { note: 'Refund policy' } })), ['3']);
    assert.deepEqual(ids(searchLinks(secs, 'prod', {}, [{ pattern: 'shop.example', env: 'PROD' }])), ['1']);
    assert.deepEqual(ids(searchLinks(secs, 'CART Legacy')), ['2']);
    assert.deepEqual(ids(searchLinks(secs, 'nothing')), []);
  });

  test('a custom tag from an address rule is searchable, so the palette and tw find it', () => {
    const rules = [{ pattern: 'old.example.com', env: 'QA' }];
    assert.deepEqual(ids(searchLinks(secs, 'qa', {}, rules)), ['2']);
    assert.deepEqual(ids(searchLinks(secs, 'qa cart', {}, rules)), ['2']);
    assert.deepEqual(
      omniboxSuggestions(secs, 'qa', {}, rules).map((s) => s.content),
      ['https://old.example.com/cart'],
    );
  });
});

describe('omnibox', () => {
  const tree = F('r', 'R', [
    F('a', 'Shop', [
      L('1', 'Orders admin', 'https://shop.example.com/admin/orders'),
      L('2', 'Order <b> & "quotes"', 'https://test.shop.example.com/x?a=1&b=2'),
      L('3', 'Checkout', 'https://shop.example.com/orders/cart'),
    ]),
  ]);
  const secs = sections(tree, []);
  const rules = [
    { pattern: 'test.shop', env: 'TEST' },
    { pattern: 'shop.example', env: 'PROD' },
  ];

  test('xmlEscape escapes the 5 XML characters', () => {
    assert.equal(xmlEscape(`<a href="x">Tom's & co</a>`), '&lt;a href=&quot;x&quot;&gt;Tom&apos;s &amp; co&lt;/a&gt;');
  });

  test('suggestions: title matches first, escaped, matches marked, URL as content', () => {
    const s = omniboxSuggestions(secs, 'order', {}, rules);
    assert.deepEqual(
      s.map((x) => x.content),
      ['https://shop.example.com/admin/orders', 'https://test.shop.example.com/x?a=1&b=2', 'https://shop.example.com/orders/cart'],
    );
    assert.equal(
      s[1].description,
      '<match>Order</match> &lt;b&gt; &amp; &quot;quotes&quot; <dim>TEST · Shop</dim> <url>test.shop.example.com/x?a=1&amp;b=2</url>',
    );
    assert.equal(s[2].description, 'Checkout <dim>PROD · Shop</dim> <url>shop.example.com/<match>order</match>s/cart</url>');
  });

  test('suggestions: a label word filters; empty text and max', () => {
    assert.deepEqual(
      omniboxSuggestions(secs, 'test', {}, rules).map((x) => x.content),
      ['https://test.shop.example.com/x?a=1&b=2'],
    );
    assert.deepEqual(omniboxSuggestions(secs, '   ', {}, rules), []);
    assert.equal(omniboxSuggestions(secs, 'shop', {}, rules, 2).length, 2);
  });

  test('target: a picked suggestion opens its URL; typed text opens the warehouse search', () => {
    assert.equal(omniboxTarget('https://a.com/x', 'chrome-extension://id/newtab.html'), 'https://a.com/x');
    assert.equal(omniboxTarget(' prod orders ', 'chrome-extension://id/newtab.html'), 'chrome-extension://id/newtab.html?q=prod%20orders');
    assert.equal(omniboxTarget('a&b', 'n.html'), 'n.html?q=a%26b');
  });
});

describe('duplicates', () => {
  const ids = (xs) => xs.map((x) => x.id);
  test('dupKey: a trailing slash and host case do not matter; query and hash do', () => {
    assert.equal(dupKey('https://A.example.com/x/'), dupKey('https://a.example.com/x'));
    assert.equal(dupKey('http://localhost:3000/'), dupKey('http://localhost:3000'));
    assert.notEqual(dupKey('https://a.com/x?id=1'), dupKey('https://a.com/x?id=2'));
    assert.notEqual(dupKey('https://a.com/x#top'), dupKey('https://a.com/x'));
    assert.notEqual(dupKey('http://a.com/x'), dupKey('https://a.com/x'));
    assert.equal(dupKey('not a url'), 'not a url');
  });

  test('dupKey loose: drops the hash and tracking parameters, keeps the others', () => {
    const plain = dupKey('https://a.com/x?q=a%20b', true);
    assert.equal(dupKey('https://a.com/x?q=a%20b&utm_source=slack&gclid=1&fbclid=2#intro', true), plain);
    assert.equal(dupKey('https://a.com/x?utm_medium=mail', true), dupKey('https://a.com/x', true));
    assert.notEqual(dupKey('https://a.com/x?q=other', true), plain);
    assert.notEqual(dupKey('https://a.com/x?utm_source=1'), dupKey('https://a.com/x'));
  });

  test('findDuplicates: only addresses saved twice or more, oldest first', () => {
    const links = [
      { ...L('1', 'A', 'https://a.com/x'), dateAdded: 30 },
      { ...L('2', 'B', 'https://b.com/'), dateAdded: 10 },
      { ...L('3', 'A again', 'https://a.com/x/'), dateAdded: 20 },
      { ...L('4', 'A tracked', 'https://a.com/x?utm_source=1'), dateAdded: 5 },
    ];
    const g = findDuplicates(links);
    assert.equal(g.length, 1);
    assert.deepEqual(ids(g[0].links), ['3', '1']);
    const loose = findDuplicates(links, true);
    assert.deepEqual(ids(loose[0].links), ['4', '3', '1']);
    assert.deepEqual(ids(links), ['1', '2', '3', '4']);
  });
});

describe('buildMatrix', () => {
  test('groups the same path across envs; no-env links go to rest', () => {
    const { rows, rest } = buildMatrix(
      [L('1', 'p', 'https://shop.example.com/api/x?q=1'), L('2', 't', 'https://test.shop.example.com/api/x'), L('3', 'n', 'https://github.com/a')],
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
    assert.equal(DEFAULT_HOME.tilesGap, 80);
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
    assert.deepEqual(s.customTags, [], 'no custom tags');
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
  test('board defaults to By category and old stored objects gain new board keys', async () => {
    assert.deepEqual(DEFAULT_BOARD, { group: 'cat' });
    assert.deepEqual((await loadSettings()).board, { group: 'cat' });
    store.settings = { board: { group: 'flat' } };
    assert.equal((await loadSettings()).board.group, 'flat');
    store.settings = { board: {} };
    assert.equal((await loadSettings()).board.group, 'cat');
    store.settings = { userName: 'x' };
    assert.equal((await loadSettings()).board.group, 'cat');
  });
  test('Board text size defaults to 100 % and old stored settings gain it', async () => {
    store.settings = { fontPage: 120 };
    const s = await loadSettings();
    assert.equal(s.fontBoard, 100);
    assert.equal(s.fontPage, 120);
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
    assert.match(text, /^# Tags by address/);
    assert.ok(text.includes('shop.example.com test.shop.example.com - localhost:3000'));
    assert.deepEqual(parseEnvText(text), { rules, hostMap: map, tags: [], skipped: 0 });
  });
  test('parseEnvText skips bad lines, ignores comments and blanks, lower-cases, accepts any order', () => {
    const p = parseEnvText('a.com B.COM - -\n# note\n\nFoo.com prod\nthis is bad\nx.com NOPE\n- - - -');
    assert.deepEqual(p.rules, [{ pattern: 'foo.com', env: 'PROD' }]);
    assert.deepEqual(p.hostMap, [{ PROD: 'a.com', TEST: 'b.com', STAGE: '', LOCAL: '' }]);
    assert.equal(p.skipped, 3);
    assert.deepEqual(parseEnvText(''), { rules: [], hostMap: [], tags: [], skipped: 0 });
  });
});

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];
  const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: '', QA: 'qa.example.com' }];

  test('tagNameError: 1 to 8 capital letters or digits, not reserved, not taken', () => {
    assert.equal(tagNameError('QA'), '');
    assert.equal(tagNameError('UAT2'), '');
    assert.equal(tagNameError('ABCDEFGH'), '');
    assert.equal(tagNameError(''), 'Use 1 to 8 capital letters or digits.');
    assert.equal(tagNameError('ABCDEFGHI'), 'Use 1 to 8 capital letters or digits.');
    assert.equal(tagNameError('qa'), 'Use 1 to 8 capital letters or digits.');
    assert.equal(tagNameError('Q-A'), 'Use 1 to 8 capital letters or digits.');
    for (const n of ['PROD', 'TEST', 'STAGE', 'LOCAL', 'DEV', 'GH', 'NONE', 'TEAL']) assert.equal(tagNameError(n), `${n} is a built-in name.`, n);
    assert.equal(tagNameError('QA', ['QA']), 'There is already a tag QA.');
  });
  test('TAG_COLORS are 6 fixed colors', () => assert.deepEqual(TAG_COLORS, ['teal', 'pink', 'yellow', 'red', 'cyan', 'grey']));
  test('cleanTags keeps valid unique tags, upper-cases names, fixes colors, cuts plain names', () => {
    assert.deepEqual(
      cleanTags([
        QA,
        { name: ' uat ', plain: ' Users ', color: 'nope' },
        { name: 'QA', plain: 'again', color: 'red' },
        { name: 'PROD', color: 'red' },
        { name: 'TOOLONGNAME', color: 'red' },
        { name: 7 },
        null,
        { name: 'DEMO', plain: 'x'.repeat(50), color: 'pink' },
      ]),
      [QA, { name: 'UAT', plain: 'Users', color: 'teal' }, { name: 'DEMO', plain: 'x'.repeat(40), color: 'pink' }],
    );
    assert.deepEqual(cleanTags('bad'), []);
    assert.deepEqual(cleanTags(undefined), []);
  });
  test('tagNames: built-ins first, then custom tags in their order', () => {
    assert.deepEqual(tagNames({ customTags: [QA, { name: 'UAT' }] }), ['PROD', 'TEST', 'STAGE', 'LOCAL', 'QA', 'UAT']);
    assert.deepEqual(tagNames({}), ENVS);
  });
  test('tagPlain: built-in plain name, custom plain name, else the name', () => {
    const s = { customTags: [QA, { name: 'UAT', plain: '', color: 'red' }] };
    assert.equal(tagPlain(s, 'PROD'), 'Live');
    assert.equal(tagPlain(s, 'QA'), 'QA team');
    assert.equal(tagPlain(s, 'UAT'), 'UAT');
  });
  test('a custom tag comes only from an address rule, never from a title word', () => {
    assert.equal(detectEnv({ url: 'https://qa.example.com/a' }, rules), 'QA');
    assert.equal(detectEnv({ url: 'https://x.org/a', title: 'Admin QA' }, rules), '');
  });
  test('sortLinks env: custom tags after the built-ins, unknown tags with the untagged links', () => {
    const links = [
      L('1', 'n', 'https://none.org/1'),
      L('2', 'q', 'https://qa.example.com/1'),
      L('3', 'p', 'https://shop.example.com/1'),
      L('4', 'g', 'https://gone.example.com/1'),
    ];
    const r = [...rules, { pattern: 'gone.example.com', env: 'GONE' }];
    assert.deepEqual(
      sortLinks(links, 'env', r, tags).map((x) => x.id),
      ['3', '2', '1', '4'],
    );
    assert.deepEqual(
      sortLinks(links, 'env', r).map((x) => x.id),
      ['3', '1', '2', '4'],
    );
  });
  test('buildMatrix has one cell per tag; a link with an unknown tag goes to rest', () => {
    const links = [L('1', 'p', 'https://shop.example.com/a'), L('2', 'q', 'https://qa.example.com/a')];
    const m = buildMatrix(links, rules, tags);
    assert.deepEqual(Object.keys(m.rows[0].cells), tags);
    assert.equal(m.rows[0].cells.QA[0].id, '2');
    assert.deepEqual(
      buildMatrix(links, rules).rest.map((x) => x.id),
      ['2'],
    );
  });
  test('deriveUrl and switchTargets use the custom column', () => {
    assert.equal(deriveUrl('https://shop.example.com/a?b=1', 'QA', map, tags), 'https://qa.example.com/a?b=1');
    assert.equal(deriveUrl('https://qa.example.com/a', 'TEST', map, tags), 'https://test.shop.example.com/a');
    assert.equal(deriveUrl('https://qa.example.com/a', 'TEST', map), null, 'QA host is unknown without the tag list');
    assert.deepEqual(switchTargets('https://qa.example.com/x', map, tags), {
      from: 'QA',
      to: [
        { env: 'PROD', url: 'https://shop.example.com/x' },
        { env: 'TEST', url: 'https://test.shop.example.com/x' },
      ],
    });
  });
  test('envText and parseEnvText round-trip custom tags, their rules and their site column', () => {
    const text = envText(rules, map, [QA]);
    assert.match(text, /^# Tags: NAME color plain name\nQA teal QA team\n/);
    assert.ok(text.includes('# Same site in each version: PROD TEST STAGE LOCAL QA (- for none)'));
    assert.ok(text.includes('shop.example.com test.shop.example.com - - qa.example.com'));
    assert.deepEqual(parseEnvText(text), { rules, hostMap: map, tags: [QA], skipped: 0 });
  });
  test('parseEnvText: a rule for a tag that already exists imports without a tag line', () => {
    assert.deepEqual(parseEnvText('qa.example.com QA', ['QA']).rules, [{ pattern: 'qa.example.com', env: 'QA' }]);
    const p = parseEnvText('qa.example.com QA');
    assert.deepEqual(p.rules, []);
    assert.equal(p.skipped, 1);
  });
  test('parseEnvText: old text without a sites header reads 4 columns; a tag line already known is not added again', () => {
    const p = parseEnvText('a.com b.com - -\nQA teal QA team', ['QA']);
    assert.deepEqual(p.hostMap, [{ PROD: 'a.com', TEST: 'b.com', STAGE: '', LOCAL: '' }]);
    assert.deepEqual(p.tags, []);
    assert.equal(p.skipped, 0);
  });
  test('parseEnvText: a site column for an unknown tag is dropped; a row with only that column is skipped', () => {
    const p = parseEnvText('# Same site in each version: PROD TEST STAGE LOCAL ZZ (- for none)\na.com - - - z.com\n- - - - z.com');
    assert.deepEqual(p.hostMap, [{ PROD: 'a.com', TEST: '', STAGE: '', LOCAL: '' }]);
    assert.equal(p.skipped, 1);
  });
  test('parseEnvText: a bad tag line is skipped', () => {
    const p = parseEnvText('PROD red\nlower pink\nQA nocolor x');
    assert.deepEqual(p.tags, []);
    assert.equal(p.skipped, 3);
  });
});

describe('no built-in company or personal data', () => {
  test('fresh-install settings hold no company names, hosts or labels', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    const s = await loadSettings();
    assert.equal(s.rootName, '');
    assert.deepEqual([s.envRules, s.hostMap], [[], []]);
    assert.doesNotMatch(JSON.stringify(s), /shop\.example|My Links|Sprint tasks|sumonta|gitbook|vercel/i);
  });
  test('letterIcon has no company special cases', () => {
    assert.equal(letterIcon({ url: 'https://shop.example.com/x', title: 'Shop API' }), 'Sh');
    assert.equal(letterIcon({ url: 'https://www.example.org/', title: 'News' }), 'Ne');
    assert.equal(letterIcon({ url: 'https://github.com/a', title: 'Repo' }), 'gh');
  });
});

describe('brandName', () => {
  test('falls back to the product name without a name', () => {
    assert.equal(brandName({}), 'Tab Warehouse');
    assert.equal(brandName({ userName: '   ' }), 'Tab Warehouse');
    assert.equal(brandName(undefined), 'Tab Warehouse');
  });
  test('uses the trimmed name', () => {
    assert.equal(brandName({ userName: ' Sumonta ' }), "Sumonta's Warehouse");
  });
});

describe('tileIconSrcs', () => {
  beforeEach(() => {
    globalThis.chrome = { runtime: { getURL: (p) => `chrome-extension://x${p}` } };
  });
  const fav = (u) => `chrome-extension://x/_favicon/?pageUrl=${encodeURIComponent(u)}&size=64`;
  const web = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  test('page favicon, then the site root favicon, then the web icon', async () => {
    const { tileIconSrcs } = await import('../../extension/lib/core.js');
    assert.deepEqual(tileIconSrcs({ id: '1', url: 'https://www.chess.com/home' }, {}), [
      fav('https://www.chess.com/home'),
      fav('https://www.chess.com/'),
      web('www.chess.com'),
      web('chess.com'),
    ]);
  });
  test('no duplicate when the link is the site root', async () => {
    const { tileIconSrcs } = await import('../../extension/lib/core.js');
    assert.deepEqual(tileIconSrcs({ id: '1', url: 'https://github.com/' }, {}), [fav('https://github.com/'), web('github.com')]);
  });
  test('local, IP and non-web links never go to the web icon service', async () => {
    const { webIconUrls } = await import('../../extension/lib/core.js');
    assert.deepEqual(webIconUrls('http://localhost:3000/'), []);
    assert.deepEqual(webIconUrls('http://192.168.1.4/x'), []);
    assert.deepEqual(webIconUrls('chrome://extensions'), []);
    assert.deepEqual(webIconUrls('not a url'), []);
    assert.deepEqual(webIconUrls('https://daily.dev/'), [web('daily.dev')]);
  });
  test('custom and Google icons come first', async () => {
    const { tileIconSrcs } = await import('../../extension/lib/core.js');
    assert.equal(tileIconSrcs({ id: '1', url: 'https://x.com/' }, { 1: 'data:a' })[0], 'data:a');
    assert.match(tileIconSrcs({ id: '2', url: 'https://mail.google.com/' }, {})[0], /gmail/);
  });
});

describe('clampFont', () => {
  test('keeps 80-140 and rounds', () => {
    assert.equal(clampFont(120), 120);
    assert.equal(clampFont(112.6), 113);
    assert.equal(clampFont(50), 80);
    assert.equal(clampFont(300), 140);
  });
  test('bad values fall back to 100', () => {
    assert.equal(clampFont(undefined), 100);
    assert.equal(clampFont('big'), 100);
  });
});

describe('shortcuts', () => {
  test('shortcutKeys splits Windows and Linux keys on +', () => {
    assert.deepEqual(shortcutKeys('Ctrl+Shift+K'), ['Ctrl', 'Shift', 'K']);
    assert.deepEqual(shortcutKeys('Alt+Shift+Down'), ['Alt', 'Shift', 'Down']);
  });
  test('shortcutKeys splits Mac modifier symbols and keeps the key whole', () => {
    assert.deepEqual(shortcutKeys('⇧⌘B'), ['⇧', '⌘', 'B']);
    assert.deepEqual(shortcutKeys('⌥⇧Space'), ['⌥', '⇧', 'Space']);
    assert.deepEqual(shortcutKeys('F5'), ['F5']);
  });
  test('an empty shortcut has no keys', () => {
    assert.deepEqual(shortcutKeys(''), []);
    assert.deepEqual(shortcutKeys(undefined), []);
  });
  test('commandLabel names the known commands and falls back to the description', () => {
    assert.equal(commandLabel({ name: '_execute_action', description: '' }), 'Open the save popup');
    assert.equal(commandLabel({ name: 'quick-save', description: 'Save current tab without the popup' }), 'Quick save (no popup)');
    assert.equal(commandLabel({ name: 'other', description: 'Do a thing' }), 'Do a thing');
    assert.equal(commandLabel({ name: 'other' }), 'other');
    assert.equal(commandLabel({ name: 'open', description: 'x' }), 'Open the popup (palette on this page)');
  });
});

describe('open command', async () => {
  const { isPaletteRequest, openCommand, PALETTE_MSG } = await import('../../extension/lib/core.js');
  const spy = (send) => {
    const calls = { sent: [], popup: 0 };
    return {
      calls,
      deps: {
        send: (m) => (calls.sent.push(m), send(m)),
        popup: async () => {
          calls.popup++;
        },
      },
    };
  };
  test('isPaletteRequest matches only the open-palette message for this tab', () => {
    assert.equal(PALETTE_MSG, 'open-palette');
    assert.equal(isPaletteRequest({ type: 'open-palette', tabId: 5 }, 5), true);
    assert.equal(isPaletteRequest({ type: 'open-palette', tabId: 6 }, 5), false);
    assert.equal(isPaletteRequest({ type: 'other', tabId: 5 }, 5), false);
    assert.equal(isPaletteRequest({ type: 'open-palette' }, undefined), false);
    assert.equal(isPaletteRequest(null, 5), false);
  });
  test('a page that answers true gets the palette and no popup', async () => {
    const { calls, deps } = spy(async () => true);
    assert.equal(await openCommand(5, deps), 'palette');
    assert.deepEqual(calls.sent, [{ type: 'open-palette', tabId: 5 }]);
    assert.equal(calls.popup, 0);
  });
  test('no listener (rejected or thrown), or any other answer, opens the popup', async () => {
    for (const send of [
      () => Promise.reject(new Error('Receiving end does not exist.')),
      () => {
        throw new Error('sync');
      },
      async () => undefined,
      async () => 'yes',
    ]) {
      const { calls, deps } = spy(send);
      assert.equal(await openCommand(5, deps), 'popup');
      assert.equal(calls.popup, 1);
    }
  });
  test('without a tab id it does not ask a page and opens the popup', async () => {
    const { calls, deps } = spy(async () => true);
    assert.equal(await openCommand(undefined, deps), 'popup');
    assert.deepEqual(calls.sent, []);
  });
  test('a popup that cannot open is ignored', async () => {
    const r = await openCommand(5, {
      send: async () => undefined,
      popup: async () => {
        throw new Error('no window');
      },
    });
    assert.equal(r, 'none');
  });
});

describe('quick save', async () => {
  const { findSaved, quickSaveTarget, quickSave, quickSaveBadge } = await import('../../extension/lib/core.js');
  const tree = () => ({
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'My Links',
            children: [
              { id: '30', title: 'Shop API', children: [{ id: '31', title: 'Shop', url: 'https://shop.example.com/api/x' }] },
              { id: '40', title: 'Empty', children: [] },
              { id: '60', title: 'Loose', url: 'https://loose.example.com/' },
            ],
          },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [{ id: '70', title: 'Home', children: [{ id: '71', title: 'Ex', url: 'https://example.com/' }] }] },
    ],
  });
  const settings = { rootName: 'My Links', lastSaveFolder: null };

  test('findSaved: an exact address matches, with its folder path', () => {
    const hits = findSaved(tree(), 'https://shop.example.com/api/x');
    assert.deepEqual(
      hits.map((b) => [b.id, b.path]),
      [['31', 'Bookmarks bar › My Links › Shop API']],
    );
  });
  test('findSaved: tracking parameters, #part and a trailing slash still match', () => {
    assert.deepEqual(
      findSaved(tree(), 'https://shop.example.com/api/x/?utm_source=mail&gclid=1#top').map((b) => b.id),
      ['31'],
    );
    assert.deepEqual(
      findSaved(tree(), 'https://example.com').map((b) => b.id),
      ['71'],
    );
  });
  test('findSaved: another page or another query does not match', () => {
    assert.deepEqual(findSaved(tree(), 'https://shop.example.com/api/y'), []);
    assert.deepEqual(findSaved(tree(), 'https://shop.example.com/api/x?id=2'), []);
  });
  test('quickSaveTarget: the last save folder while it exists, else the root', () => {
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '40' }, tree()), '40');
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '999' }, tree()), '10');
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '60' }, tree()), '10');
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '70' }, tree()), '10');
    assert.equal(quickSaveTarget(settings, tree()), '10');
  });
  test('quickSave: saves a new page into the target folder with the tab title', () => {
    assert.deepEqual(quickSave({ ...settings, lastSaveFolder: '40' }, tree(), { title: 'New', url: 'https://new.example.com/a' }), {
      kind: 'save',
      parentId: '40',
      folder: 'Empty',
      title: 'New',
      url: 'https://new.example.com/a',
    });
    assert.equal(quickSave(settings, tree(), { title: '', url: 'file:///x.html' }).title, 'file:///x.html');
  });
  test('quickSave: an address that is already saved is a duplicate', () => {
    const r = quickSave(settings, tree(), { title: 'Shop', url: 'https://shop.example.com/api/x#top' });
    assert.equal(r.kind, 'dup');
    assert.deepEqual(
      r.hits.map((b) => b.id),
      ['31'],
    );
  });
  test('quickSave: no tab or a page that is not http(s)/file is skipped', () => {
    assert.deepEqual(quickSave(settings, tree(), undefined), { kind: 'skip' });
    assert.deepEqual(quickSave(settings, tree(), { url: 'chrome://extensions/' }), { kind: 'skip' });
    assert.deepEqual(quickSave(settings, tree(), { url: '' }), { kind: 'skip' });
  });
  test('quickSaveBadge: ✓ green, ! orange with the path, – grey', () => {
    assert.deepEqual(quickSaveBadge({ kind: 'save', folder: 'Empty' }), { text: '✓', color: '#1e8e3e', title: 'Saved to Empty' });
    assert.deepEqual(quickSaveBadge({ kind: 'dup', hits: [{ path: 'A › B' }] }), { text: '!', color: '#e8710a', title: 'Already in A › B' });
    assert.equal(quickSaveBadge({ kind: 'skip' }).text, '–');
    assert.equal(quickSaveBadge({ kind: 'error', message: 'x' }).title, 'Could not save: x');
  });
});
