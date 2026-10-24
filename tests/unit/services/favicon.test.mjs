import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tileIconSrcs } from '../../../extension/services/favicon.js';

describe('tileIconSrcs', () => {
  beforeEach(() => {
    globalThis.chrome = { runtime: { getURL: (p) => `chrome-extension://x${p}` } };
  });
  const fav = (u) => `chrome-extension://x/_favicon/?pageUrl=${encodeURIComponent(u)}&size=64`;
  const web = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  test('page favicon, then the site root favicon, then the web icon', async () => {
    assert.deepEqual(tileIconSrcs({ id: '1', url: 'https://www.chess.com/home' }, {}), [
      fav('https://www.chess.com/home'),
      fav('https://www.chess.com/'),
      web('www.chess.com'),
      web('chess.com'),
    ]);
  });
});

describe('tileIconSrcs', () => {
  beforeEach(() => {
    globalThis.chrome = { runtime: { getURL: (p) => `chrome-extension://x${p}` } };
  });
  const fav = (u) => `chrome-extension://x/_favicon/?pageUrl=${encodeURIComponent(u)}&size=64`;
  const web = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  test('no duplicate when the link is the site root', async () => {
    assert.deepEqual(tileIconSrcs({ id: '1', url: 'https://github.com/' }, {}), [fav('https://github.com/'), web('github.com')]);
  });
});

describe('tileIconSrcs', () => {
  beforeEach(() => {
    globalThis.chrome = { runtime: { getURL: (p) => `chrome-extension://x${p}` } };
  });
  const fav = (u) => `chrome-extension://x/_favicon/?pageUrl=${encodeURIComponent(u)}&size=64`;
  const web = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  test('custom and Google icons come first', async () => {
    assert.equal(tileIconSrcs({ id: '1', url: 'https://x.com/' }, { 1: 'data:a' })[0], 'data:a');
    assert.match(tileIconSrcs({ id: '2', url: 'https://mail.google.com/' }, {})[0], /gmail/);
  });
});
