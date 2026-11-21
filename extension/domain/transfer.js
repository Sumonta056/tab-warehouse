import { ENVS } from '../constants/envs.js';
import { SORTS } from '../constants/sorts.js';
import { IMPORT_DEPTH, HOME_LIMITS, HOME_FLAGS, SIDE_LOOK_LIMITS, NAME_MAX } from '../constants/limits.js';
import { THEMES } from '../constants/themes.js';
import { markOf } from './marks.js';
import { withoutDone } from './meta.js';
import { cleanTags } from './tags.js';
import { clampFont, clampSideWidth } from './sizes.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function importText(r) {
  const parts = [plural(r.folders, 'folder'), plural(r.links, 'new link')];
  if (r.homeLinks) parts.push(plural(r.homeLinks, 'Home link'));
  if (r.skipped) parts.push(`${r.skipped} already there`);
  return `Imported: ${parts.join(', ')}${r.bgSkipped ? '. The background was skipped: not enough storage space.' : ''}`;
}

export const backupName = (ext) => `warehouse-${new Date().toISOString().slice(0, 10)}.${ext}`;

const linkOut = (l) => ({ title: l.title, url: l.url, dateAdded: l.dateAdded });

export function folderPath(root, id) {
  if (!id) return null;
  const walk = (n, path) => {
    if (n.id === id) return path;
    for (const c of n.children || []) {
      if (c.url) continue;
      const p = walk(c, [...path, c.title]);
      if (p) return p;
    }
    return null;
  };
  return walk(root, []);
}

export function folderAt(root, path) {
  let n = root;
  for (const t of path) {
    n = (n.children || []).find((c) => !c.url && c.title === t);
    if (!n) return null;
  }
  return n;
}

const homeLook = (home) => Object.fromEntries(Object.entries(home || {}).filter(([k]) => k !== 'folderId'));

export function exportData(root, secs, settings, meta, { homeLinks = [], homeIcons = {}, homeBg = '' } = {}) {
  const paths = (ids) => (ids || []).map((id) => folderPath(root, id)).filter(Boolean);
  const out = (l) => ({ ...linkOut(l), ...withoutDone(meta[l.id]) });
  const byId = Object.fromEntries(secs.map((s) => [s.id, s.title]));
  const partOut = (pt) => ({
    title: pt.title,
    ...markOf(settings.partColors?.[pt.id], settings.partIcons?.[pt.id]),
    links: pt.links.map(out),
    parts: pt.parts.map(partOut),
  });
  return {
    format: 'sumonta-warehouse',
    version: 1,
    exportedAt: new Date().toISOString(),
    root: root.title,
    preferences: {
      order: settings.order.map((id) => byId[id]).filter(Boolean),
      folders: Object.fromEntries(
        Object.entries(settings.folders)
          .filter(([id]) => byId[id])
          .map(([id, p]) => [byId[id], p]),
      ),
      categories: settings.categories.map((c) => ({
        name: c.name,
        closed: !!c.closed,
        ...markOf(c.color, c.icon),
        folders: Object.entries(settings.folderCat)
          .filter(([id, cat]) => cat === c.id && byId[id])
          .map(([id]) => byId[id]),
      })),
      customTags: settings.customTags || [],
      envRules: settings.envRules,
      hostMap: settings.hostMap,
      showFavicons: settings.showFavicons,
      board: { group: settings.board?.group },
    },
    home: {
      links: homeLinks.map((l) => ({ title: l.title, url: l.url, ...(homeIcons[l.id] ? { icon: homeIcons[l.id] } : {}) })),
      look: homeLook(settings.home),
      ...(homeBg ? { bg: homeBg } : {}),
    },
    look: {
      theme: settings.theme,
      userName: settings.userName || '',
      sideLook: settings.sideLook,
      sideWidth: settings.sideWidth,
      fontSide: settings.fontSide,
      fontPage: settings.fontPage,
      fontBoard: settings.fontBoard,
    },
    folderPaths: {
      lastFolder: folderPath(root, settings.lastFolder),
      lastSaveFolder: folderPath(root, settings.lastSaveFolder),
      savePins: paths(settings.savePins),
      saveRecent: paths(settings.saveRecent),
    },
    sections: secs.map((s) => ({
      title: s.title,
      unsorted: !!s.virtual,
      ...(s.virtual ? {} : markOf(settings.folderColors?.[s.id], settings.folderIcons?.[s.id])),
      links: s.links.map(out),
      parts: s.parts.map(partOut),
    })),
  };
}

const esc = (t) =>
  String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function netscapeHtml(root, secs) {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    `    <DT><H3>${esc(root.title)}</H3>`,
    '    <DL><p>',
  ];
  const item = (l, pad) => `${pad}<DT><A HREF="${esc(l.url)}" ADD_DATE="${Math.floor((l.dateAdded || Date.now()) / 1000)}">${esc(l.title)}</A>`;
  const folder = (s, pad) => {
    lines.push(`${pad}<DT><H3>${esc(s.title)}</H3>`, `${pad}<DL><p>`);
    for (const pt of s.parts) folder(pt, `${pad}    `);
    lines.push(...s.links.map((l) => item(l, `${pad}    `)), `${pad}</DL><p>`);
  };
  for (const s of secs) {
    if (s.virtual) {
      lines.push(...s.links.map((l) => item(l, '        ')));
      continue;
    }
    folder(s, '        ');
  }
  lines.push('    </DL><p>', '</DL><p>');
  return lines.join('\n');
}

export function parseJson(text) {
  const d = JSON.parse(text);
  if (d?.format !== 'sumonta-warehouse' || !Array.isArray(d.sections)) throw new Error('not a Warehouse export');
  return cleanImport(d);
}

const isStr = (v) => typeof v === 'string';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v) => (Array.isArray(v) ? v : []);
const cleanLinks = (v) =>
  list(v)
    .filter((l) => isObj(l) && isStr(l.url) && l.url)
    .map((l) => ({ title: isStr(l.title) ? l.title : '', url: l.url, ...withoutDone(l) }));

function cleanFolderPrefs(f) {
  if (!isObj(f)) return null;
  const out = {};
  if (Object.hasOwn(SORTS, f.sort)) out.sort = f.sort;
  if (f.view === 'list' || f.view === 'matrix') out.view = f.view;
  if (f.show === 'title' || f.show === 'url') out.show = f.show;
  if (isObj(f.closed)) out.closed = Object.fromEntries(Object.entries(f.closed).filter(([, v]) => typeof v === 'boolean'));
  return out;
}

export const addTags = (have = [], add) => [...have, ...add.filter((t) => !have.some((x) => x.name === t.name))];

function cleanParts(v, depth) {
  if (depth >= IMPORT_DEPTH) return [];
  return list(v)
    .filter((pt) => isObj(pt) && isStr(pt.title))
    .map((pt) => ({ title: pt.title, ...markOf(pt.color, pt.icon), links: cleanLinks(pt.links), parts: cleanParts(pt.parts, depth + 1) }));
}

const HEX = /^#[0-9a-f]{6}$/i;
const IMG = /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i;
const isImage = (v) => isStr(v) && IMG.test(v);
const isIcon = (v) => isImage(v) || (isStr(v) && /^https?:\/\/\S+$/i.test(v));
const inRange = (v, [min, max]) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(min, Math.min(max, v))) : undefined);
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const isPath = (v) => Array.isArray(v) && v.every(isStr);

function cleanHome(h) {
  if (!isObj(h)) return null;
  const look = isObj(h.look) ? h.look : {};
  return {
    links: list(h.links)
      .filter((l) => isObj(l) && isStr(l.url) && l.url)
      .map((l) => ({ title: isStr(l.title) ? l.title : '', url: l.url, ...(isIcon(l.icon) ? { icon: l.icon } : {}) })),
    look: defined({
      color: HEX.test(look.color || '') ? look.color.toLowerCase() : undefined,
      ...Object.fromEntries(Object.entries(HOME_LIMITS).map(([k, r]) => [k, inRange(look[k], r)])),
      ...Object.fromEntries(HOME_FLAGS.map((k) => [k, typeof look[k] === 'boolean' ? look[k] : undefined])),
    }),
    ...(isImage(h.bg) ? { bg: h.bg } : {}),
  };
}

function cleanLook(l) {
  if (!isObj(l)) return null;
  const side = isObj(l.sideLook) ? l.sideLook : null;
  const num = (v, clamp) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v) : undefined);
  return defined({
    theme: Object.hasOwn(THEMES, l.theme) ? l.theme : HEX.test(l.theme || '') ? l.theme.toLowerCase() : undefined,
    userName: isStr(l.userName) ? l.userName.trim().slice(0, NAME_MAX) : undefined,
    sideLook: side
      ? defined({
          mode: side.mode === 'solid' || side.mode === 'image' ? side.mode : undefined,
          color: HEX.test(side.color || '') ? side.color.toLowerCase() : undefined,
          dark: inRange(side.dark, SIDE_LOOK_LIMITS.dark),
          blur: inRange(side.blur, SIDE_LOOK_LIMITS.blur),
        })
      : undefined,
    sideWidth: num(l.sideWidth, clampSideWidth),
    fontSide: num(l.fontSide, clampFont),
    fontPage: num(l.fontPage, clampFont),
    fontBoard: num(l.fontBoard, clampFont),
  });
}

function cleanFolderPaths(f) {
  if (!isObj(f)) return null;
  return {
    lastFolder: isPath(f.lastFolder) ? f.lastFolder : null,
    lastSaveFolder: isPath(f.lastSaveFolder) ? f.lastSaveFolder : null,
    savePins: list(f.savePins).filter(isPath),
    saveRecent: list(f.saveRecent).filter(isPath),
  };
}

export function cleanImport(d) {
  const sections = list(d.sections)
    .filter((s) => isObj(s) && isStr(s.title))
    .map((s) => ({
      title: s.title,
      unsorted: s.unsorted === true,
      ...(s.unsorted === true ? {} : markOf(s.color, s.icon)),
      links: cleanLinks(s.links),
      parts: cleanParts(s.parts, 0),
    }));
  const extra = defined({
    home: cleanHome(d.home) || undefined,
    look: cleanLook(d.look) || undefined,
    folderPaths: cleanFolderPaths(d.folderPaths) || undefined,
  });
  const p = d.preferences;
  if (!isObj(p)) return { sections, preferences: null, ...extra };
  const folders = {};
  for (const [t, f] of Object.entries(isObj(p.folders) ? p.folders : {})) {
    const prefs = cleanFolderPrefs(f);
    if (prefs) folders[t] = prefs;
  }
  const customTags = cleanTags(p.customTags);
  const tags = [...ENVS, ...customTags.map((t) => t.name)];
  return {
    sections,
    ...extra,
    preferences: {
      ...(customTags.length ? { customTags } : {}),
      order: list(p.order).filter(isStr),
      folders,
      categories: list(p.categories)
        .filter((c) => isObj(c) && isStr(c.name) && c.name.trim())
        .map((c) => ({ name: c.name.trim(), closed: c.closed === true, ...markOf(c.color, c.icon), folders: list(c.folders).filter(isStr) })),
      envRules: list(p.envRules)
        .filter((r) => isObj(r) && isStr(r.pattern) && r.pattern.trim() && tags.includes(r.env))
        .map((r) => ({ pattern: r.pattern.trim().toLowerCase(), env: r.env })),
      hostMap: list(p.hostMap)
        .filter(isObj)
        .map((r) => Object.fromEntries(tags.filter((e) => isStr(r[e]) && r[e].trim()).map((e) => [e, r[e].trim()])))
        .filter((r) => Object.keys(r).length),
      ...(typeof p.showFavicons === 'boolean' ? { showFavicons: p.showFavicons } : {}),
      ...(isObj(p.board) && (p.board.group === 'cat' || p.board.group === 'flat') ? { board: { group: p.board.group } } : {}),
    },
  };
}
