import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';

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
  test('ENVS order is fixed (CSS depends on it)', () => {
    assert.deepEqual(ENVS, ['PROD', 'TEST', 'STAGE', 'LOCAL']);
  });
});
