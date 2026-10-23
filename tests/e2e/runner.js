import newtab from './scenarios/newtab.js';
import sections from './scenarios/sections.js';
import categories from './scenarios/categories.js';
import home from './scenarios/home.js';
import popup from './scenarios/popup.js';
import environments from './scenarios/environments.js';
import board from './scenarios/board.js';
import notes from './scenarios/notes.js';

const ALL = [...newtab, ...sections, ...categories, ...home, ...popup, ...environments, ...board, ...notes];
const frame = document.getElementById('frame');
const out = document.getElementById('results');
const summary = document.getElementById('summary');
const pages = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

function reindex(node, parentId) {
  if (parentId !== undefined) node.parentId = parentId;
  (node.children || []).forEach((c, i) => {
    c.index = i;
    c.dateAdded ??= 1700000000000 + i;
    reindex(c, node.id);
  });
}

const NO_MOTION = '<style>*, *::before, *::after { transition: none !important; animation: none !important; }</style>';

async function pageHtml(name, motion = false) {
  const key = `${name}:${motion}`;
  if (!pages[key]) {
    const html = await (await fetch(`/extension/${name}.html`, { cache: 'no-store' })).text();
    pages[key] = html
      .replace('<head>', `<head><base href="/extension/">${motion ? '' : NO_MOTION}`)
      .replace('<script type="module"', '<script src="/tests/e2e/chrome-stub.js"></script>\n<script type="module"');
  }
  return pages[key];
}

async function mount(name, ready, motion) {
  const html = await pageHtml(name, motion);
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.srcdoc = html;
  });
  const w = frame.contentWindow;
  w.prompt = (_msg, def) => (window.__harness.answers.length ? window.__harness.answers.shift() : (def ?? null));
  w.confirm = () => window.__harness.confirm;
  w.alert = () => {};
  const t0 = Date.now();
  while (!ready(w.document)) {
    if (Date.now() - t0 > 4000) throw new Error(`${name} did not become ready`);
    await sleep(20);
  }
  await sleep(60);
  return w;
}

function makeT(scenario) {
  const fails = [];
  const H = () => window.__harness;
  const t = {
    get w() {
      return frame.contentWindow;
    },
    get d() {
      return frame.contentWindow.document;
    },
    $: (s, root) => (root || frame.contentWindow.document).querySelector(s),
    $$: (s, root) => [...(root || frame.contentWindow.document).querySelectorAll(s)],
    sleep,
    settle: () => sleep(160),
    async until(fn, msg = 'condition', ms = 2500) {
      const t0 = Date.now();
      while (!(await fn())) {
        if (Date.now() - t0 > ms) {
          fails.push(`timeout waiting for ${msg}`);
          return false;
        }
        await sleep(25);
      }
      return true;
    },
    ok(cond, msg) {
      if (!cond) fails.push(msg);
    },
    eq(actual, expected, msg) {
      const a = JSON.stringify(actual),
        e = JSON.stringify(expected);
      if (a !== e) fails.push(`${msg}: expected ${e}, got ${a}`);
    },
    node(id) {
      const walk = (n) => {
        if (n.id === id) return n;
        for (const c of n.children || []) {
          const r = walk(c);
          if (r) return r;
        }
        return null;
      };
      return walk(H().tree);
    },
    kids(id) {
      return (t.node(id)?.children || []).map((c) => c.id);
    },
    settings() {
      return H().store.settings || {};
    },
    get store() {
      return H().store;
    },
    get tabs() {
      return H().tabs;
    },
    get H() {
      return H();
    },
    answer(...vals) {
      H().answers.push(...vals);
    },
    confirm(v) {
      H().confirm = v;
    },
    click(el) {
      if (!el) {
        fails.push('click on missing element');
        return;
      }
      el.click();
    },
    dblclick(el) {
      el.dispatchEvent(new t.w.MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    },
    key(el, key, opts = {}) {
      el.dispatchEvent(new t.w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
    },
    type(el, value) {
      el.focus();
      el.value = value;
      el.dispatchEvent(new t.w.Event('input', { bubbles: true }));
      el.dispatchEvent(new t.w.Event('change', { bubbles: true }));
    },
    context(el) {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new t.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 5 }));
    },
    menuLabels() {
      return t.$$('.menu > button').map((b) => b.textContent.trim());
    },
    menu(label) {
      const b = t.$$('.menu > button').find((x) => x.textContent.trim() === label);
      if (!b) {
        fails.push(`menu item "${label}" missing (have: ${t.menuLabels().join(' | ')})`);
        return;
      }
      b.click();
    },
    drag(src, tgt, where = 'center') {
      if (!src || !tgt) {
        fails.push(`drag needs both elements (${!!src}, ${!!tgt})`);
        return;
      }
      const dt = new t.w.DataTransfer();
      const r = tgt.getBoundingClientRect();
      const clientY = where === 'before' ? r.top + 2 : where === 'after' ? r.bottom - 2 : r.top + r.height / 2;
      const fire = (el, type) =>
        el.dispatchEvent(new t.w.DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 10, clientY }));
      fire(src, 'dragstart');
      fire(tgt, 'dragenter');
      const accepted = !fire(tgt, 'dragover');
      if (accepted) fire(tgt, 'drop');
      fire(src, 'dragend');
      return accepted;
    },
    async open(name, opts = {}) {
      const ready =
        name === 'popup'
          ? (d) => d.querySelector('#folders')?.children.length || d.querySelector('#page .muted')
          : (d) => d.querySelector('#page')?.children.length;
      return mount(name, opts.ready || ready, !!scenario.motion);
    },
    async reload(name = scenario.page) {
      return t.open(name);
    },
    nav(title) {
      return t.$$('#nav .nav').find((n) => n.querySelector('.t')?.textContent === title);
    },
    navTitles() {
      return t.$$('#nav .nav').map((n) => n.querySelector('.t').textContent);
    },
    async folder(title) {
      t.click(t.nav(title));
      await t.settle();
    },
    row(id) {
      return t.$(`#page .row[data-id="${id}"]`);
    },
    rowIds() {
      return t.$$('#page .row[data-id]').map((r) => r.dataset.id);
    },
    catHeader(name) {
      return t.$$('#nav .cat').find((c) => c.querySelector('.t')?.textContent === name);
    },
    part(title) {
      return t.$$('#page .grp.part').find((p) => p.querySelector('.part-toggle')?.textContent === title);
    },
    toast() {
      return t.$('.toast');
    },
    fails,
  };
  return t;
}

export async function run(filter) {
  const list = ALL.filter((s) => !filter || s.name.toLowerCase().includes(filter.toLowerCase()));
  const results = [];
  for (const s of list) {
    const state = s.fixture();
    reindex(state.tree);
    window.__harness = {
      tree: state.tree,
      store: state.store,
      nextId: state.nextId || 1000,
      tabs: [],
      log: [],
      answers: [],
      confirm: true,
      activeTab: state.activeTab || null,
      closed: false,
    };
    const t = makeT(s);
    const t0 = performance.now();
    let error = null;
    try {
      await t.open(s.page);
      await s.run(t);
    } catch (e) {
      error = e?.stack || String(e);
    }
    const errors = frame.contentWindow.__errors || [];
    const failures = [...t.fails, ...(error ? [error] : []), ...errors.map((e) => `page error: ${e}`)];
    results.push({ name: s.name, area: s.area, pass: !failures.length, failures, ms: Math.round(performance.now() - t0) });
    const li = document.createElement('li');
    li.className = failures.length ? 'fail' : 'pass';
    li.textContent = `${failures.length ? '✗' : '✓'} [${s.area}] ${s.name}${failures.length ? ' — ' + failures.join(' ; ') : ''}`;
    out.append(li);
  }
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  window.__results = { pass, fail, total: results.length, results };
  document.title = `E2E ${fail ? 'FAIL' : 'PASS'} ${pass}/${results.length}`;
  summary.textContent = `E2E_RESULT ${JSON.stringify({ pass, fail, total: results.length, failed: results.filter((r) => !r.pass).map((r) => ({ name: r.name, failures: r.failures })) })}`;
  return window.__results;
}

export { clone };
const params = new URLSearchParams(location.search);
if (params.get('auto') !== '0') run(params.get('only'));
