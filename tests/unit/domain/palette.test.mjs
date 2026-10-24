import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_MSG } from '../../../extension/constants/commands.js';
import { isPaletteRequest, paletteCommand } from '../../../extension/domain/palette.js';

describe('palette command', async () => {
  test('isPaletteRequest matches only the open-palette message for this tab', () => {
    assert.equal(PALETTE_MSG, 'open-palette');
    assert.equal(isPaletteRequest({ type: 'open-palette', tabId: 5 }, 5), true);
    assert.equal(isPaletteRequest({ type: 'open-palette', tabId: 6 }, 5), false);
    assert.equal(isPaletteRequest({ type: 'other', tabId: 5 }, 5), false);
    assert.equal(isPaletteRequest({ type: 'open-palette' }, undefined), false);
    assert.equal(isPaletteRequest(null, 5), false);
  });
  test('a page that answers true opens the palette', async () => {
    const sent = [];
    assert.equal(await paletteCommand(5, async (m) => (sent.push(m), true)), 'palette');
    assert.deepEqual(sent, [{ type: 'open-palette', tabId: 5 }]);
  });
  test('no listener (rejected or thrown), or any other answer, does nothing', async () => {
    for (const send of [
      () => Promise.reject(new Error('Receiving end does not exist.')),
      () => {
        throw new Error('sync');
      },
      async () => undefined,
      async () => 'yes',
    ]) {
      assert.equal(await paletteCommand(5, send), 'none');
    }
  });
  test('without a tab id it does not ask a page', async () => {
    const sent = [];
    assert.equal(await paletteCommand(undefined, async (m) => (sent.push(m), true)), 'none');
    assert.deepEqual(sent, []);
  });
});
