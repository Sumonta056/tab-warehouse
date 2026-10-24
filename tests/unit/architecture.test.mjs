import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = resolve(dirname(fileURLToPath(import.meta.url)), '../../extension');

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

function importsOf(abs) {
  const src = readFileSync(abs, 'utf8');
  const re = /^\s*(?:import|export)\s[^;]*?\sfrom\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm;
  return [...src.matchAll(re)].map((m) => m[1] || m[2]).filter((s) => s.startsWith('.'));
}

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
});
