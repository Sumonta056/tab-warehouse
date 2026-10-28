import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { openKeys, isOpen } from '../../../extension/domain/open-tabs.js';

describe('open tabs', () => {
  const keys = openKeys([{ url: 'https://a.com/x/?utm_source=m#top' }, { url: 'https://b.com/' }, { id: 3 }, { url: '' }]);

  test('a link is open when a tab has the same address', () => {
    assert.equal(isOpen(keys, 'https://b.com/'), true);
    assert.equal(isOpen(keys, 'https://c.com/'), false);
  });

  test('a trailing slash, the #part and tracking parameters do not matter', () => {
    assert.equal(isOpen(keys, 'https://a.com/x'), true);
    assert.equal(isOpen(keys, 'https://A.com/x/#other'), true);
    assert.equal(isOpen(keys, 'https://a.com/x?id=1'), false);
  });

  test('tabs without a URL and links without a URL never match', () => {
    assert.equal(keys.size, 2);
    assert.equal(isOpen(keys, ''), false);
    assert.equal(isOpen(keys, undefined), false);
  });
});
