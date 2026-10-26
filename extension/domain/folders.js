export function folderPrefs(folders, id) {
  return { sort: 'manual', view: 'list', show: 'title', closed: {}, ...(folders[id] || {}) };
}

export function catOf(settings, folderId) {
  const c = settings.folderCat[folderId];
  return settings.categories.some((x) => x.id === c) ? c : null;
}

export function folderGroups(settings, secs) {
  const real = secs.filter((s) => !s.virtual);
  return [
    ...settings.categories.map((cat) => ({ cat, items: real.filter((s) => catOf(settings, s.id) === cat.id) })),
    { cat: null, items: real.filter((s) => !catOf(settings, s.id)) },
  ];
}

export function navOrder(settings, secs, pages) {
  if (!settings.categories.length) return [...pages, ...secs];
  return [...pages, ...folderGroups(settings, secs).flatMap((g) => (g.cat?.closed ? [] : g.items)), ...secs.filter((s) => s.virtual)];
}

export function stepNav(list, current, key) {
  const i = list.indexOf(current);
  return i < 0 ? list[0] : list[i + (key === 'j' ? 1 : -1)];
}

const realIds = (secs, without) =>
  secs
    .filter((x) => !x.virtual)
    .map((x) => x.id)
    .filter((x) => x !== without);

export function orderStep(settings, secs, s, delta) {
  const peers = secs.filter((x) => !x.virtual && catOf(settings, x.id) === catOf(settings, s.id));
  const n = peers[peers.indexOf(s) + delta];
  if (!n) return null;
  const ids = realIds(secs, s.id);
  ids.splice(ids.indexOf(n.id) + (delta > 0 ? 1 : 0), 0, s.id);
  return ids;
}

export function orderMove(secs, id, targetId, after) {
  const ids = realIds(secs, id);
  ids.splice(ids.indexOf(targetId) + (after ? 1 : 0), 0, id);
  return ids;
}

export function orderToTop(secs, id) {
  return [id, ...realIds(secs, id)];
}

export function orderIntoCategory(settings, secs, id, target) {
  const ids = realIds(secs, id);
  ids.splice(ids.findLastIndex((x) => catOf(settings, x) === target) + 1, 0, id);
  return ids;
}

export function withCategory(folderCat, id, target) {
  const next = { ...folderCat };
  if (target) next[id] = target;
  else delete next[id];
  return next;
}

export function reorderCategories(categories, fromId, toId, after) {
  const moving = categories.find((c) => c.id === fromId);
  if (!moving) return null;
  const cats = categories.filter((c) => c.id !== fromId);
  cats.splice(cats.findIndex((c) => c.id === toId) + (after ? 1 : 0), 0, moving);
  return cats;
}

export function sectionTargets(folder, bm) {
  if (!folder || folder.virtual || !folder.parts?.length || !folder.all.some((x) => x.id === bm.id)) return [];
  return [...folder.parts, { title: 'No section', node: folder.node }].filter((g) => g.node.id !== bm.parentId);
}

export function findView(id, pages, secs) {
  return pages.find((v) => v.id === id) || secs.find((s) => s.id === id) || null;
}

export function boardLanes(settings, secs) {
  const unsorted = secs.filter((s) => s.virtual);
  if (!settings.categories.length || settings.board.group === 'flat') return [{ name: null, items: secs }];
  const groups = folderGroups(settings, secs);
  const out = groups.filter((g) => g.cat).map((g) => ({ name: g.cat.name, color: g.cat.color, icon: g.cat.icon, items: g.items }));
  const rest = groups.find((g) => !g.cat);
  out.push({ name: 'No category', items: [...rest.items, ...unsorted] });
  return out.filter((l) => l.items.length);
}
