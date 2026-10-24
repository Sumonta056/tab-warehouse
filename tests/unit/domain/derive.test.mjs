import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';
import { deriveUrl, switchTargets, otherVersions } from '../../../extension/domain/derive.js';
import { SAMPLE_HOST_MAP } from '../fixtures.mjs';

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

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: '', QA: 'qa.example.com' }];

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
});

describe('otherVersions', () => {
  test('every other tag that the site row fills, with the same path', () => {
    assert.deepEqual(otherVersions('https://shop.example.com/a?b=1', 'PROD', SAMPLE_HOST_MAP), [
      { env: 'TEST', url: 'https://test.shop.example.com/a?b=1' },
      { env: 'STAGE', url: 'https://stage.shop.example.com/a?b=1' },
      { env: 'LOCAL', url: 'http://localhost:8080/a?b=1' },
    ]);
  });
  test('empty boxes and unknown hosts give nothing', () => {
    assert.deepEqual(
      otherVersions('https://www.example.org/x', 'PROD', SAMPLE_HOST_MAP).map((x) => x.env),
      ['TEST'],
    );
    assert.deepEqual(otherVersions('https://nowhere.net/', '', SAMPLE_HOST_MAP), []);
  });
  test('custom tags take part when passed', () => {
    const map = [{ PROD: 'a.com', QA: 'qa.a.com' }];
    assert.deepEqual(otherVersions('https://qa.a.com/p', 'QA', map, [...ENVS, 'QA']), [{ env: 'PROD', url: 'https://a.com/p' }]);
  });
});

describe('deriveUrl with a bad address', () => {
  test('a text that is not a URL derives nothing, even when a site row has empty boxes', () => {
    assert.equal(deriveUrl('not a url', 'PROD', [{ PROD: 'shop.example.com', TEST: '' }]), null);
  });
});
