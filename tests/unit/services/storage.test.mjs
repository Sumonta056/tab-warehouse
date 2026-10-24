import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BOARD, DEFAULT_HOME, DEFAULT_SIDE_LOOK } from '../../../extension/constants/defaults.js';
import { SIDE_WIDTH } from '../../../extension/constants/limits.js';
import { loadSettings, saveSettings } from '../../../extension/services/storage.js';

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
