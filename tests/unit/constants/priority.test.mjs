import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PRIS, PRI_NAMES } from '../../../extension/constants/priority.js';

describe('link notes and priority', () => {
  test('levels are High, Medium, Low in that order', () => {
    assert.deepEqual(PRIS, ['high', 'med', 'low']);
    assert.deepEqual(
      PRIS.map((p) => PRI_NAMES[p]),
      ['High', 'Medium', 'Low'],
    );
  });
});
