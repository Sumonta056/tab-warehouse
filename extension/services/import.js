import { cleanMeta } from '../domain/meta.js';
import { parseJson, addTags, folderAt } from '../domain/transfer.js';
import { CHIP_MAX } from '../constants/limits.js';
import { saveSettings, loadSettings, loadLinkMeta, loadHomeStore, saveHomeIcons, saveHomeBg } from './storage.js';
import { ensureHomeFolder } from './home-folder.js';

export async function importFile(file, root, settings) {
  const text = await file.text();
  const parsed = file.name.toLowerCase().endsWith('.json') ? parseJson(text) : parseHtml(text);
  const [fresh] = await chrome.bookmarks.getSubTree(root.id);
  const kids = fresh.children || [];
  let folders = 0,
    links = 0,
    skipped = 0;
  const titleToId = Object.create(null);
  const metaIn = {};
  const keepMeta = (id, l) => {
    const m = cleanMeta(l);
    if (m) metaIn[id] = m;
  };
  const marks = {
    folderColors: { ...settings.folderColors },
    folderIcons: { ...settings.folderIcons },
    partColors: { ...settings.partColors },
    partIcons: { ...settings.partIcons },
  };
  const keepMark = (kind, id, m) => {
    if (m.color) marks[`${kind}Colors`][id] ||= m.color;
    if (m.icon) marks[`${kind}Icons`][id] ||= m.icon;
  };

  const importParts = async (parent, parts) => {
    for (const pt of parts || []) {
      let sf = (parent.children ||= []).find((k) => !k.url && k.title === pt.title);
      if (!sf) {
        sf = await chrome.bookmarks.create({ parentId: parent.id, title: pt.title });
        sf.children = [];
        parent.children.push(sf);
        folders++;
      }
      keepMark('part', sf.id, pt);
      const have = new Map((sf.children || []).filter((k) => k.url).map((k) => [k.url, k.id]));
      for (const l of pt.links || []) {
        if (!l.url) continue;
        if (have.has(l.url)) {
          keepMeta(have.get(l.url), l);
          skipped++;
          continue;
        }
        const bm = await chrome.bookmarks.create({ parentId: sf.id, title: l.title || l.url, url: l.url });
        keepMeta(bm.id, l);
        have.set(l.url, bm.id);
        links++;
      }
      await importParts(sf, pt.parts);
    }
  };

  for (const sec of parsed.sections) {
    let parentId;
    if (sec.unsorted) parentId = root.id;
    else {
      let f = kids.find((k) => !k.url && k.title === sec.title);
      if (!f) {
        f = await chrome.bookmarks.create({ parentId: root.id, title: sec.title });
        f.children = [];
        kids.push(f);
        folders++;
      }
      parentId = f.id;
      keepMark('folder', parentId, sec);
    }
    titleToId[sec.title] = parentId;
    const existing = new Map((parentId === root.id ? kids : kids.find((k) => k.id === parentId).children || []).filter((k) => k.url).map((k) => [k.url, k.id]));
    for (const l of sec.links) {
      if (!l.url) continue;
      if (existing.has(l.url)) {
        keepMeta(existing.get(l.url), l);
        skipped++;
        continue;
      }
      const bm = await chrome.bookmarks.create({ parentId, title: l.title || l.url, url: l.url });
      keepMeta(bm.id, l);
      existing.set(l.url, bm.id);
      links++;
    }
    if (sec.unsorted) continue;
    const parent = kids.find((k) => k.id === parentId);
    parent.children ||= [];
    await importParts(parent, sec.parts);
  }

  if (parsed.preferences) {
    const p = parsed.preferences;
    const order = (p.order || []).map((t) => titleToId[t]).filter(Boolean);
    const foldersPrefs = { ...settings.folders };
    for (const [t, prefs] of Object.entries(p.folders || {})) if (titleToId[t]) foldersPrefs[titleToId[t]] = prefs;
    const categories = settings.categories.map((c) => ({ ...c }));
    const folderCat = { ...settings.folderCat };
    for (const c of p.categories || []) {
      if (!c?.name) continue;
      let cat = categories.find((x) => x.name === c.name);
      if (!cat) {
        cat = { id: `c${Date.now()}${categories.length}`, name: c.name, closed: !!c.closed };
        categories.push(cat);
      }
      if (c.color) cat.color ||= c.color;
      if (c.icon) cat.icon ||= c.icon;
      for (const t of c.folders || []) if (titleToId[t]) folderCat[titleToId[t]] = cat.id;
    }
    await saveSettings({
      ...(order.length ? { order } : {}),
      categories,
      folderCat,
      folders: foldersPrefs,
      ...(p.customTags?.length ? { customTags: addTags(settings.customTags, p.customTags) } : {}),
      ...(p.envRules?.length ? { envRules: p.envRules } : {}),
      ...(p.hostMap?.length ? { hostMap: p.hostMap } : {}),
      ...(typeof p.showFavicons === 'boolean' ? { showFavicons: p.showFavicons } : {}),
      ...(p.board ? { board: { ...settings.board, ...p.board } } : {}),
    });
  }
  await saveSettings(marks);
  if (Object.keys(metaIn).length) {
    const all = await loadLinkMeta();
    for (const [id, m] of Object.entries(metaIn)) all[id] ||= m;
    await chrome.storage.local.set({ linkMeta: all });
  }
  const home = parsed.home ? await importHome(parsed.home) : {};
  if (parsed.look) await importLook(parsed.look);
  if (parsed.folderPaths) await importFolderPaths(parsed.folderPaths, root.id);
  return { folders, links, skipped, ...home };
}

async function importHome(home) {
  const [tree] = await chrome.bookmarks.getTree();
  const { settings } = await ensureHomeFolder(tree, await loadSettings());
  const folderId = settings.home.folderId;
  const have = new Map((await chrome.bookmarks.getChildren(folderId)).filter((k) => k.url).map((k) => [k.url, k.id]));
  const { icons } = await loadHomeStore();
  let homeLinks = 0;
  for (const l of home.links) {
    let id = have.get(l.url);
    if (!id) {
      id = (await chrome.bookmarks.create({ parentId: folderId, title: l.title || l.url, url: l.url })).id;
      have.set(l.url, id);
      homeLinks++;
    }
    if (l.icon) icons[id] = l.icon;
  }
  await saveHomeIcons(icons);
  await saveSettings({ home: { ...settings.home, ...home.look, folderId } });
  let bgSkipped = false;
  if (home.bg) {
    try {
      await saveHomeBg(home.bg);
    } catch {
      bgSkipped = true;
    }
  }
  return { homeLinks, bgSkipped };
}

async function importLook(look) {
  const cur = await loadSettings();
  await saveSettings({ ...look, ...(look.sideLook ? { sideLook: { ...cur.sideLook, ...look.sideLook } } : {}) });
}

async function importFolderPaths(f, rootId) {
  const [root] = await chrome.bookmarks.getSubTree(rootId);
  const idOf = (path) => (path ? folderAt(root, path)?.id || null : null);
  const ids = (paths) => [...new Set(paths.map(idOf).filter(Boolean))].slice(0, CHIP_MAX);
  const lastFolder = idOf(f.lastFolder);
  const lastSaveFolder = idOf(f.lastSaveFolder);
  const savePins = ids(f.savePins);
  const saveRecent = ids(f.saveRecent);
  await saveSettings({
    ...(lastFolder ? { lastFolder } : {}),
    ...(lastSaveFolder ? { lastSaveFolder } : {}),
    ...(savePins.length ? { savePins } : {}),
    ...(saveRecent.length ? { saveRecent } : {}),
  });
}

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
