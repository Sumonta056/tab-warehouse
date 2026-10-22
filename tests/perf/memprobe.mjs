import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT = resolve(dirname(fileURLToPath(import.meta.url)), '../../extension');
const LINKS = Number(process.env.LINKS || 1000);
const CYCLES = Number(process.env.CYCLES || 300);
const LIMITS = { heapGrowthMB: 0.3, renderMs: 50 };

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
  console.error(
    'No Chrome for Testing found. Branded Chrome ignores --load-extension.\nRun: npx playwright install chromium   or set CHROME=/path/to/chrome-for-testing',
  );
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), 'warehouse-perf-'));
const proc = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--load-extension=${EXT}`,
    `--disable-extensions-except=${EXT}`,
    '--remote-debugging-pipe',
    '--enable-precise-memory-info',
    '--window-size=1600,1000',
  ],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
);

const pageErrors = [];
const pending = new Map();
let seq = 0,
  buf = '';
proc.stdio[4].on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\0')) >= 0) {
    const msg = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function processMB() {
  const pids = execSync(`ps -axo pid,command | grep -- '--extension-process' | grep -v grep | grep '${profile}' || true`)
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => l.trim().split(/\s+/)[0]);
  return pids.map((pid) => {
    if (platform() === 'darwin') {
      const m = execSync(`footprint -p ${pid} 2>/dev/null | grep -m1 'Footprint:' || true`)
        .toString()
        .match(/([\d.]+)\s*(KB|MB|GB)/);
      if (m) return +(Number(m[1]) * { KB: 1 / 1024, MB: 1, GB: 1024 }[m[2]]).toFixed(1);
    }
    return +(Number(execSync(`ps -o rss= -p ${pid} || echo 0`).toString().trim()) / 1024).toFixed(1);
  });
}

const CYCLE = (n, heavy) => `(async () => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const [tree] = await chrome.bookmarks.getTree();
  const root = tree.children[0].children.find(c => c.title === 'My Links');
  for (let i = 0; i < ${n}; i++) {
    const navs = [...document.querySelectorAll('.nav')];
    navs[i % navs.length].click();
    await wait(5);
    document.querySelector('.row')?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 }));
    await wait(5);
    if (i % 3 === 0) document.body.click();
    const sel = document.querySelector('select[aria-label=Sort]');
    if (sel) { sel.value = ['env', 'name', 'manual', 'host'][i % 4]; sel.dispatchEvent(new Event('change')); }
    if (${heavy} && i % 10 === 0) {
      document.getElementById('homeBtn').click(); await wait(20);
      document.getElementById('settingsBtn').click(); await wait(20);
      document.getElementById('settingsBtn').click();
    }
    const b = await chrome.bookmarks.create({ parentId: root.id, title: 'tmp', url: 'https://tmp.example.com/' + i });
    await wait(40);
    await chrome.bookmarks.remove(b.id);
    await wait(40);
  }
  document.body.click();
  document.querySelector('.nav')?.click();
  return true;
})()`;

let exitCode = 0;
try {
  await sleep(1500);
  const { targetId } = await send('Target.createTarget', { url: 'chrome://newtab/' });
  const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, s);
  await send('Performance.enable', {}, s);
  await sleep(2500);

  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const href = await ev('location.href');
  if (!href.startsWith('chrome-extension://')) throw new Error(`new tab is ${href}, the extension did not load`);

  const rows = [];
  const measure = async (label) => {
    await send('HeapProfiler.collectGarbage', {}, s);
    await sleep(300);
    await send('HeapProfiler.collectGarbage', {}, s);
    const m = Object.fromEntries((await send('Performance.getMetrics', {}, s)).metrics.map((x) => [x.name, x.value]));
    const row = { label, heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, listeners: m.JSEventListeners, processMB: processMB() };
    rows.push(row);
    return row;
  };

  await measure('Home, no bookmarks');

  await ev(`(async () => {
    const [tree] = await chrome.bookmarks.getTree();
    const root = await chrome.bookmarks.create({ parentId: tree.children[0].id, title: 'My Links' });
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, rootId: root.id } });
    const envs = ['prod', 'test', 'stage', 'local'];
    for (let f = 0; f < 20; f++) {
      const folder = await chrome.bookmarks.create({ parentId: root.id, title: 'Folder ' + f });
      const sec = await chrome.bookmarks.create({ parentId: folder.id, title: 'Section ' + f });
      for (let i = 0; i < Math.ceil(${LINKS} / 20); i++) {
        const e = envs[i % 4];
        await chrome.bookmarks.create({ parentId: i % 3 ? folder.id : sec.id, title: 'Service ' + i + ' ' + e.toUpperCase(), url: 'https://' + e + '.example' + f + '.com/path/' + i + '?q=' + i });
      }
    }
    return true;
  })()`);
  await sleep(1500);
  await ev(`document.querySelector('.nav')?.click()`);
  await sleep(500);
  const shown = await ev(`document.querySelectorAll('.row').length`);
  if (!shown) throw new Error('seeded bookmarks did not render');
  await measure(`${LINKS} links, folder open`);

  const half = Math.floor(CYCLES / 2);
  await ev(CYCLE(half, true));
  await sleep(500);
  const mid = await measure(`after ${half} cycles`);
  await ev(CYCLE(CYCLES - half, true));
  await sleep(500);
  const end = await measure(`after ${CYCLES} cycles`);

  const renderMs = await ev(`(() => {
    const navs = [...document.querySelectorAll('.nav')];
    const t = performance.now();
    for (const n of navs) n.click();
    return +((performance.now() - t) / navs.length).toFixed(2);
  })()`);

  console.table(rows.map((r) => ({ ...r, processMB: r.processMB.join(' / ') })));
  console.log(`rows per folder: ${shown}   folder render: ${renderMs} ms`);

  const checks = [
    ['DOM nodes stable in 2nd half', end.nodes === mid.nodes, `${mid.nodes} -> ${end.nodes}`],
    ['listeners stable in 2nd half', end.listeners === mid.listeners, `${mid.listeners} -> ${end.listeners}`],
    [`JS heap growth in 2nd half < ${LIMITS.heapGrowthMB} MB`, end.heapMB - mid.heapMB < LIMITS.heapGrowthMB, `${(end.heapMB - mid.heapMB).toFixed(2)} MB`],
    [`folder render < ${LIMITS.renderMs} ms`, renderMs < LIMITS.renderMs, `${renderMs} ms`],
    ['no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || 'none'],
  ];
  for (const [name, ok, detail] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`);
  if (checks.some((c) => !c[1])) exitCode = 1;
  console.log(`PERF_RESULT ${JSON.stringify({ links: LINKS, cycles: CYCLES, renderMs, rows, pass: !exitCode })}`);
} catch (e) {
  console.error('ERROR', e.message);
  exitCode = 2;
} finally {
  proc.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
  process.exit(exitCode);
}
