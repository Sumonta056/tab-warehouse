import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BOARD, DEFAULT_HOME, DEFAULT_SIDE_LOOK } from '../../../extension/constants/defaults.js';
import { SIDE_WIDTH } from '../../../extension/constants/limits.js';
import {
  loadSettings,
  saveSettings,
  loadLinkMeta,
  setLinkMeta,
  saveLinkMeta,
  onStorageChange,
  loadHomeStore,
  saveHomeIcons,
  saveHomeBg,
} from '../../../extension/services/storage.js';
import { fakeChrome } from '../fake-chrome.mjs';

describe('settings storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => ({ [k]: store[k] }),
          set: async (o) => {
            Object.assign(store, JSON.parse(JSON.stringify(o)));
          },
        },
      },
    };
  });
  test('fresh install returns all defaults', async () => {
    const s = await loadSettings();
    assert.deepEqual(s.categories, []);
    assert.deepEqual(s.folderCat, {});
    assert.deepEqual(s.partColors, {});
    assert.equal(s.sideWidth, SIDE_WIDTH.initial);
    assert.deepEqual(s.home, DEFAULT_HOME);
    assert.deepEqual(s.envRules, [], 'no default labels');
    assert.deepEqual(s.hostMap, [], 'no default sites');
    assert.deepEqual(s.customTags, [], 'no custom tags');
  });
});

describe('settings storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => ({ [k]: store[k] }),
          set: async (o) => {
            Object.assign(store, JSON.parse(JSON.stringify(o)));
          },
        },
      },
    };
  });
  test('saveSettings merges a patch and keeps other keys', async () => {
    await saveSettings({ order: ['a'] });
    await saveSettings({ sideWidth: 300 });
    const s = await loadSettings();
    assert.deepEqual(s.order, ['a']);
    assert.equal(s.sideWidth, 300);
  });
});

describe('settings storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => ({ [k]: store[k] }),
          set: async (o) => {
            Object.assign(store, JSON.parse(JSON.stringify(o)));
          },
        },
      },
    };
  });
  test('old stored home object without new keys still gets defaults', async () => {
    store.settings = { home: { color: '#000000' } };
    const s = await loadSettings();
    assert.equal(s.home.color, '#000000');
    assert.equal(s.home.perRow, DEFAULT_HOME.perRow);
  });
});

describe('settings storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => ({ [k]: store[k] }),
          set: async (o) => {
            Object.assign(store, JSON.parse(JSON.stringify(o)));
          },
        },
      },
    };
  });
  test('board defaults to By category and old stored objects gain new board keys', async () => {
    assert.deepEqual(DEFAULT_BOARD, { group: 'cat' });
    assert.deepEqual((await loadSettings()).board, { group: 'cat' });
    store.settings = { board: { group: 'flat' } };
    assert.equal((await loadSettings()).board.group, 'flat');
    store.settings = { board: {} };
    assert.equal((await loadSettings()).board.group, 'cat');
    store.settings = { userName: 'x' };
    assert.equal((await loadSettings()).board.group, 'cat');
  });
});

describe('settings storage', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => ({ [k]: store[k] }),
          set: async (o) => {
            Object.assign(store, JSON.parse(JSON.stringify(o)));
          },
        },
      },
    };
  });
  test('Board text size defaults to 100 % and old stored settings gain it', async () => {
    store.settings = { fontPage: 120 };
    const s = await loadSettings();
    assert.equal(s.fontBoard, 100);
    assert.equal(s.fontPage, 120);
  });
});

describe('themes', () => {
  test('loadSettings defaults theme to blue', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    assert.equal((await loadSettings()).theme, 'blue');
  });
});

describe('sidebar look', () => {
  test('loadSettings merges sideLook one level deep over the defaults', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({ settings: { sideLook: { mode: 'image' } } }) } } };
    assert.deepEqual((await loadSettings()).sideLook, { ...DEFAULT_SIDE_LOOK, mode: 'image' });
  });
});

describe('no built-in company or personal data', () => {
  test('fresh-install settings hold no company names, hosts or labels', async () => {
    globalThis.chrome = { storage: { local: { get: async () => ({}) } } };
    const s = await loadSettings();
    assert.equal(s.rootName, '');
    assert.deepEqual([s.envRules, s.hostMap], [[], []]);
    assert.doesNotMatch(JSON.stringify(s), /shop\.example|My Links|Sprint tasks|sumonta|gitbook|vercel/i);
  });
});

describe('link meta, Home store and storage events', () => {
  test('setLinkMeta stores a cleaned entry and removes it when it is empty', async () => {
    const ch = fakeChrome();
    let all = await setLinkMeta('11', { note: '  call Ann  ', pri: 'urgent' });
    assert.deepEqual(all, { 11: { note: 'call Ann' } });
    assert.deepEqual(await loadLinkMeta(), { 11: { note: 'call Ann' } });
    await setLinkMeta('12', { pri: 'high' });
    all = await setLinkMeta('11', { note: '' });
    assert.deepEqual(all, { 12: { pri: 'high' } });
    assert.deepEqual(ch.data.linkMeta, { 12: { pri: 'high' } });
  });

  test('loadLinkMeta is empty on a fresh install; saveLinkMeta replaces everything', async () => {
    fakeChrome();
    assert.deepEqual(await loadLinkMeta(), {});
    await saveLinkMeta({ 5: { pri: 'low' } });
    assert.deepEqual(await loadLinkMeta(), { 5: { pri: 'low' } });
  });

  test('Home icons and background load with empty defaults and save separately', async () => {
    const ch = fakeChrome();
    assert.deepEqual(await loadHomeStore(), { icons: {}, bg: '' });
    await saveHomeIcons({ 71: 'data:image/png;base64,AAA' });
    await saveHomeBg('data:image/jpeg;base64,BBB');
    assert.deepEqual(await loadHomeStore(), { icons: { 71: 'data:image/png;base64,AAA' }, bg: 'data:image/jpeg;base64,BBB' });
    assert.equal(ch.data.settings, undefined, 'never written into settings');
    await saveHomeBg('');
    assert.equal('homeBg' in ch.data, false, 'an empty background removes the key');
  });

  test('onStorageChange registers a listener', () => {
    const ch = fakeChrome();
    let seen = null;
    onStorageChange((changes, area) => (seen = [Object.keys(changes), area]));
    ch.storage.onChanged.fire({ settings: {} }, 'local');
    assert.deepEqual(seen, [['settings'], 'local']);
  });
});
