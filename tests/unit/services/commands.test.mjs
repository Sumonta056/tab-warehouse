import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import { getCommands, omniboxKeyword, onCommand } from '../../../extension/services/commands.js';

describe('commands service', () => {
  test('getCommands lists the commands, or nothing when the API is missing', async () => {
    fakeChrome({ commands: [{ name: 'palette', shortcut: '⇧⌘K' }] });
    assert.deepEqual(await getCommands(), [{ name: 'palette', shortcut: '⇧⌘K' }]);
    const ch = fakeChrome();
    delete ch.commands;
    assert.deepEqual(await getCommands(), []);
  });

  test('omniboxKeyword reads the manifest keyword', () => {
    fakeChrome({ manifest: { omnibox: { keyword: 'tw' } } });
    assert.equal(omniboxKeyword(), 'tw');
    fakeChrome();
    assert.equal(omniboxKeyword(), undefined);
  });

  test('onCommand registers a listener', () => {
    const ch = fakeChrome();
    const seen = [];
    onCommand((name) => seen.push(name));
    ch.commands.onCommand.fire('quick-save');
    assert.deepEqual(seen, ['quick-save']);
  });
});
