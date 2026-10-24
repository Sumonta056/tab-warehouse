import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import { onMessage, sendMessage, extensionUrl } from '../../../extension/services/runtime.js';

describe('runtime service', () => {
  test('sendMessage, onMessage and extensionUrl', async () => {
    const ch = fakeChrome();
    assert.equal(await sendMessage({ type: 'open-palette', tabId: 1 }), true);
    assert.deepEqual(ch.calls, [['sendMessage', { type: 'open-palette', tabId: 1 }]]);
    let got = null;
    onMessage((m) => (got = m));
    ch.runtime.onMessage.fire({ type: 'x' });
    assert.deepEqual(got, { type: 'x' });
    assert.equal(extensionUrl('newtab.html'), 'chrome-extension://abc/newtab.html');
  });

  test('onMessage does nothing when the page has no runtime.onMessage', () => {
    const ch = fakeChrome();
    delete ch.runtime.onMessage;
    assert.doesNotThrow(() => onMessage(() => {}));
  });
});
