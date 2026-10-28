import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = resolve(dirname(fileURLToPath(import.meta.url)), '../../extension');
const UNSCALED = ['styles/views/popup.css'];

function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return cssFiles(p);
    return d.name.endsWith('.css') ? [relative(EXT, p).split(sep).join('/')] : [];
  });
}

const linksOf = (page) => [...readFileSync(join(EXT, page), 'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const pages = { newtab: linksOf('newtab.html'), popup: linksOf('popup.html') };

test('every stylesheet a page links exists', () => {
  for (const [page, links] of Object.entries(pages)) for (const href of links) assert.ok(existsSync(join(EXT, href)), `${page}.html links missing ${href}`);
});

test('every file in styles/ is linked by a page', () => {
  const linked = new Set([...pages.newtab, ...pages.popup]);
  assert.deepEqual(
    cssFiles(join(EXT, 'styles')).filter((f) => !linked.has(f)),
    [],
  );
});

test('pages link tokens, then base, then ui pieces, then views', () => {
  const rank = (f) => (f === 'styles/tokens.css' ? 0 : f === 'styles/base.css' ? 1 : f.startsWith('styles/ui/') ? 2 : f.startsWith('styles/views/') ? 3 : 9);
  for (const [page, links] of Object.entries(pages)) {
    const ranks = links.map(rank);
    assert.deepEqual(
      ranks,
      [...ranks].sort((a, b) => a - b),
      `${page}.html link order`,
    );
    assert.ok(!ranks.includes(9), `${page}.html links a file outside styles/`);
  }
});

test('the pages carry no inline <style> blocks', () => {
  for (const page of ['newtab.html', 'popup.html']) assert.ok(!/<style[\s>]/.test(readFileSync(join(EXT, page), 'utf8')), page);
});

test('every px font-size scales with --fs (except the popup)', () => {
  const bad = cssFiles(join(EXT, 'styles'))
    .filter((f) => !UNSCALED.includes(f))
    .flatMap((f) =>
      readFileSync(join(EXT, f), 'utf8')
        .split('\n')
        .filter((l) => /font-size:\s*[\d.]+px/.test(l))
        .map((l) => `${f}: ${l.trim()}`),
    );
  assert.deepEqual(bad, []);
});

test('Up next and the Today count take their colors only from tokens', () => {
  const rules = (f) => [...readFileSync(join(EXT, f), 'utf8').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
  const bad = [
    ...rules('styles/views/home.css').filter(([sel]) => /\.up-/.test(sel)),
    ...rules('styles/views/sidebar.css').filter(([sel]) => /\.today-cnt/.test(sel)),
  ]
    .filter(([, body]) => /rgba?\(|hsla?\(|#[0-9a-f]{3,8}\b/i.test(body))
    .map(([sel]) => sel);
  assert.deepEqual(bad, []);
});
