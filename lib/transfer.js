// Export / import. JSON carries bookmarks + warehouse preferences; HTML is the Netscape format Chrome itself imports/exports.
import { saveSettings } from './core.js';

const stamp = () => new Date().toISOString().slice(0, 10);

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const linkOut = (l) => ({ title: l.title, url: l.url, dateAdded: l.dateAdded });

export function exportJson(root, secs, settings) {
  const byId = Object.fromEntries(secs.map(s => [s.id, s.title]));
  const data = {
    format: 'sumonta-warehouse', version: 1, exportedAt: new Date().toISOString(),
    root: root.title,
    preferences: {
      order: settings.order.map(id => byId[id]).filter(Boolean),             // titles, so it survives different bookmark ids
      folders: Object.fromEntries(Object.entries(settings.folders).filter(([id]) => byId[id]).map(([id, p]) => [byId[id], p])),
      categories: settings.categories.map(c => ({ name: c.name, closed: !!c.closed, folders: Object.entries(settings.folderCat).filter(([id, cat]) => cat === c.id && byId[id]).map(([id]) => byId[id]) })),
      envRules: settings.envRules, hostMap: settings.hostMap, showFavicons: settings.showFavicons
    },
    sections: secs.map(s => ({ title: s.title, unsorted: !!s.virtual, links: s.links.map(linkOut), parts: s.parts.map(pt => ({ title: pt.title, links: pt.links.map(linkOut) })) }))
  };
  download(`warehouse-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function exportHtml(root, secs) {
  const lines = ['<!DOCTYPE NETSCAPE-Bookmark-file-1>', '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">', '<TITLE>Bookmarks</TITLE>', '<H1>Bookmarks</H1>', '<DL><p>', `    <DT><H3>${esc(root.title)}</H3>`, '    <DL><p>'];
  const item = (l, pad) => `${pad}<DT><A HREF="${esc(l.url)}" ADD_DATE="${Math.floor((l.dateAdded || Date.now()) / 1000)}">${esc(l.title)}</A>`;
  for (const s of secs) {
    if (s.virtual) { lines.push(...s.links.map(l => item(l, '        '))); continue; }
    lines.push(`        <DT><H3>${esc(s.title)}</H3>`, '        <DL><p>');
    for (const pt of s.parts) lines.push(`            <DT><H3>${esc(pt.title)}</H3>`, '            <DL><p>', ...pt.links.map(l => item(l, '                ')), '            </DL><p>');
    lines.push(...s.links.map(l => item(l, '            ')), '        </DL><p>');
  }
  lines.push('    </DL><p>', '</DL><p>');
  download(`warehouse-${stamp()}.html`, lines.join('\n'), 'text/html');
}

// Returns { folders, links, skipped }. Merges into `root`: folders matched by title, links skipped when the URL already exists in that folder.
export async function importFile(file, root, settings) {
  const text = await file.text();
  const parsed = file.name.toLowerCase().endsWith('.json') ? parseJson(text) : parseHtml(text);
  const [fresh] = await chrome.bookmarks.getSubTree(root.id);
  const kids = fresh.children || [];
  let folders = 0, links = 0, skipped = 0;
  const titleToId = {};

  for (const sec of parsed.sections) {
    let parentId;
    if (sec.unsorted) parentId = root.id;
    else {
      let f = kids.find(k => !k.url && k.title === sec.title);
      if (!f) { f = await chrome.bookmarks.create({ parentId: root.id, title: sec.title }); f.children = []; kids.push(f); folders++; }
      parentId = f.id;
    }
    titleToId[sec.title] = parentId;
    const existing = new Set((parentId === root.id ? kids : kids.find(k => k.id === parentId).children || []).filter(k => k.url).map(k => k.url));
    for (const l of sec.links) {
      if (!l.url) continue;
      if (existing.has(l.url)) { skipped++; continue; }
      await chrome.bookmarks.create({ parentId, title: l.title || l.url, url: l.url });
      existing.add(l.url); links++;
    }
    if (sec.unsorted) continue;
    const parent = kids.find(k => k.id === parentId);
    parent.children ||= [];
    for (const pt of sec.parts || []) {
      let sf = parent.children.find(k => !k.url && k.title === pt.title);
      if (!sf) { sf = await chrome.bookmarks.create({ parentId, title: pt.title }); sf.children = []; parent.children.push(sf); folders++; }
      const have = new Set((sf.children || []).filter(k => k.url).map(k => k.url));
      for (const l of pt.links || []) {
        if (!l.url) continue;
        if (have.has(l.url)) { skipped++; continue; }
        await chrome.bookmarks.create({ parentId: sf.id, title: l.title || l.url, url: l.url });
        have.add(l.url); links++;
      }
    }
  }

  if (parsed.preferences) {
    const p = parsed.preferences;
    const order = (p.order || []).map(t => titleToId[t]).filter(Boolean);
    const foldersPrefs = { ...settings.folders };
    for (const [t, prefs] of Object.entries(p.folders || {})) if (titleToId[t]) foldersPrefs[titleToId[t]] = prefs;
    const categories = [...settings.categories];
    const folderCat = { ...settings.folderCat };
    for (const c of p.categories || []) {
      if (!c?.name) continue;
      let cat = categories.find(x => x.name === c.name);
      if (!cat) { cat = { id: `c${Date.now()}${categories.length}`, name: c.name, closed: !!c.closed }; categories.push(cat); }
      for (const t of c.folders || []) if (titleToId[t]) folderCat[titleToId[t]] = cat.id;
    }
    await saveSettings({
      ...(order.length ? { order } : {}),
      categories, folderCat,
      folders: foldersPrefs,
      ...(p.envRules?.length ? { envRules: p.envRules } : {}),
      ...(p.hostMap?.length ? { hostMap: p.hostMap } : {}),
      ...(typeof p.showFavicons === 'boolean' ? { showFavicons: p.showFavicons } : {})
    });
  }
  return { folders, links, skipped };
}

function parseJson(text) {
  const d = JSON.parse(text);
  if (d.format !== 'sumonta-warehouse' || !Array.isArray(d.sections)) throw new Error('not a Warehouse export');
  return { sections: d.sections, preferences: d.preferences || null };
}

// Netscape HTML: nested <DL> with <DT><H3> folders and <DT><A> links. We flatten to one level: each H3 at any depth becomes a section,
// links not inside any H3 go to Unsorted.
function parseHtml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const sections = [];
  const loose = [];
  const walk = (dl, sec) => {
    for (const dt of dl.children) {
      if (dt.tagName !== 'DT') continue;
      const h3 = dt.querySelector(':scope > h3');
      const a = dt.querySelector(':scope > a');
      if (h3) {
        const s = { title: h3.textContent.trim() || '(untitled)', links: [] };
        const inner = dt.querySelector(':scope > dl');
        if (inner) walk(inner, s);
        if (s.links.length) sections.push(s);
      } else if (a) {
        (sec ? sec.links : loose).push({ title: a.textContent.trim(), url: a.getAttribute('href') });
      }
    }
  };
  const top = doc.querySelector('dl');
  if (!top) throw new Error('no bookmarks found in this HTML');
  walk(top, null);
  if (loose.length) sections.push({ title: 'Unsorted', unsorted: true, links: loose });
  if (!sections.length) throw new Error('no bookmarks found in this HTML');
  return { sections, preferences: null };
}
