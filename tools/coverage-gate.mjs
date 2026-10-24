import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GATES = { 'extension/domain/': 90, 'extension/services/': 80 };

export function parseCoverage(text) {
  const rows = {};
  const stack = [];
  let inside = false;
  for (const raw of text.split('\n')) {
    if (raw.startsWith('# start of coverage report')) inside = true;
    if (raw.startsWith('# end of coverage report')) inside = false;
    if (!inside) continue;
    const m = raw.match(/^# (\s*)([^|]+?)\s*\|\s*([\d.]*)\s*\|/);
    if (!m || m[2] === 'file' || m[2] === 'all files') continue;
    const [, indent, name, line] = m;
    if (name.includes('/')) {
      if (line) rows[name] = Number(line);
      continue;
    }
    const depth = indent.length;
    stack.length = depth;
    stack[depth] = name;
    if (line && name.endsWith('.js')) rows[stack.filter(Boolean).join('/')] = Number(line);
  }
  return rows;
}

export function checkGates(rows, files) {
  const failures = [];
  for (const [prefix, min] of Object.entries(GATES)) {
    for (const f of files.filter((x) => x.startsWith(prefix))) {
      const pct = rows[f] ?? 0;
      if (pct < min) failures.push(`${f}: ${pct.toFixed(2)} % lines < ${min} %${f in rows ? '' : ' (no test loads it)'}`);
    }
  }
  return failures;
}

const layerFiles = () =>
  Object.keys(GATES).flatMap((prefix) =>
    readdirSync(join(ROOT, prefix))
      .filter((f) => f.endsWith('.js'))
      .map((f) => prefix + f),
  );

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const run = spawnSync(process.execPath, ['--test', '--experimental-test-coverage', 'tests/unit/'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = `${run.stdout}\n${run.stderr}`;
  for (const l of out.split('\n')) if (/^# (tests|pass|fail) |^not ok|^\s+not ok/.test(l)) console.log(l);
  const rows = parseCoverage(out);
  const files = layerFiles();
  const failures = checkGates(rows, files);
  for (const [prefix, min] of Object.entries(GATES)) {
    const mine = files.filter((f) => f.startsWith(prefix)).map((f) => rows[f] ?? 0);
    console.log(`coverage ${prefix.padEnd(20)} lowest ${Math.min(...mine).toFixed(2)} % (gate ${min} %)`);
  }
  if (failures.length) console.log(`coverage gate FAILED:\n  ${failures.join('\n  ')}`);
  process.exit(run.status || failures.length ? 1 : 0);
}
