import { ENVS, ENV_NAMES } from '../constants/envs.js';
import { TAG_COLORS, TAG_RESERVED, TAG_PLAIN_MAX, SITES_HEAD } from '../constants/tags.js';
import { THEMES } from '../constants/themes.js';
import { DEFAULT_HOME, DEFAULT_SIDE_LOOK, DEFAULT_BOARD, DEFAULT_SETTINGS } from '../constants/defaults.js';
import { SIDE_WIDTH, FONT_SCALE, NOTE_MAX, OMNI_MAX } from '../constants/limits.js';
import { COMMAND_LABELS, PALETTE_MSG } from '../constants/commands.js';
import { PRIS, PRI_NAMES } from '../constants/priority.js';
import { DUE_SOON_DAYS, MONTHS, WEEKDAYS, DUE_GROUPS, DUE_QUICK } from '../constants/due.js';
import { TRACKING, GSTATIC, GOOGLE_APPS, GOOGLE_DOCS, WEB_ICON } from '../constants/urls.js';
import { ICON_PATHS } from '../constants/icons.js';

const ENV_WORDS = ENVS.map((e) => [e, new RegExp(`\\b${e}\\b`)]);

export function tagNameError(name, taken = []) {
  if (!/^[A-Z0-9]{1,8}$/.test(name)) return 'Use 1 to 8 capital letters or digits.';
  if (TAG_RESERVED.includes(name)) return `${name} is a built-in name.`;
  if (taken.includes(name)) return `There is already a tag ${name}.`;
  return '';
}

export function cleanTags(list) {
  const out = [];
  for (const t of Array.isArray(list) ? list : []) {
    const name = typeof t?.name === 'string' ? t.name.trim().toUpperCase() : '';
    const taken = out.map((x) => x.name);
    if (tagNameError(name, taken)) continue;
    out.push({
      name,
      plain: typeof t.plain === 'string' ? t.plain.trim().slice(0, TAG_PLAIN_MAX) : '',
      color: TAG_COLORS.includes(t.color) ? t.color : TAG_COLORS[0],
    });
  }
  return out;
}

export function tagNames(settings) {
  return [...ENVS, ...(settings?.customTags || []).map((t) => t.name)];
}

export function tagPlain(settings, name) {
  return ENV_NAMES[name] || (settings?.customTags || []).find((t) => t.name === name)?.plain || name;
}

export function tagBadge(name, customTags = []) {
  const t = customTags.find((x) => x.name === name);
  return h('span', { class: `badge ${t ? 'tag' : name}`, dataset: t ? { tag: t.color } : null }, name);
}

export function linkBadge(env, url, customTags = []) {
  if (env) return tagBadge(env, customTags);
  return isGithub(url) ? h('span', { class: 'badge GH' }, 'GH') : null;
}

export function themeVars(theme) {
  let t = THEMES[theme];
  if (!t && /^#[0-9a-f]{6}$/i.test(theme || '')) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.slice(i, i + 2), 16));
    const light = 0.299 * r + 0.587 * g + 0.114 * b > 140;
    t = [theme, `color-mix(in srgb, ${theme} 24%, #1b1b1b)`, `color-mix(in srgb, ${theme} 40%, #fff)`, light ? '#111' : '#fff'];
  }
  t ||= THEMES.blue;
  return { '--accent': t[0], '--accent-bg': t[1], '--accent-text': t[2], '--accent-ink': t[3] };
}

export function applyTheme(theme, el = document.documentElement) {
  for (const [k, v] of Object.entries(themeVars(theme))) el.style.setProperty(k, v);
}

export function sideLookVars(look, image) {
  const img = look.mode === 'image' && !!image;
  return {
    '--side-color': look.color,
    '--side-dark': img ? String(look.dark / 100) : '1',
    '--side-blur': `${img ? look.blur : 0}px`,
    '--side-img': img ? `url("${image}")` : 'none',
  };
}

export function brandName(settings) {
  const name = (settings?.userName || '').trim();
  return name ? `${name}'s Warehouse` : 'Tab Warehouse';
}

export async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    home: { ...DEFAULT_HOME, ...(settings?.home || {}) },
    sideLook: { ...DEFAULT_SIDE_LOOK, ...(settings?.sideLook || {}) },
    board: { ...DEFAULT_BOARD, ...(settings?.board || {}) },
  };
}
export async function saveSettings(patch) {
  const cur = await loadSettings();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function loadLinkMeta() {
  const { linkMeta } = await chrome.storage.local.get('linkMeta');
  return linkMeta || {};
}
export async function setLinkMeta(id, m) {
  const all = await loadLinkMeta();
  const clean = cleanMeta(m);
  if (clean) all[id] = clean;
  else delete all[id];
  await chrome.storage.local.set({ linkMeta: all });
  return all;
}

/* ---------- URL helpers ---------- */
export function hostOf(url) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '';
  }
}
export function pathKey(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return '';
  }
}
export function displayUrl(url) {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}
export function isGithub(url) {
  return hostOf(url) === 'github.com';
}
export function sameAsUrl(title, url) {
  const a = (title || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  return !a || a === displayUrl(url) || a === url;
}

export function explainEnv(bm, rules) {
  const host = hostOf(bm.url);
  const rule = rules.findIndex((r) => r.pattern && host.includes(r.pattern.toLowerCase()));
  if (rule >= 0) return { env: rules[rule].env, rule };
  const t = (bm.title || '').toUpperCase();
  for (const [e, re] of ENV_WORDS) if (re.test(t)) return { env: e, rule: -1, word: e };
  if (/\bDEV\b/.test(t)) return { env: 'TEST', rule: -1, word: 'DEV' };
  return { env: '', rule: -1 };
}

export function detectEnv(bm, rules) {
  return explainEnv(bm, rules).env;
}

export function envText(rules, hostMap, customTags = []) {
  const cols = [...ENVS, ...customTags.map((t) => t.name)];
  return [
    ...(customTags.length ? ['# Tags: NAME color plain name', ...customTags.map((t) => `${t.name} ${t.color} ${t.plain}`.trim()), ''] : []),
    '# Tags by address: text-in-address TAG (first match wins)',
    ...rules.map((r) => `${r.pattern} ${r.env}`),
    '',
    `# Same site in each version: ${cols.join(' ')} (- for none)`,
    ...hostMap.map((r) => cols.map((e) => r[e] || '-').join(' ')),
  ].join('\n');
}

export function parseEnvText(text, known = []) {
  const lines = (text || '').split('\n').map((raw) => raw.trim());
  const tags = [];
  let cols = ENVS;
  let skipped = 0;
  const rest = [];
  for (const line of lines) {
    const head = line.match(SITES_HEAD);
    if (head) cols = head[1].split(/\s+/).filter(Boolean);
    const parts = line.split(/\s+/).filter(Boolean);
    if (!parts.length || parts[0].startsWith('#')) continue;
    if (parts.length >= 2 && TAG_COLORS.includes(parts[1].toLowerCase())) {
      const [name, color, ...plain] = parts;
      const taken = tags.map((t) => t.name);
      if (known.includes(name)) continue;
      if (tagNameError(name, taken)) skipped++;
      else tags.push({ name, plain: plain.join(' ').slice(0, TAG_PLAIN_MAX), color: color.toLowerCase() });
      continue;
    }
    rest.push(parts);
  }
  const names = [...ENVS, ...known, ...tags.map((t) => t.name)];
  const rules = [],
    hostMap = [];
  for (const parts of rest) {
    const env = (parts[1] || '').toUpperCase();
    const row =
      parts.length === cols.length &&
      Object.fromEntries(cols.flatMap((e, i) => (names.includes(e) ? [[e, parts[i] === '-' ? '' : parts[i].toLowerCase()]] : [])));
    if (parts.length === 2 && names.includes(env)) rules.push({ pattern: parts[0].toLowerCase(), env });
    else if (row && Object.values(row).some(Boolean)) hostMap.push(row);
    else skipped++;
  }
  return { rules, hostMap, tags, skipped };
}

// Derive the same resource on another env. Returns url or null.
export function deriveUrl(url, targetEnv, hostMap, tags = ENVS) {
  const host = hostOf(url);
  for (const row of hostMap) {
    const fromEnv = tags.find((e) => (row[e] || '').toLowerCase() === host);
    if (!fromEnv || fromEnv === targetEnv) continue;
    const toHost = row[targetEnv];
    if (!toHost) return null;
    try {
      const u = new URL(url);
      u.host = toHost;
      if (toHost.startsWith('localhost')) u.protocol = 'http:';
      return u.toString();
    } catch {
      return null;
    }
  }
  return null;
}

export function switchTargets(url, hostMap, tags = ENVS) {
  const host = hostOf(url);
  const row = host && hostMap.find((r) => tags.some((e) => (r[e] || '').toLowerCase() === host));
  if (!row) return null;
  const from = tags.find((e) => (row[e] || '').toLowerCase() === host);
  return {
    from,
    to: tags
      .filter((e) => e !== from && row[e])
      .map((env) => ({ env, url: deriveUrl(url, env, hostMap, tags) }))
      .filter((x) => x.url),
  };
}

export function googleIcon(url) {
  const host = hostOf(url);
  let app = GOOGLE_APPS[host];
  if (!app && host === 'docs.google.com') {
    try {
      app = GOOGLE_DOCS[new URL(url).pathname.split('/')[1]] || 'docs';
    } catch {
      app = 'docs';
    }
  }
  return app ? `${GSTATIC}${app}_2020q4_48dp.png` : null;
}

export function normalizeUrl(input) {
  const v = (input || '').trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

export function clampFont(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return FONT_SCALE.initial;
  return Math.round(Math.max(FONT_SCALE.min, Math.min(FONT_SCALE.max, n)));
}

export function commandLabel(cmd) {
  return COMMAND_LABELS[cmd?.name] || cmd?.description || cmd?.name || '';
}

export function shortcutKeys(shortcut) {
  const s = (shortcut || '').trim();
  if (!s) return [];
  if (s.includes('+'))
    return s
      .split('+')
      .map((k) => k.trim())
      .filter(Boolean);
  const mods = s.match(/^[⌘⇧⌥⌃]*/)[0];
  const rest = s.slice(mods.length);
  return [...mods, ...(rest ? [rest] : [])];
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

export function webIconUrls(pageUrl) {
  try {
    const u = new URL(pageUrl);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || /^[\d.]+$/.test(u.hostname)) return [];
    return [...new Set([u.hostname, u.hostname.replace(/^www\./, '')])].map((d) => `${WEB_ICON}?domain=${encodeURIComponent(d)}&sz=64`);
  } catch {
    return [];
  }
}

export function tileIconSrcs(bm, iconMap) {
  let root = null;
  try {
    root = faviconUrl(new URL('/', bm.url).href, 64);
  } catch {}
  return [...new Set([iconMap[bm.id] || googleIcon(bm.url), faviconUrl(bm.url, 64), root, ...webIconUrls(bm.url)].filter(Boolean))];
}

/* ---------- bookmark tree ---------- */
export async function getTree() {
  const [root] = await chrome.bookmarks.getTree();
  return root;
}

export function findById(root, id) {
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (n.id === id) return n;
    for (const c of n.children || []) q.push(c);
  }
  return null;
}
export function findFolderByTitle(root, title) {
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (!n.url && n.title === title) return n;
    for (const c of n.children || []) q.push(c);
  }
  return null;
}
export function resolveRoot(tree, settings) {
  if (settings.rootId) {
    const n = findById(tree, settings.rootId);
    if (n) return n;
  }
  const named = settings.rootName && findFolderByTitle(tree, settings.rootName);
  return named || tree.children?.[0] || tree;
}
export function flatten(root) {
  const out = [];
  const walk = (n, path) => {
    for (const c of n.children || []) {
      if (c.url) out.push({ ...c, path: path.join(' › ') });
      else walk(c, [...path, c.title]);
    }
  };
  walk(root, []);
  return out;
}
export function folderList(root) {
  const out = [];
  const walk = (n, depth) => {
    for (const c of n.children || [])
      if (!c.url) {
        out.push({ id: c.id, title: c.title || '(untitled)', depth });
        walk(c, depth + 1);
      }
  };
  walk(root, 0);
  return out;
}

// Sidebar sections: child folders of root in saved order + virtual "Unsorted" for loose links.
export function sections(root, order, hidden = []) {
  const kids = (root.children || []).filter((k) => !hidden.includes(k.id));
  const linksOf = (n) => (n.children || []).filter((c) => c.url);
  const folders = kids
    .filter((k) => !k.url)
    .map((f) => {
      const parts = (f.children || []).filter((c) => !c.url).map((sf) => ({ id: sf.id, title: sf.title || '(untitled)', node: sf, links: linksOf(sf) }));
      const links = linksOf(f);
      return { id: f.id, title: f.title || '(untitled)', node: f, links, parts, all: [...links, ...parts.flatMap((pt) => pt.links)] };
    });
  const loose = linksOf(root);
  if (loose.length) folders.push({ id: `unsorted:${root.id}`, title: 'Unsorted', node: root, links: loose, parts: [], all: loose, virtual: true });
  const rank = new Map(order.map((id, i) => [id, i]));
  const key = (x) => (x.virtual ? Infinity : rank.has(x.id) ? rank.get(x.id) : 1e9 + (x.node.index || 0));
  return folders.sort((a, b) => key(a) - key(b));
}

/* ---------- sorting ---------- */
export function imageSaveError(err) {
  return /quota/i.test(err?.message || '')
    ? 'Not enough storage space. Remove the background image or some custom icons, then try again.'
    : 'That file is not an image the browser can read.';
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function sortLinks(links, sort, rules, tags = ENVS) {
  const cmp = collator.compare;
  const by = (key, compare) =>
    links
      .map((bm) => [key(bm), bm])
      .sort((a, b) => compare(a[0], b[0]))
      .map((x) => x[1]);
  switch (sort) {
    case 'name':
      return by((bm) => bm.title || displayUrl(bm.url), cmp);
    case 'url':
      return by((bm) => displayUrl(bm.url), cmp);
    case 'host':
      return by(
        (bm) => [hostOf(bm.url), pathKey(bm.url)],
        (a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]),
      );
    case 'added':
      return [...links].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    case 'env':
      return by(
        (bm) => {
          const i = tags.indexOf(detectEnv(bm, rules));
          return [i < 0 ? tags.length : i, pathKey(bm.url)];
        },
        (a, b) => a[0] - b[0] || cmp(a[1], b[1]),
      );
    default:
      return [...links].sort((a, b) => (a.index || 0) - (b.index || 0));
  }
}

export function cleanMeta(m) {
  if (!m || typeof m !== 'object') return null;
  const out = {};
  const note = typeof m.note === 'string' ? m.note.trim().slice(0, NOTE_MAX) : '';
  if (note) out.note = note;
  if (PRIS.includes(m.pri)) out.pri = m.pri;
  if (isDue(m.due)) out.due = m.due;
  return Object.keys(out).length ? out : null;
}

const pad2 = (n) => String(n).padStart(2, '0');

function parseDue(due) {
  const m = typeof due === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(due);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const day = new Date(y, mo - 1, d);
  if (day.getFullYear() !== y || day.getMonth() !== mo - 1 || day.getDate() !== d) return null;
  if (m[4] === undefined) return { day, at: null };
  const [hh, mm] = [+m[4], +m[5]];
  if (hh > 23 || mm > 59) return null;
  return { day, at: new Date(y, mo - 1, d, hh, mm) };
}

export function isDue(due) {
  return !!parseDue(due);
}

const daysBetween = (a, b) => Math.round((b - a) / 864e5);
const startOfDay = (t) => new Date(t.getFullYear(), t.getMonth(), t.getDate());

export function dueState(due, now = new Date()) {
  const p = parseDue(due);
  if (!p) return null;
  const today = startOfDay(now);
  if (p.at ? p.at < now : p.day < today) return 'overdue';
  if (+p.day === +today) return 'today';
  return daysBetween(today, p.day) <= DUE_SOON_DAYS ? 'soon' : 'later';
}

export function dueLabel(due, now = new Date()) {
  const p = parseDue(due);
  if (!p) return '';
  const time = p.at ? `${pad2(p.at.getHours())}:${pad2(p.at.getMinutes())}` : '';
  const withTime = (s) => (time ? `${s} ${time}` : s);
  const date = `${p.day.getDate()} ${MONTHS[p.day.getMonth()]}`;
  const state = dueState(due, now);
  if (state === 'overdue') {
    const late = daysBetween(p.day, startOfDay(now));
    if (!late) return `Overdue · today ${time}`;
    return `${withTime(`Overdue · ${date}`)} (${late} ${late === 1 ? 'day' : 'days'})`;
  }
  if (state === 'today') return time ? `Today ${time}` : 'Due today';
  if (state === 'soon') return withTime(`Due ${WEEKDAYS[p.day.getDay()]} ${date}`);
  return withTime(`Due ${date} ${p.day.getFullYear()}`);
}

export function gcalUrl({ title, url, note, due }) {
  const p = parseDue(due);
  if (!p) return '';
  const ymd = (t) => `${t.getFullYear()}${pad2(t.getMonth() + 1)}${pad2(t.getDate())}`;
  const stamp = (t) => `${ymd(t)}T${pad2(t.getHours())}${pad2(t.getMinutes())}00`;
  let dates;
  if (p.at) {
    dates = `${stamp(p.at)}/${stamp(new Date(p.at.getTime() + 30 * 60000))}`;
  } else {
    const next = new Date(p.day);
    next.setDate(next.getDate() + 1);
    dates = `${ymd(p.day)}/${ymd(next)}`;
  }
  const details = [note, url].filter(Boolean).join('\n\n');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title || url, dates, details });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function priGroups(sorted, meta) {
  const groups = [...PRIS, null].map((pri) => ({ pri, links: [] }));
  for (const bm of sorted) {
    const i = PRIS.indexOf(meta[bm.id]?.pri);
    groups[i < 0 ? PRIS.length : i].links.push(bm);
  }
  return groups.filter((g) => g.links.length);
}

export function priFirst(sorted, meta) {
  return priGroups(sorted, meta).flatMap((g) => g.links);
}

export function matchLink(bm, note, q) {
  if (!q) return true;
  const hay = `${bm.title} ${bm.url} ${note || ''}`.toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

export function searchLinks(secs, query, meta = {}, rules = []) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const s of secs)
    for (const bm of s.all) {
      const part = s.parts.find((pt) => pt.id === bm.parentId);
      const crumb = part ? `${s.title} › ${part.title}` : s.title;
      const hay = `${bm.title} ${bm.url} ${crumb} ${meta[bm.id]?.note || ''} ${detectEnv(bm, rules)}`.toLowerCase();
      if (terms.every((t) => hay.includes(t))) hits.push({ bm, s, crumb });
    }
  return hits;
}

export function scheduleGroups(secs, meta = {}, now = new Date()) {
  const dated = searchLinks(secs, '', meta)
    .map((hit) => ({ ...hit, p: parseDue(meta[hit.bm.id]?.due) }))
    .filter((x) => x.p)
    .sort((a, b) => +(a.p.at || a.p.day) - +(b.p.at || b.p.day) || !!a.p.at - !!b.p.at);
  return DUE_GROUPS.map(([state, name]) => ({
    state,
    name,
    items: dated.filter((x) => dueState(meta[x.bm.id].due, now) === state).map(({ bm, s, crumb }) => ({ bm, s, crumb })),
  })).filter((g) => g.items.length);
}

/* ---------- omnibox ---------- */

export function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

function xmlMatch(text, terms) {
  if (!terms.length) return xmlEscape(text);
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text
    .split(re)
    .map((part, i) => (i % 2 ? `<match>${xmlEscape(part)}</match>` : xmlEscape(part)))
    .join('');
}

export function omniboxSuggestions(secs, text, meta = {}, rules = [], max = OMNI_MAX) {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const inTitle = (bm) => terms.every((t) => (bm.title || '').toLowerCase().includes(t));
  return searchLinks(secs, text, meta, rules)
    .sort((a, b) => inTitle(b.bm) - inTitle(a.bm))
    .slice(0, max)
    .map(({ bm, crumb }) => {
      const label = [detectEnv(bm, rules), crumb].filter(Boolean).join(' · ');
      return {
        content: bm.url,
        description: `${xmlMatch(bm.title || displayUrl(bm.url), terms)} <dim>${xmlEscape(label)}</dim> <url>${xmlMatch(displayUrl(bm.url), terms)}</url>`,
      };
    });
}

export function omniboxTarget(text, newtabUrl) {
  const t = text.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `${newtabUrl}?q=${encodeURIComponent(t)}`;
}

/* ---------- duplicates ---------- */

export function dupKey(url, loose = false) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (loose) {
    const params = new URLSearchParams(u.search);
    [...params.keys()].filter((k) => TRACKING.test(k)).forEach((k) => params.delete(k));
    u.search = params.toString();
    u.hash = '';
  }
  return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}${u.search}${u.hash}`;
}

export function findDuplicates(links, loose = false) {
  const byKey = new Map();
  for (const bm of links) {
    const k = dupKey(bm.url, loose);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(bm);
  }
  return [...byKey].filter(([, list]) => list.length > 1).map(([key, list]) => ({ key, links: list.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0)) }));
}

export function findSaved(tree, url) {
  const key = dupKey(url, true);
  const out = [];
  const walk = (n, path) => {
    for (const c of n.children || []) {
      if (c.url) {
        if (dupKey(c.url, true) === key) out.push({ ...c, path: path.join(' › ') });
      } else walk(c, [...path, c.title || '(untitled)']);
    }
  };
  walk(tree, []);
  return out;
}

export function quickSaveTarget(settings, tree) {
  const root = resolveRoot(tree, settings);
  const last = settings.lastSaveFolder && findById(root, settings.lastSaveFolder);
  return last && !last.url ? last.id : root.id;
}

export function quickSave(settings, tree, tab) {
  if (!tab?.url || !/^(https?|file):/i.test(tab.url)) return { kind: 'skip' };
  const hits = findSaved(tree, tab.url);
  if (hits.length) return { kind: 'dup', hits };
  const parentId = quickSaveTarget(settings, tree);
  const folder = findById(tree, parentId);
  return { kind: 'save', parentId, folder: folder.title || 'Bookmarks', title: tab.title || tab.url, url: tab.url };
}

export function quickSaveBadge(r) {
  if (r.kind === 'save') return { text: '✓', color: '#1e8e3e', title: `Saved to ${r.folder}` };
  if (r.kind === 'dup') return { text: '!', color: '#e8710a', title: `Already in ${r.hits[0].path}` };
  if (r.kind === 'error') return { text: '–', color: '#5f6368', title: `Could not save: ${r.message}` };
  return { text: '–', color: '#5f6368', title: 'This page cannot be saved' };
}

export function isPaletteRequest(msg, tabId) {
  return msg?.type === PALETTE_MSG && tabId != null && msg.tabId === tabId;
}

export async function paletteCommand(tabId, send) {
  if (tabId == null) return 'none';
  const ok = await Promise.resolve()
    .then(() => send({ type: PALETTE_MSG, tabId }))
    .catch(() => false);
  return ok === true ? 'palette' : 'none';
}

/* ---------- env matrix ---------- */
// Groups links by path (ignoring host) → rows with one cell per env. Links without an env go to `rest`.
export function buildMatrix(links, rules, tags = ENVS) {
  const rows = new Map();
  const rest = [];
  for (const bm of links) {
    const env = detectEnv(bm, rules);
    const key = pathKey(bm.url);
    if (!tags.includes(env) || !key) {
      rest.push(bm);
      continue;
    }
    // strip query that only differs by env-ish params? keep exact; show params in cell label
    const base = key.split('?')[0];
    const row = rows.get(base) || { key: base, cells: Object.fromEntries(tags.map((t) => [t, []])) };
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
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function priPicker(value, onPick) {
  const box = h('div', { class: 'pri-pick', role: 'group', 'aria-label': 'Priority' });
  const draw = (v) =>
    box.replaceChildren(
      ...[null, ...PRIS].map((p) =>
        h(
          'button',
          {
            type: 'button',
            class: `${p ? `pri-${p}` : ''} ${v === p ? 'on' : ''}`,
            'aria-pressed': String(v === p),
            dataset: { pri: p || 'none' },
            onClick: () => {
              draw(p);
              onPick(p);
            },
          },
          p ? h('span', { class: 'pri-dot' }) : null,
          p ? PRI_NAMES[p] : 'None',
        ),
      ),
    );
  draw(value || null);
  return box;
}

export function dueQuickDate(days, now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

export function duePicker(due) {
  const [d = '', t = ''] = isDue(due) ? due.split('T') : [];
  const date = h('input', { type: 'date', class: 'due-in due-date', value: d, 'aria-label': 'Due date' });
  const time = h('input', { type: 'time', class: 'due-in due-time', value: t, 'aria-label': 'Due time (optional)' });
  const cal = h('input', { type: 'checkbox', class: 'due-cal-box' });
  const calLbl = h('label', { class: 'due-cal', title: 'Also add to Google Calendar' }, cal, 'Google Calendar');
  const value = () => (date.value ? (time.value ? `${date.value}T${time.value}` : date.value) : '');
  const inputs = h('div', { class: 'due-row' }, date, time);
  inputs.hidden = !d;
  const showInputs = (box) => {
    inputs.hidden = false;
    box.focus();
  };
  const quick = DUE_QUICK.map(([label, days]) => ({
    days,
    b: h(
      'button',
      {
        type: 'button',
        class: 'chip due-q',
        'aria-pressed': 'false',
        onClick: () => {
          date.value = dueQuickDate(days);
          sync();
        },
      },
      label,
    ),
  }));
  const pick = h(
    'button',
    {
      type: 'button',
      class: 'chip due-q due-pick-date',
      onClick: () => {
        showInputs(date);
        try {
          date.showPicker();
        } catch {}
      },
    },
    'Pick a date…',
  );
  const label = h('span', { class: 'due-now' }, svgIcon('calendar'), h('span', {}));
  const addTime = h(
    'button',
    {
      type: 'button',
      class: 'due-add-time',
      onClick: () => {
        showInputs(time);
        sync();
      },
    },
    '+ Time',
  );
  const sync = () => {
    const v = value();
    cal.disabled = !date.value;
    if (!date.value) cal.checked = false;
    calLbl.classList.toggle('off', !date.value);
    clear.hidden = !date.value && !time.value;
    for (const { b, days } of quick) b.setAttribute('aria-pressed', String(!!date.value && date.value === dueQuickDate(days)));
    sum.hidden = !isDue(v);
    label.className = `due-now ${dueState(v) || ''}`;
    label.lastChild.textContent = dueLabel(v);
    addTime.hidden = !inputs.hidden || !!time.value;
    quickRow.hidden = !inputs.hidden;
  };
  const reset = () => {
    date.value = '';
    time.value = '';
    inputs.hidden = true;
    sync();
  };
  const clear = h('button', { type: 'button', class: 'due-clr', 'aria-label': 'Clear due date', onClick: reset }, '✕');
  const sum = h('div', { class: 'due-sum' }, label, addTime, calLbl, clear);
  const quickRow = h('div', { class: 'due-quick' }, ...quick.map((q) => q.b), pick);
  date.addEventListener('input', sync);
  time.addEventListener('input', sync);
  sync();
  const el = h('div', { class: 'due-pick', role: 'group', 'aria-label': 'Due date' }, quickRow, inputs, sum);
  const focus = () => (inputs.hidden ? quick[0].b : date).focus();
  return { el, date, value, reset, focus, calendar: () => cal.checked && isDue(value()) };
}

export function svgIcon(name) {
  const filled = name === 'grip' || name === 'more';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', filled ? 'currentColor' : 'none');
  el.setAttribute('stroke', filled ? 'none' : 'currentColor');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = ICON_PATHS[name] || '';
  return el;
}

export function letterIcon(bm) {
  const host = hostOf(bm.url);
  if (host.includes('github')) return 'gh';
  if (host.startsWith('localhost') || host.startsWith('127.')) return ':' + (host.split(':')[1] || 'l').slice(0, 2);
  if (host.includes('aws')) return 'aws';
  if (host.includes('argo')) return 'A';
  return (bm.title || host || '?').trim().slice(0, 2);
}

export function iconEl(bm, showFavicons) {
  const ico = h('span', { class: 'ico' });
  if (showFavicons) {
    const img = h('img', { src: faviconUrl(bm.url), alt: '' });
    img.addEventListener('error', () => {
      img.remove();
      ico.textContent = letterIcon(bm);
    });
    ico.append(img);
  } else ico.textContent = letterIcon(bm);
  return ico;
}

export function highlight(el, text, query) {
  el.replaceChildren();
  if (!query) {
    el.textContent = text;
    return;
  }
  const terms = query
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) {
    el.textContent = text;
    return;
  }
  const re = new RegExp(`(${terms.join('|')})`, 'ig');
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) el.append(text.slice(last, m.index));
    el.append(h('mark', {}, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) el.append(text.slice(last));
}
