import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FOLDERS = process.argv.slice(2).length ? process.argv.slice(2) : ['dist'];
const COLD = Number(process.env.COLD || 10);
const WARM = Number(process.env.WARM || 15);
const LIMITS = { readyMs: Number(process.env.READY_MS || 60), requests: Number(process.env.REQUESTS || 25) };

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = join(homedir(), 'Library/Caches/ms-playwright');
  if (!existsSync(base)) return null;
  for (const d of readdirSync(base)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .reverse()) {
    for (const arch of ['chrome-mac-arm64', 'chrome-mac', 'chrome-mac-x64']) {
      const p = join(base, d, arch, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
      if (existsSync(p)) return p;
    }
  }
  return null;
}

const CHROME = findChrome();
if (!CHROME) {
  console.error('No Chrome for Testing found. Run: npx playwright install chromium   or set CHROME=/path/to/chrome-for-testing');
  process.exit(2);
}
for (const f of FOLDERS) {
  if (!existsSync(join(ROOT, f, 'manifest.json'))) {
    console.error(`No manifest.json in ${f}. Run npm run build for dist/.`);
    process.exit(2);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(ext) {
  const profile = mkdtempSync(join(tmpdir(), 'warehouse-load-'));
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      `--load-extension=${ext}`,
      `--disable-extensions-except=${ext}`,
      '--remote-debugging-pipe',
      '--window-size=1400,900',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  );
  const pending = new Map();
  const handlers = [];
  let seq = 0;
  let buf = '';
  proc.stdio[4].on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\0')) >= 0) {
      const msg = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (msg.method) for (const h of handlers) h(msg);
      if (!msg.id || !pending.has(msg.id)) continue;
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.rej(new Error(JSON.stringify(msg.error)));
      else p.res(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const m = { id: ++seq, method, params, ...(sessionId ? { sessionId } : {}) };
      pending.set(m.id, { res, rej });
      proc.stdio[3].write(JSON.stringify(m) + '\0');
    });
  const close = async () => {
    proc.kill();
    await new Promise((r) => {
      proc.once('exit', r);
      setTimeout(r, 3000);
    });
    await sleep(300);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  return { send, on: (h) => handlers.push(h), close };
}

const evaluator = (send, s) => async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

const MARK = `(() => {
  window.__t = {};
  const mark = (k) => { if (!window.__t[k]) window.__t[k] = performance.now(); };
  new MutationObserver(() => {
    if (document.querySelector('#nav .nav')) mark('nav');
    if (document.querySelector('#home .tile, #home .home-empty')) mark('home');
  }).observe(document, { childList: true, subtree: true });
})()`;

async function extId(b) {
  await b.send('Target.setDiscoverTargets', { discover: true });
  for (let i = 0; i < 40; i++) {
    const { targetInfos } = await b.send('Target.getTargets');
    const sw = targetInfos.find((t) => t.type === 'service_worker' && t.url.endsWith('/background.js'));
    if (sw) return new URL(sw.url).host;
    await sleep(100);
  }
  throw new Error('The service worker did not start.');
}

async function measure(b, url, seeded) {
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  await b.send('Page.enable', {}, s);
  await b.send('Network.enable', {}, s);
  let requests = 0;
  b.on((m) => {
    if (m.sessionId === s && m.method === 'Network.requestWillBeSent' && m.params.request.url.startsWith('chrome-extension://')) requests++;
  });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: MARK }, s);
  await b.send('Page.navigate', { url }, s);
  const ev = evaluator(b.send, s);
  let t = null;
  for (let i = 0; i < 100; i++) {
    await sleep(50);
    t = await ev(`({ ...window.__t, ready: document.readyState })`).catch(() => null);
    if (t?.home && (!seeded || t.nav) && t.ready === 'complete') break;
  }
  await sleep(300);
  const dcl = await ev(`performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd`);
  await b.send('Target.closeTarget', { targetId });
  return { ready: Math.max(t?.home || 0, seeded ? t?.nav || 0 : 0), dcl, requests };
}

async function seed(b, id) {
  const { targetId } = await b.send('Target.createTarget', { url: `chrome-extension://${id}/newtab.html` });
  const { sessionId: s } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const ev = evaluator(b.send, s);
  for (let i = 0; i < 100 && !(await ev(`!!(window.chrome && chrome.bookmarks)`).catch(() => false)); i++) await sleep(100);
  await sleep(500);
  await ev(`(async () => {
    const [tree] = await chrome.bookmarks.getTree();
    const root = await chrome.bookmarks.create({ parentId: tree.children[0].id, title: 'My Links' });
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, rootId: root.id } });
    for (let f = 0; f < 10; f++) {
      const folder = await chrome.bookmarks.create({ parentId: root.id, title: 'Folder ' + f });
      for (let i = 0; i < 50; i++) await chrome.bookmarks.create({ parentId: folder.id, title: 'Service ' + i, url: 'https://e' + f + '.example.com/p/' + i });
    }
  })()`);
  await b.send('Target.closeTarget', { targetId });
  await sleep(500);
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return +((s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2).toFixed(1);
};

const runs = Object.fromEntries(FOLDERS.map((f) => [f, { cold: [], warm: [] }]));

for (let i = 0; i < COLD; i++) {
  for (const f of i % 2 ? [...FOLDERS].reverse() : FOLDERS) {
    const b = await launch(join(ROOT, f));
    const id = await extId(b);
    await sleep(500);
    runs[f].cold.push(await measure(b, `chrome-extension://${id}/newtab.html`, false));
    await b.close();
  }
}

for (const f of FOLDERS) {
  const b = await launch(join(ROOT, f));
  const id = await extId(b);
  await seed(b, id);
  for (let i = 0; i < WARM; i++) runs[f].warm.push(await measure(b, `chrome-extension://${id}/newtab.html`, true));
  await b.close();
}

const summary = (rows) => {
  const ok = rows.filter((r) => r.ready > 0);
  return { n: ok.length, readyMs: median(ok.map((r) => r.ready)), dclMs: median(ok.map((r) => r.dcl)), requests: median(ok.map((r) => r.requests)) };
};
const result = Object.fromEntries(FOLDERS.map((f) => [f, { cold: summary(runs[f].cold), warm: summary(runs[f].warm) }]));

console.log('Cold: fresh profile, no bookmarks, ready = Home rendered (ms from navigation start)');
console.table(Object.fromEntries(FOLDERS.map((f) => [f, result[f].cold])));
console.log('Warm: same browser, 500 links in 10 folders, ready = Home and sidebar rendered');
console.table(Object.fromEntries(FOLDERS.map((f) => [f, result[f].warm])));

let failed = false;
if (FOLDERS.includes('dist')) {
  const d = result.dist;
  const checks = [
    [`dist cold ready <= ${LIMITS.readyMs} ms`, d.cold.readyMs <= LIMITS.readyMs, d.cold.readyMs],
    [`dist warm ready <= ${LIMITS.readyMs} ms`, d.warm.readyMs <= LIMITS.readyMs, d.warm.readyMs],
    [`dist requests <= ${LIMITS.requests}`, d.cold.requests <= LIMITS.requests, d.cold.requests],
  ];
  for (const [name, pass, value] of checks) {
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${value})`);
    if (!pass) failed = true;
  }
}
console.log('LOAD_RESULT ' + JSON.stringify(result));
process.exit(failed ? 1 : 0);
