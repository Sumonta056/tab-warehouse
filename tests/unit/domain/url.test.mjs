import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { displayUrl, hostOf, isGithub, normalizeUrl, pathKey, sameAsUrl } from '../../../extension/domain/url.js';

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
