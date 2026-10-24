import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const UNIT = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(UNIT, '../../extension');
const TESTED = ['domain', 'services'];
const UNTESTED = {};

const LAYERS = ['constants', 'domain', 'services', 'ui', 'state', 'views', 'entry'];
const PURE = ['constants', 'domain'];
const CHROME_OK = ['services'];
const usesWord = (src, word) => new RegExp(`(^|[^\\w.$])${word.replace('.', '\\.')}`).test(src);

function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return jsFiles(p);
    return d.name.endsWith('.js') ? [p] : [];
  });
}

const rel = (p) => relative(EXT, p).split(sep).join('/');

function layerOf(file) {
  const parts = file.split('/');
  if (parts.length === 1) return 'entry';
  return LAYERS.includes(parts[0]) && parts[0] !== 'entry' ? parts[0] : null;
}

function viewOf(file) {
  const parts = file.split('/');
  return parts[0] === 'views' && parts.length > 2 ? parts[1] : null;
}

function staticImportsOf(abs) {
  const src = readFileSync(abs, 'utf8');
  const re = /^\s*(?:import|export)\s[^;]*?\sfrom\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm;
  return [...src.matchAll(re)].map((m) => m[1] || m[2]).filter((s) => s.startsWith('.'));
}

function dynamicImportsOf(abs) {
  const src = readFileSync(abs, 'utf8');
  return [...src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]).filter((s) => s.startsWith('.'));
}

const importsOf = (abs) => [...staticImportsOf(abs), ...dynamicImportsOf(abs)];

function eagerGraph(entry) {
  const seen = new Set();
  const walk = (abs) => {
    for (const spec of staticImportsOf(abs)) {
      const next = resolve(dirname(abs), spec);
      if (seen.has(next)) continue;
      seen.add(next);
      walk(next);
    }
  };
  walk(join(EXT, entry));
  return [...seen].map(rel).sort();
}

function preloads(html) {
  const src = readFileSync(join(EXT, html), 'utf8');
  return [...src.matchAll(/<link\s+rel="modulepreload"\s+href="([^"]+)"/g)].map((m) => m[1]).sort();
}

const EAGER_VIEWS = ['home', 'sidebar'];

const files = jsFiles(EXT).map((abs) => ({ abs, file: rel(abs) }));

describe('architecture', () => {
  test('every file is in a known layer', () => {
    const unknown = files.filter(({ file }) => !layerOf(file)).map(({ file }) => file);
    assert.deepEqual(unknown, []);
  });

  test('imports only point to the same layer or layers to the left', () => {
    const bad = [];
    for (const { abs, file } of files) {
      for (const spec of importsOf(abs)) {
        const target = rel(resolve(dirname(abs), spec));
        if (!existsSync(join(EXT, target))) {
          bad.push(`${file} -> ${spec} (missing)`);
          continue;
        }
        const from = LAYERS.indexOf(layerOf(file));
        const to = LAYERS.indexOf(layerOf(target));
        if (to > from) bad.push(`${file} (${layerOf(file)}) -> ${target} (${layerOf(target)})`);
        const a = viewOf(file);
        const b = viewOf(target);
        if (a && b && a !== b) bad.push(`${file} -> ${target} (a view imports another view)`);
      }
    }
    assert.deepEqual(bad, []);
  });

  test('constants and domain do not touch document, window or chrome', () => {
    const bad = [];
    for (const { abs, file } of files) {
      if (!PURE.includes(layerOf(file))) continue;
      const src = readFileSync(abs, 'utf8');
      for (const word of ['document.', 'window.', 'chrome.']) if (usesWord(src, word)) bad.push(`${file} uses ${word}`);
    }
    assert.deepEqual(bad, []);
  });

  test('only services call chrome.*', () => {
    const bad = files
      .filter(({ file }) => !CHROME_OK.includes(layerOf(file)))
      .filter(({ abs }) => usesWord(readFileSync(abs, 'utf8'), 'chrome.'))
      .map(({ file }) => file);
    assert.deepEqual(bad, []);
  });

  test('every domain and services file has its own unit test file', () => {
    const missing = files
      .filter(({ file }) => TESTED.includes(layerOf(file)))
      .map(({ file }) => file.replace(/\.js$/, ''))
      .filter((f) => !UNTESTED[f] && !existsSync(join(UNIT, `${f}.test.mjs`)))
      .map((f) => `tests/unit/${f}.test.mjs`);
    assert.deepEqual(missing, []);
  });
});

describe('module preload', () => {
  for (const page of ['newtab', 'popup']) {
    test(`${page}.html preloads exactly the modules ${page}.js imports statically`, () => {
      const want = eagerGraph(`${page}.js`);
      const have = preloads(`${page}.html`);
      const missing = want.filter((f) => !have.includes(f)).map((f) => `add <link rel="modulepreload" href="${f}" />`);
      const extra = have.filter((f) => !want.includes(f)).map((f) => `remove ${f} (not a static import of ${page}.js)`);
      assert.deepEqual([...missing, ...extra], []);
    });
  }

  test('newtab.js loads every view except Home and the sidebar with import()', () => {
    const eager = eagerGraph('newtab.js')
      .filter((f) => viewOf(f) && !EAGER_VIEWS.includes(viewOf(f)))
      .map((f) => `${f} is imported statically; load its view with import() in newtab.js`);
    assert.deepEqual(eager, []);
  });
});
