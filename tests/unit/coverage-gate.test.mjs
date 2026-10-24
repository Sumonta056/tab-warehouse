import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoverage, checkGates } from '../../tools/coverage-gate.mjs';

const FLAT = `# start of coverage report
# --------------------------------------------------------------
# file                         | line % | branch % | funcs % | uncovered lines
# --------------------------------------------------------------
# extension/domain/a.js        | 100.00 |   100.00 |  100.00 |
# extension/services/b.js      |  57.14 |   100.00 |   22.22 | 17-19
# tests/unit/x.test.mjs        | 100.00 |   100.00 |  100.00 |
# --------------------------------------------------------------
# all files                    |  98.00 |    97.00 |   96.00 |
# end of coverage report`;

const TREE = `# start of coverage report
# file              | line % | branch % | funcs % | uncovered lines
# extension         |        |          |         |
#  domain           |        |          |         |
#   a.js            |  95.50 |   100.00 |  100.00 |
#  services         |        |          |         |
#   b.js            |  70.00 |   100.00 |  100.00 | 3-4
# all files         |  90.00 |   100.00 |  100.00 |
# end of coverage report`;

describe('coverage gate', () => {
  test('reads line coverage from the flat report (Node 20)', () => {
    assert.deepEqual(parseCoverage(`noise\n${FLAT}\n# tests 3`), {
      'extension/domain/a.js': 100,
      'extension/services/b.js': 57.14,
      'tests/unit/x.test.mjs': 100,
    });
  });

  test('reads line coverage from the tree report (newer Node)', () => {
    assert.deepEqual(parseCoverage(TREE), { 'extension/domain/a.js': 95.5, 'extension/services/b.js': 70 });
  });

  test('fails a domain file under 90 %, a services file under 80 %, and a file no test loads', () => {
    const rows = { 'extension/domain/a.js': 89.99, 'extension/domain/b.js': 90, 'extension/services/c.js': 80, 'extension/services/d.js': 79.9 };
    const files = [...Object.keys(rows), 'extension/domain/new.js'];
    assert.deepEqual(checkGates(rows, files), [
      'extension/domain/a.js: 89.99 % lines < 90 %',
      'extension/domain/new.js: 0.00 % lines < 90 % (no test loads it)',
      'extension/services/d.js: 79.90 % lines < 80 %',
    ]);
  });

  test('passes when every file meets its gate', () => {
    assert.deepEqual(checkGates({ 'extension/domain/a.js': 100, 'extension/services/b.js': 80 }, ['extension/domain/a.js', 'extension/services/b.js']), []);
  });
});
