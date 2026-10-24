import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'extension');
const PAGES = ['newtab', 'popup'];
const COPY = ['manifest.json', 'icons', '_locales'];
const STYLESHEET = /^[ \t]*<link rel="stylesheet" href="([^"]+)" \/>\n/gm;
const MODULE = /<script type="module" src="([^"]+)"><\/script>/;

const common = {
  bundle: true,
  format: 'esm',
  minify: false,
  charset: 'utf8',
  logLevel: 'silent',
  absWorkingDir: SRC,
  write: true,
};

function stylesheets(html) {
  return [...html.matchAll(STYLESHEET)].map((m) => m[1]);
}

function pageHtml(html, page) {
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) throw new Error(`${page}.html has an inline script`);
  if (!MODULE.test(html)) throw new Error(`${page}.html has no <script type="module" src=…>`);
  let first = true;
  return html
    .replace(STYLESHEET, (line) => {
      if (!first) return '';
      first = false;
      return line.replace(/href="[^"]+"/, `href="${page}.css"`);
    })
    .replace(MODULE, `<script type="module" src="${page}.js"></script>`);
}

function failOnWarnings(result, what) {
  if (!result.warnings.length) return;
  const text = result.warnings.map((w) => `${w.location?.file ?? ''}:${w.location?.line ?? ''} ${w.text}`).join('\n');
  throw new Error(`${what}: esbuild warnings\n${text}`);
}

export async function buildDist(out = join(ROOT, 'dist')) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  for (const page of PAGES) {
    const result = await build({
      ...common,
      entryPoints: [`${page}.js`],
      outdir: out,
      splitting: true,
      entryNames: '[name]',
      chunkNames: `chunks/${page}-[name]-[hash]`,
    });
    failOnWarnings(result, `${page}.js`);
  }

  const worker = await build({
    ...common,
    entryPoints: ['background.js'],
    outfile: join(out, 'background.js'),
    splitting: false,
  });
  failOnWarnings(worker, 'background');
  if (/\bimport\s*\(/.test(readFileSync(join(out, 'background.js'), 'utf8')))
    throw new Error('background.js has a dynamic import(); service workers forbid it');

  for (const page of PAGES) {
    const html = readFileSync(join(SRC, `${page}.html`), 'utf8');
    const sheets = stylesheets(html);
    if (!sheets.length) throw new Error(`${page}.html has no stylesheet`);
    const css = await build({
      ...common,
      stdin: { contents: sheets.map((s) => `@import ${JSON.stringify(`./${s}`)};`).join('\n'), resolveDir: SRC, sourcefile: `${page}.css`, loader: 'css' },
      outfile: join(out, `${page}.css`),
    });
    failOnWarnings(css, `${page}.css`);
    writeFileSync(join(out, `${page}.html`), pageHtml(html, page));
  }

  for (const item of COPY) {
    if (existsSync(join(SRC, item))) cpSync(join(SRC, item), join(out, item), { recursive: true });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] || join(ROOT, 'dist'));
  try {
    await buildDist(out);
    console.log(`Built ${out}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
