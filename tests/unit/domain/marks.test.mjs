import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanMark, markAttrs, withMark } from '../../../extension/domain/marks.js';

describe('marks', () => {
  test('cleanMark keeps a preset name or a #rrggbb color (lower-cased) and drops the rest', () => {
    assert.equal(cleanMark('red'), 'red');
    assert.equal(cleanMark('#FF00AA'), '#ff00aa');
    for (const bad of ['pink', '#ff00a', '#ff00aag', 'ff00aa', 'red;x', '#fff', '', null, undefined, 3, {}]) assert.equal(cleanMark(bad), null, String(bad));
  });

  test('markAttrs: a preset name is data-color; a hex is data-color=custom with --c; nothing keeps the dataset as it is', () => {
    assert.deepEqual(markAttrs('blue'), { dataset: { color: 'blue' }, style: null });
    assert.deepEqual(markAttrs('#12ABcd', { part: '7' }), { dataset: { part: '7', color: 'custom' }, style: { '--c': '#12abcd' } });
    assert.deepEqual(markAttrs(null, { part: '7' }), { dataset: { part: '7' } });
    assert.deepEqual(markAttrs('url(x)'), { dataset: null });
  });

  test('withMark sets or removes one id without changing the old map', () => {
    const map = { 1: 'red' };
    assert.deepEqual(withMark(map, '2', '#00FF00'), { 1: 'red', 2: '#00ff00' });
    assert.deepEqual(withMark(map, '1', null), {});
    assert.deepEqual(withMark(map, '1', 'bad'), {});
    assert.deepEqual(map, { 1: 'red' });
  });
});
