import { ENVS } from '../constants/envs.js';
import { SORTS } from '../constants/sorts.js';
import { cleanMeta } from './meta.js';
import { cleanTags } from './tags.js';

export const backupName = (ext) => `warehouse-${new Date().toISOString().slice(0, 10)}.${ext}`;

const linkOut = (l) => ({ title: l.title, url: l.url, dateAdded: l.dateAdded });

export function exportData(root, secs, settings, meta) {
  const out = (l) => ({ ...linkOut(l), ...(meta[l.id] || {}) });
  const byId = Object.fromEntries(secs.map((s) => [s.id, s.title]));
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
    sections: secs.map((s) => ({
      title: s.title,
      unsorted: !!s.virtual,
      links: s.links.map(out),
      parts: s.parts.map((pt) => ({ title: pt.title, links: pt.links.map(out) })),
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
  for (const s of secs) {
    if (s.virtual) {
      lines.push(...s.links.map((l) => item(l, '        ')));
      continue;
    }
    lines.push(`        <DT><H3>${esc(s.title)}</H3>`, '        <DL><p>');
    for (const pt of s.parts)
      lines.push(
        `            <DT><H3>${esc(pt.title)}</H3>`,
        '            <DL><p>',
        ...pt.links.map((l) => item(l, '                ')),
        '            </DL><p>',
      );
    lines.push(...s.links.map((l) => item(l, '            ')), '        </DL><p>');
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
    .map((l) => ({ title: isStr(l.title) ? l.title : '', url: l.url, ...cleanMeta(l) }));

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

export function cleanImport(d) {
  const sections = list(d.sections)
    .filter((s) => isObj(s) && isStr(s.title))
    .map((s) => ({
      title: s.title,
      unsorted: s.unsorted === true,
      links: cleanLinks(s.links),
      parts: list(s.parts)
        .filter((pt) => isObj(pt) && isStr(pt.title))
        .map((pt) => ({ title: pt.title, links: cleanLinks(pt.links) })),
    }));
  const p = d.preferences;
  if (!isObj(p)) return { sections, preferences: null };
  const folders = {};
  for (const [t, f] of Object.entries(isObj(p.folders) ? p.folders : {})) {
    const prefs = cleanFolderPrefs(f);
    if (prefs) folders[t] = prefs;
  }
  const customTags = cleanTags(p.customTags);
  const tags = [...ENVS, ...customTags.map((t) => t.name)];
  return {
    sections,
    preferences: {
      ...(customTags.length ? { customTags } : {}),
      order: list(p.order).filter(isStr),
      folders,
      categories: list(p.categories)
        .filter((c) => isObj(c) && isStr(c.name) && c.name.trim())
        .map((c) => ({ name: c.name.trim(), closed: c.closed === true, folders: list(c.folders).filter(isStr) })),
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
