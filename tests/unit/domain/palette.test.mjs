import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_MSG, PALETTE_GO_MSG, PALETTE_POPUP, SAVE_POPUP } from '../../../extension/constants/commands.js';
import { PAGES } from '../../../extension/constants/pages.js';
import { isPaletteRequest, isPaletteGo, paletteGoMsg, paletteGoTarget, paletteCommand, paletteResults } from '../../../extension/domain/palette.js';

describe('palette command', async () => {
  test('isPaletteRequest matches only the open-palette message for this tab', () => {
    assert.equal(PALETTE_MSG, 'open-palette');
    assert.equal(isPaletteRequest({ type: 'open-palette', tabId: 5 }, 5), true);
    assert.equal(isPaletteRequest({ type: 'open-palette', tabId: 6 }, 5), false);
    assert.equal(isPaletteRequest({ type: 'other', tabId: 5 }, 5), false);
    assert.equal(isPaletteRequest({ type: 'open-palette' }, undefined), false);
    assert.equal(isPaletteRequest(null, 5), false);
  });
  test('the palette popup is palette.html and the save popup stays popup.html', () => {
    assert.equal(PALETTE_POPUP, 'palette.html');
    assert.equal(SAVE_POPUP, 'popup.html');
  });
  test('a page that answers true gets the palette popup', async () => {
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

describe('paletteResults', () => {
  const S = (id, title, all = []) => ({ id, title, all, parts: [], links: all });
  const secs = [
    S('1', 'Work tools', [{ id: 'a', title: 'Jenkins', url: 'https://ci.example.com', parentId: '1' }]),
    S('2', 'Reading', [{ id: 'b', title: 'Blog', url: 'https://blog.example.org', parentId: '2' }]),
  ];
  const places = [{ title: 'Home' }, { title: 'Settings › Tags' }];
  test('empty text: no links, every folder and every place', () => {
    const r = paletteResults('', secs, places, {}, [], 30);
    assert.deepEqual(r.links, []);
    assert.deepEqual(
      r.folders.map((s) => s.id),
      ['1', '2'],
    );
    assert.equal(r.places.length, 2);
  });
  test('text: links by searchLinks, folders and places by every term', () => {
    const r = paletteResults('work', secs, places, {}, [], 30);
    assert.deepEqual(
      r.links.map((x) => x.bm.id),
      ['a'],
    );
    assert.equal(r.links[0].crumb, 'Work tools');
    assert.deepEqual(
      r.folders.map((s) => s.id),
      ['1'],
    );
    assert.deepEqual(r.places, []);
    assert.deepEqual(
      paletteResults('settings tags', secs, places, {}, [], 30).places.map((p) => p.title),
      ['Settings › Tags'],
    );
  });
  test('links are capped at max', () => {
    assert.equal(paletteResults('example', secs, places, {}, [], 1).links.length, 1);
  });
});

describe('palette go message', () => {
  const secs = [{ id: '7', title: 'Work' }];
  test('paletteGoMsg carries the type, the tab id and the target', () => {
    assert.equal(PALETTE_GO_MSG, 'palette-go');
    assert.deepEqual(paletteGoMsg(5, { view: 'board' }), { type: 'palette-go', tabId: 5, view: 'board' });
    assert.deepEqual(paletteGoMsg(5, { settings: 'keys' }), { type: 'palette-go', tabId: 5, settings: 'keys' });
  });
  test('isPaletteGo matches only a go message for this tab', () => {
    assert.equal(isPaletteGo({ type: 'palette-go', tabId: 5 }, 5), true);
    assert.equal(isPaletteGo({ type: 'palette-go', tabId: 6 }, 5), false);
    assert.equal(isPaletteGo({ type: 'open-palette', tabId: 5 }, 5), false);
    assert.equal(isPaletteGo({ type: 'palette-go' }, undefined), false);
    assert.equal(isPaletteRequest({ type: 'palette-go', tabId: 5 }, 5), false);
  });
  test('paletteGoTarget finds a place, a folder or a Settings tab', () => {
    assert.equal(paletteGoTarget({ view: 'board' }, PAGES, secs).id, 'board');
    assert.equal(paletteGoTarget({ view: 'schedule' }, PAGES, secs).id, 'schedule');
    assert.equal(paletteGoTarget({ view: '7' }, PAGES, secs), secs[0]);
    assert.deepEqual(paletteGoTarget({ settings: 'dupes' }, PAGES, secs), { settings: 'dupes' });
    assert.equal(paletteGoTarget({ view: '99' }, PAGES, secs), null);
  });
});
