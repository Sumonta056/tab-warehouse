import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDist } from '../../tools/build.mjs';

const EXT = resolve(dirname(fileURLToPath(import.meta.url)), '../../extension');
const PAGES = ['newtab', 'popup'];
let dir;
let out;
let again;

function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((d) => {
    const p = join(root, d.name);
    return d.isDirectory() ? files(p) : [p];
  });
}

const rel = (root, p) => relative(root, p).split(sep).join('/');
const read = (p) => readFileSync(join(out, p), 'utf8');

function manifestPaths(m) {
  return [
    m.background.service_worker,
    m.chrome_url_overrides.newtab,
    m.action.default_popup,
    ...Object.values(m.action.default_icon),
    ...Object.values(m.icons),
  ];
}

function references(file, text) {
  if (file.endsWith('.html')) return [...text.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  if (file.endsWith('.css')) return [...text.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
  if (file.endsWith('.js')) return [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]);
  return [];
}

const cssText = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/[\s"';]+/g, '');

function sourceSheets(page) {
  const html = readFileSync(join(EXT, `${page}.html`), 'utf8');
  return [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
}

describe('release build (tools/build.mjs)', () => {
  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'tw-build-'));
    out = await buildDist(join(dir, 'a'));
    again = await buildDist(join(dir, 'b'));
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  test('every path in manifest.json exists', () => {
    const m = JSON.parse(read('manifest.json'));
    assert.deepEqual(
      manifestPaths(m).filter((p) => !existsSync(join(out, p))),
      [],
    );
  });

  for (const page of PAGES) {
    test(`${page}.html loads one stylesheet and one module script, no inline script, no preload`, () => {
      const html = read(`${page}.html`);
      assert.deepEqual(
        [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]),
        [`${page}.css`],
      );
      assert.deepEqual(
        [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map((m) => m[1]),
        [`${page}.js`],
      );
      assert.equal((html.match(/<script\b/g) || []).length, 1);
      assert.ok(!html.includes('modulepreload'));
    });

    test(`${page}.css holds every source stylesheet unchanged, in the HTML order`, () => {
      const sheets = sourceSheets(page);
      assert.ok(sheets.length > 5);
      const want = cssText(sheets.map((s) => readFileSync(join(EXT, s), 'utf8')).join('\n'));
      assert.equal(cssText(read(`${page}.css`)), want);
    });
  }

  test('the service worker is one file without import()', () => {
    const src = read('background.js');
    assert.ok(!/\bimport\s*\(/.test(src));
    assert.deepEqual(references('background.js', src), []);
  });

  test('the popup is one file; the new tab loads its views lazily from chunks', () => {
    assert.deepEqual(references('popup.js', read('popup.js')), []);
    const lazy = [...read('newtab.js').matchAll(/\bimport\(\s*"(\.\/chunks\/[^"]+)"\s*\)/g)].map((m) => m[1]);
    assert.ok(lazy.length >= 6, `lazy chunks: ${lazy.join(', ')}`);
  });

  test('no file in dist references a path that does not exist', () => {
    const missing = [];
    for (const abs of files(out)) {
      const file = rel(out, abs);
      if (!/\.(html|css|js)$/.test(file)) continue;
      for (const ref of references(file, readFileSync(abs, 'utf8'))) {
        if (/^(https?:|data:|#)/.test(ref)) continue;
        if (!existsSync(resolve(dirname(abs), ref))) missing.push(`${file} -> ${ref}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test('the bundle stays readable: not minified, source paths kept as comments', () => {
    const js = read('newtab.js');
    assert.ok(js.includes('// newtab.js'));
    assert.ok(js.split('\n').every((l) => l.length < 400));
    assert.match(js, /\bfunction [a-zA-Z]{6,}\(/);
  });

  test('the build is deterministic', () => {
    const list = (root) =>
      files(root)
        .map((p) => rel(root, p))
        .sort();
    assert.deepEqual(list(again), list(out));
    for (const f of list(out)) assert.ok(readFileSync(join(out, f)).equals(readFileSync(join(again, f))), f);
  });
});
