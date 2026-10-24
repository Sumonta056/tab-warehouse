import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';
import { detectEnv, explainEnv, envGroups } from '../../../extension/domain/env.js';
import { SAMPLE_ENV_RULES } from '../fixtures.mjs';

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
});

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];

  test('a custom tag comes only from an address rule, never from a title word', () => {
    assert.equal(detectEnv({ url: 'https://qa.example.com/a' }, rules), 'QA');
    assert.equal(detectEnv({ url: 'https://x.org/a', title: 'Admin QA' }, rules), '');
  });
});

describe('envGroups', () => {
  const rules = [
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'qa.', env: 'QA' },
    { pattern: 'example.com', env: 'PROD' },
  ];
  const links = [
    { id: '1', title: '', url: 'https://test.example.com' },
    { id: '2', title: '', url: 'https://example.com' },
    { id: '3', title: '', url: 'https://other.org' },
    { id: '4', title: '', url: 'https://qa.x.org' },
    { id: '5', title: '', url: 'https://example.com/b' },
  ];
  test('one group per tag in tag order, then NONE; empty groups skipped; link order kept', () => {
    assert.deepEqual(
      envGroups(links, rules, ['PROD', 'TEST', 'STAGE', 'LOCAL', 'QA']).map((g) => [g.env, g.links.map((x) => x.id)]),
      [
        ['PROD', ['2', '5']],
        ['TEST', ['1']],
        ['QA', ['4']],
        ['NONE', ['3']],
      ],
    );
  });
  test('a tag that is not in the list is not shown', () => {
    assert.deepEqual(
      envGroups(links, rules, ['PROD', 'TEST']).map((g) => g.env),
      ['PROD', 'TEST', 'NONE'],
    );
  });
});
