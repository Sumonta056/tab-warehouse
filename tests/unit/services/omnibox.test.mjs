import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import { setDefaultSuggestion, onOmniboxInput, onOmniboxEnter } from '../../../extension/services/omnibox.js';

describe('omnibox service', () => {
  test('sets the default suggestion and listens to input and enter', () => {
    const ch = fakeChrome();
    setDefaultSuggestion('Search Tab Warehouse for <match>x</match>');
    assert.deepEqual(ch.calls, [['defaultSuggestion', { description: 'Search Tab Warehouse for <match>x</match>' }]]);
    const seen = [];
    onOmniboxInput((t) => seen.push(['in', t]));
    onOmniboxEnter((t, d) => seen.push(['enter', t, d]));
    ch.omnibox.onInputChanged.fire('sho');
    ch.omnibox.onInputEntered.fire('shop', 'currentTab');
    assert.deepEqual(seen, [
      ['in', 'sho'],
      ['enter', 'shop', 'currentTab'],
    ]);
  });
});
