import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';
import { envText, parseEnvText } from '../../../extension/domain/env-text.js';

describe('environment labels: explain and text format', () => {
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
});

describe('environment labels: explain and text format', () => {
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

  test('envText and parseEnvText round-trip custom tags, their rules and their site column', () => {
    const text = envText(rules, map, [QA]);
    assert.match(text, /^# Tags: NAME color plain name\nQA teal QA team\n/);
    assert.ok(text.includes('# Same site in each version: PROD TEST STAGE LOCAL QA (- for none)'));
    assert.ok(text.includes('shop.example.com test.shop.example.com - - qa.example.com'));
    assert.deepEqual(parseEnvText(text), { rules, hostMap: map, tags: [QA], skipped: 0 });
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

  test('parseEnvText: a rule for a tag that already exists imports without a tag line', () => {
    assert.deepEqual(parseEnvText('qa.example.com QA', ['QA']).rules, [{ pattern: 'qa.example.com', env: 'QA' }]);
    const p = parseEnvText('qa.example.com QA');
    assert.deepEqual(p.rules, []);
    assert.equal(p.skipped, 1);
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

  test('parseEnvText: old text without a sites header reads 4 columns; a tag line already known is not added again', () => {
    const p = parseEnvText('a.com b.com - -\nQA teal QA team', ['QA']);
    assert.deepEqual(p.hostMap, [{ PROD: 'a.com', TEST: 'b.com', STAGE: '', LOCAL: '' }]);
    assert.deepEqual(p.tags, []);
    assert.equal(p.skipped, 0);
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

  test('parseEnvText: a site column for an unknown tag is dropped; a row with only that column is skipped', () => {
    const p = parseEnvText('# Same site in each version: PROD TEST STAGE LOCAL ZZ (- for none)\na.com - - - z.com\n- - - - z.com');
    assert.deepEqual(p.hostMap, [{ PROD: 'a.com', TEST: '', STAGE: '', LOCAL: '' }]);
    assert.equal(p.skipped, 1);
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

  test('parseEnvText: a bad tag line is skipped', () => {
    const p = parseEnvText('PROD red\nlower pink\nQA nocolor x');
    assert.deepEqual(p.tags, []);
    assert.equal(p.skipped, 3);
  });
});
