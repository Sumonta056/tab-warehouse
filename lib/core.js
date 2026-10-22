// Shared helpers for newtab + popup. No framework, no build.

export const ENVS = ['PROD', 'TEST', 'STAGE', 'LOCAL'];
export const SORTS = { manual: 'Manual', name: 'Name', url: 'URL', env: 'Environment', added: 'Date added', host: 'Host' };

export const ENV_NAMES = { PROD: 'Live', TEST: 'Test', STAGE: 'Staging', LOCAL: 'Your computer' };

export const DEFAULT_HOME = {
  folderId: null,
  seeded: false,
  color: '#185a63',
  imgOpacity: 100,
  dark: 65,
  blur: 2,
  clockSize: 170,
  h24: false,
  seconds: true,
  date: true,
  labels: true,
  newTab: false,
  tileSize: 56,
  perRow: 12
};

export const SIDE_WIDTH = { min: 180, max: 440, initial: 264 };

export const THEMES = {
  blue: ['#8ab4f8', '#12304a', '#cfe1ff', '#0b1a33'],
  teal: ['#5fd4c4', '#0f3b3a', '#c9f5ef', '#06231f'],
  green: ['#6fd99a', '#143122', '#cdf5dc', '#06200f'],
  purple: ['#c6a9ff', '#2e2246', '#e7dcff', '#1a0f33'],
  pink: ['#f49ac1', '#45192e', '#ffd9ea', '#33061b'],
  orange: ['#f6a85f', '#3d2410', '#ffe1c4', '#2e1500'],
  red: ['#ff8a80', '#4a1a17', '#ffd6d2', '#330a07']
};

export function themeVars(theme) {
  let t = THEMES[theme];
  if (!t && /^#[0-9a-f]{6}$/i.test(theme || '')) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(theme.slice(i, i + 2), 16));
    const light = 0.299 * r + 0.587 * g + 0.114 * b > 140;
    t = [theme, `color-mix(in srgb, ${theme} 24%, #1b1b1b)`, `color-mix(in srgb, ${theme} 40%, #fff)`, light ? '#111' : '#fff'];
  }
  t ||= THEMES.blue;
  return { '--accent': t[0], '--accent-bg': t[1], '--accent-text': t[2], '--accent-ink': t[3] };
}

export function applyTheme(theme, el = document.documentElement) {
  for (const [k, v] of Object.entries(themeVars(theme))) el.style.setProperty(k, v);
}

export const DEFAULT_SIDE_LOOK = { mode: 'solid', color: '#1b1b1b', dark: 70, blur: 12 };

export function sideLookVars(look, image) {
  const img = look.mode === 'image' && !!image;
  return {
    '--side-color': look.color,
    '--side-dark': img ? String(look.dark / 100) : '1',
    '--side-blur': `${img ? look.blur : 0}px`,
    '--side-img': img ? `url("${image}")` : 'none'
  };
}

const DEFAULT_SETTINGS = {
  rootId: null,
  rootName: 'My Links',
  order: [],            // folder ids in sidebar order (unknown ids appended)
  lastFolder: null,
  lastSaveFolder: null,
  categories: [],
  folderCat: {},
  partColors: {},
  folders: {},          // folderId -> { sort, view: 'list'|'matrix', show: 'title'|'url', collapsedGroups: {} }
  envRules: [],         // ordered [{ pattern, env }]; first host-substring match wins
  hostMap: [],          // [{ PROD, TEST, STAGE, LOCAL }] hosts of one site; '' = none
  showFavicons: true,
  theme: 'blue',
  sideLook: DEFAULT_SIDE_LOOK,
  home: DEFAULT_HOME,
  sideWidth: SIDE_WIDTH.initial
};

export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}), home: { ...DEFAULT_HOME, ...(settings?.home || {}) }, sideLook: { ...DEFAULT_SIDE_LOOK, ...(settings?.sideLook || {}) } };
}
export async function saveSettings(patch) {
  const cur = await loadSettings();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

/* ---------- URL helpers ---------- */
export function hostOf(url) { try { return new URL(url).host.toLowerCase(); } catch { return ''; } }
export function pathKey(url) { try { const u = new URL(url); return u.pathname + u.search; } catch { return ''; } }
export function displayUrl(url) { return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''); }
export function isGithub(url) { return hostOf(url) === 'github.com'; }
export function sameAsUrl(title, url) {
  const a = (title || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return !a || a === displayUrl(url) || a === url;
}

export function explainEnv(bm, rules) {
  const host = hostOf(bm.url);
  const rule = rules.findIndex(r => r.pattern && host.includes(r.pattern.toLowerCase()));
  if (rule >= 0) return { env: rules[rule].env, rule };
  const t = (bm.title || '').toUpperCase();
  for (const e of ENVS) if (new RegExp(`\\b${e}\\b`).test(t)) return { env: e, rule: -1, word: e };
  if (/\bDEV\b/.test(t)) return { env: 'TEST', rule: -1, word: 'DEV' };
  return { env: '', rule: -1 };
}

export function detectEnv(bm, rules) {
  return explainEnv(bm, rules).env;
}

export function envText(rules, hostMap) {
  return [
    '# Labels: text-in-address LABEL (first match wins)',
    ...rules.map(r => `${r.pattern} ${r.env}`),
    '',
    '# Same site in each version: PROD TEST STAGE LOCAL (- for none)',
    ...hostMap.map(r => ENVS.map(e => r[e] || '-').join(' '))
  ].join('\n');
}

export function parseEnvText(text) {
  const rules = [], hostMap = [];
  let skipped = 0;
  for (const raw of (text || '').split('\n')) {
    const parts = raw.trim().split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0].startsWith('#')) continue;
    const env = (parts[1] || '').toUpperCase();
    if (parts.length === 2 && ENVS.includes(env)) rules.push({ pattern: parts[0].toLowerCase(), env });
    else if (parts.length === ENVS.length && parts.some(p => p !== '-')) hostMap.push(Object.fromEntries(ENVS.map((e, i) => [e, parts[i] === '-' ? '' : parts[i].toLowerCase()])));
    else skipped++;
  }
  return { rules, hostMap, skipped };
}

// Derive the same resource on another env. Returns url or null.
export function deriveUrl(url, targetEnv, hostMap) {
  const host = hostOf(url);
  for (const row of hostMap) {
    const fromEnv = ENVS.find(e => (row[e] || '').toLowerCase() === host);
    if (!fromEnv || fromEnv === targetEnv) continue;
    const toHost = row[targetEnv];
    if (!toHost) return null;
    try { const u = new URL(url); u.host = toHost; if (toHost.startsWith('localhost')) u.protocol = 'http:'; return u.toString(); } catch { return null; }
  }
  return null;
}

const GSTATIC = 'https://ssl.gstatic.com/images/branding/product/2x/';
const GOOGLE_APPS = { 'mail.google.com': 'gmail', 'drive.google.com': 'drive', 'calendar.google.com': 'calendar', 'keep.google.com': 'keep', 'meet.google.com': 'meet' };
const GOOGLE_DOCS = { document: 'docs', spreadsheets: 'sheets', presentation: 'slides', forms: 'forms' };

export function googleIcon(url) {
  const host = hostOf(url);
  let app = GOOGLE_APPS[host];
  if (!app && host === 'docs.google.com') {
    try { app = GOOGLE_DOCS[new URL(url).pathname.split('/')[1]] || 'docs'; } catch { app = 'docs'; }
  }
  return app ? `${GSTATIC}${app}_2020q4_48dp.png` : null;
}

export function normalizeUrl(input) {
  const v = (input || '').trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

export function clampSideWidth(w) {
  const n = Number(w);
  if (!Number.isFinite(n)) return SIDE_WIDTH.initial;
  return Math.round(Math.max(SIDE_WIDTH.min, Math.min(SIDE_WIDTH.max, n)));
}

export function clockText(date, { h24 = false, seconds = true } = {}) {
  const h = date.getHours();
  const hh = h24 ? String(h).padStart(2, '0') : String(h % 12 || 12);
  const mm = String(date.getMinutes()).padStart(2, '0');
  return seconds ? `${hh}:${mm}:${String(date.getSeconds()).padStart(2, '0')}` : `${hh}:${mm}`;
}

export function msToNextTick(date, seconds = true) {
  const ms = date.getMilliseconds();
  return seconds ? 1000 - ms : 60000 - date.getSeconds() * 1000 - ms;
}

export function faviconUrl(pageUrl, size = 32) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', String(size));
  return u.toString();
}

/* ---------- bookmark tree ---------- */
export async function getTree() { const [root] = await chrome.bookmarks.getTree(); return root; }

export function findById(root, id) {
  const q = [root];
  while (q.length) { const n = q.shift(); if (n.id === id) return n; for (const c of n.children || []) q.push(c); }
  return null;
}
export function findFolderByTitle(root, title) {
  const q = [root];
  while (q.length) { const n = q.shift(); if (!n.url && n.title === title) return n; for (const c of n.children || []) q.push(c); }
  return null;
}
export function resolveRoot(tree, settings) {
  if (settings.rootId) { const n = findById(tree, settings.rootId); if (n) return n; }
  const named = settings.rootName && findFolderByTitle(tree, settings.rootName);
  return named || tree.children?.[0] || tree;
}
export function flatten(root) {
  const out = [];
  const walk = (n, path) => { for (const c of n.children || []) { if (c.url) out.push({ ...c, path: path.join(' › ') }); else walk(c, [...path, c.title]); } };
  walk(root, []);
  return out;
}
export function folderList(root) {
  const out = [];
  const walk = (n, depth) => { for (const c of n.children || []) if (!c.url) { out.push({ id: c.id, title: c.title || '(untitled)', depth }); walk(c, depth + 1); } };
  walk(root, 0);
  return out;
}

// Sidebar sections: child folders of root in saved order + virtual "Unsorted" for loose links.
export function sections(root, order, hidden = []) {
  const kids = (root.children || []).filter(k => !hidden.includes(k.id));
  const linksOf = (n) => (n.children || []).filter(c => c.url);
  const folders = kids.filter(k => !k.url).map(f => {
    const parts = (f.children || []).filter(c => !c.url).map(sf => ({ id: sf.id, title: sf.title || '(untitled)', node: sf, links: linksOf(sf) }));
    const links = linksOf(f);
    return { id: f.id, title: f.title || '(untitled)', node: f, links, parts, all: [...links, ...parts.flatMap(pt => pt.links)] };
  });
  const loose = linksOf(root);
  if (loose.length) folders.push({ id: `unsorted:${root.id}`, title: 'Unsorted', node: root, links: loose, parts: [], all: loose, virtual: true });
  const rank = new Map(order.map((id, i) => [id, i]));
  const key = (x) => x.virtual ? Infinity : rank.has(x.id) ? rank.get(x.id) : 1e9 + (x.node.index || 0);
  return folders.sort((a, b) => key(a) - key(b));
}

/* ---------- sorting ---------- */
export function sortLinks(links, sort, rules) {
  const arr = [...links];
  const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  switch (sort) {
    case 'name': return arr.sort((a, b) => cmp(a.title || displayUrl(a.url), b.title || displayUrl(b.url)));
    case 'url': return arr.sort((a, b) => cmp(displayUrl(a.url), displayUrl(b.url)));
    case 'host': return arr.sort((a, b) => cmp(hostOf(a.url), hostOf(b.url)) || cmp(pathKey(a.url), pathKey(b.url)));
    case 'added': return arr.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    case 'env': {
      const rank = (b) => { const e = detectEnv(b, rules); return e ? ENVS.indexOf(e) : ENVS.length; };
      return arr.sort((a, b) => rank(a) - rank(b) || cmp(pathKey(a.url), pathKey(b.url)));
    }
    default: return arr.sort((a, b) => (a.index || 0) - (b.index || 0));
  }
}

/* ---------- env matrix ---------- */
// Groups links by path (ignoring host) → rows with one cell per env. Links without an env go to `rest`.
export function buildMatrix(links, rules) {
  const rows = new Map();
  const rest = [];
  for (const bm of links) {
    const env = detectEnv(bm, rules);
    const key = pathKey(bm.url);
    if (!env || !key) { rest.push(bm); continue; }
    // strip query that only differs by env-ish params? keep exact; show params in cell label
    const base = key.split('?')[0];
    const row = rows.get(base) || { key: base, cells: { PROD: [], TEST: [], STAGE: [], LOCAL: [] } };
    row.cells[env].push(bm);
    rows.set(base, row);
  }
  return { rows: [...rows.values()].sort((a, b) => a.key.localeCompare(b.key)), rest };
}

/* ---------- DOM ---------- */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'draggable') el.setAttribute(k, v ? 'true' : 'false');
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) { if (c == null || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}

export function svgIcon(name) {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    grip: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    pencil: '<path d="M4 20h4l10-10-4-4L4 16z"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'
  };
  const filled = name === 'grip' || name === 'more';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', filled ? 'currentColor' : 'none');
  el.setAttribute('stroke', filled ? 'none' : 'currentColor');
  el.setAttribute('stroke-width', '2'); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = paths[name] || '';
  return el;
}

export function letterIcon(bm) {
  const host = hostOf(bm.url);
  if (host.includes('github')) return 'gh';
  if (host.startsWith('localhost') || host.startsWith('127.')) return ':' + (host.split(':')[1] || 'l').slice(0, 2);
  if (host.includes('shop')) return 'L';
  if (host.includes('example.com')) return 'AC';
  if (host.includes('aws')) return 'aws';
  if (host.includes('argo')) return 'A';
  return (bm.title || host || '?').trim().slice(0, 2);
}

export function iconEl(bm, showFavicons) {
  const ico = h('span', { class: 'ico' });
  if (showFavicons) {
    const img = h('img', { src: faviconUrl(bm.url), alt: '' });
    img.addEventListener('error', () => { img.remove(); ico.textContent = letterIcon(bm); });
    ico.append(img);
  } else ico.textContent = letterIcon(bm);
  return ico;
}

export function highlight(el, text, query) {
  el.replaceChildren();
  if (!query) { el.textContent = text; return; }
  const terms = query.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) { el.textContent = text; return; }
  const re = new RegExp(`(${terms.join('|')})`, 'ig');
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) el.append(text.slice(last, m.index));
    el.append(h('mark', {}, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) el.append(text.slice(last));
}
