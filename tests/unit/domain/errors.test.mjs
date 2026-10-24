import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { imageSaveError } from '../../../extension/domain/errors.js';

describe('imageSaveError', () => {
  test('names a full storage', () => {
    assert.match(imageSaveError(new Error('Resource::kQuotaBytes quota exceeded')), /^Not enough storage space/);
  });
  test('falls back to the unreadable image message', () => {
    assert.equal(imageSaveError(new Error('The source image could not be decoded.')), 'That file is not an image the browser can read.');
    assert.equal(imageSaveError(undefined), 'That file is not an image the browser can read.');
  });
});
