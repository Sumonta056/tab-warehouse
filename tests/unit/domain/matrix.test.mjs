import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ENVS } from '../../../extension/constants/envs.js';
import { buildMatrix, matrixLinks, matrixMissing, queryLabel } from '../../../extension/domain/matrix.js';
import { SAMPLE_ENV_RULES, SAMPLE_HOST_MAP, L } from '../fixtures.mjs';

describe('buildMatrix', () => {
  test('groups the same path across envs; no-env links go to rest', () => {
    const { rows, rest } = buildMatrix(
      [L('1', 'p', 'https://shop.example.com/api/x?q=1'), L('2', 't', 'https://test.shop.example.com/api/x'), L('3', 'n', 'https://github.com/a')],
      SAMPLE_ENV_RULES,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].key, '/api/x');
    assert.equal(rows[0].cells.PROD.length, 1);
    assert.equal(rows[0].cells.TEST.length, 1);
    assert.deepEqual(
      rest.map((x) => x.id),
      ['3'],
    );
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

  test('buildMatrix has one cell per tag; a link with an unknown tag goes to rest', () => {
    const links = [L('1', 'p', 'https://shop.example.com/a'), L('2', 'q', 'https://qa.example.com/a')];
    const m = buildMatrix(links, rules, tags);
    assert.deepEqual(Object.keys(m.rows[0].cells), tags);
    assert.equal(m.rows[0].cells.QA[0].id, '2');
    assert.deepEqual(
      buildMatrix(links, rules).rest.map((x) => x.id),
      ['2'],
    );
  });
});

describe('matrix row helpers', () => {
  const tags = [...ENVS];
  const row = {
    key: '/a',
    cells: {
      PROD: [L('1', 'p', 'https://shop.example.com/a')],
      TEST: [L('2', 't', 'https://test.shop.example.com/a'), L('3', 't2', 'https://test.shop.example.com/a?x=1')],
      STAGE: [],
      LOCAL: [],
    },
  };
  test('matrixLinks lists every link of the row in tag order', () => {
    assert.deepEqual(
      matrixLinks(row, tags).map((x) => x.id),
      ['1', '2', '3'],
    );
  });
  test('matrixMissing derives the empty tags from the first link', () => {
    assert.deepEqual(matrixMissing(row, tags, SAMPLE_HOST_MAP), [
      { env: 'STAGE', url: 'https://stage.shop.example.com/a' },
      { env: 'LOCAL', url: 'http://localhost:8080/a' },
    ]);
    assert.deepEqual(matrixMissing(row, tags, []), []);
  });
  test('queryLabel shows the query part', () => {
    assert.equal(queryLabel('https://a.com/x'), 'open');
    assert.equal(queryLabel('https://a.com/x?id=7&b=2'), 'open ?id=7&b=2');
    assert.equal(queryLabel('not a url'), 'open');
  });
});
