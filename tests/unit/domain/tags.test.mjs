import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';
import { TAG_COLORS } from '../../../extension/constants/tags.js';
import { cleanTags, tagNameError, tagNames, tagPlain } from '../../../extension/domain/tags.js';

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];
  const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: '', QA: 'qa.example.com' }];

  test('tagNameError: 1 to 8 capital letters or digits, not reserved, not taken', () => {
    assert.equal(tagNameError('QA'), '');
    assert.equal(tagNameError('UAT2'), '');
    assert.equal(tagNameError('ABCDEFGH'), '');
    assert.equal(tagNameError(''), 'Use 1 to 8 capital letters or digits.');
    assert.equal(tagNameError('ABCDEFGHI'), 'Use 1 to 8 capital letters or digits.');
    assert.equal(tagNameError('qa'), 'Use 1 to 8 capital letters or digits.');
    assert.equal(tagNameError('Q-A'), 'Use 1 to 8 capital letters or digits.');
    for (const n of ['PROD', 'TEST', 'STAGE', 'LOCAL', 'DEV', 'GH', 'NONE', 'TEAL']) assert.equal(tagNameError(n), `${n} is a built-in name.`, n);
    assert.equal(tagNameError('QA', ['QA']), 'There is already a tag QA.');
  });
});

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];
  const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: '', QA: 'qa.example.com' }];

  test('TAG_COLORS are 6 fixed colors', () => assert.deepEqual(TAG_COLORS, ['teal', 'pink', 'yellow', 'red', 'cyan', 'grey']));
  test('cleanTags keeps valid unique tags, upper-cases names, fixes colors, cuts plain names', () => {
    assert.deepEqual(
      cleanTags([
        QA,
        { name: ' uat ', plain: ' Users ', color: 'nope' },
        { name: 'QA', plain: 'again', color: 'red' },
        { name: 'PROD', color: 'red' },
        { name: 'TOOLONGNAME', color: 'red' },
        { name: 7 },
        null,
        { name: 'DEMO', plain: 'x'.repeat(50), color: 'pink' },
      ]),
      [QA, { name: 'UAT', plain: 'Users', color: 'teal' }, { name: 'DEMO', plain: 'x'.repeat(40), color: 'pink' }],
    );
    assert.deepEqual(cleanTags('bad'), []);
    assert.deepEqual(cleanTags(undefined), []);
  });
});

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];
  const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: '', QA: 'qa.example.com' }];

  test('tagNames: built-ins first, then custom tags in their order', () => {
    assert.deepEqual(tagNames({ customTags: [QA, { name: 'UAT' }] }), ['PROD', 'TEST', 'STAGE', 'LOCAL', 'QA', 'UAT']);
    assert.deepEqual(tagNames({}), ENVS);
  });
});

describe('custom tags', () => {
  const QA = { name: 'QA', plain: 'QA team', color: 'teal' };
  const tags = [...ENVS, 'QA'];
  const rules = [
    { pattern: 'qa.example.com', env: 'QA' },
    { pattern: 'test.', env: 'TEST' },
    { pattern: 'shop.example.com', env: 'PROD' },
  ];
  const map = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: '', LOCAL: '', QA: 'qa.example.com' }];

  test('tagPlain: built-in plain name, custom plain name, else the name', () => {
    const s = { customTags: [QA, { name: 'UAT', plain: '', color: 'red' }] };
    assert.equal(tagPlain(s, 'PROD'), 'Live');
    assert.equal(tagPlain(s, 'QA'), 'QA team');
    assert.equal(tagPlain(s, 'UAT'), 'UAT');
  });
});
