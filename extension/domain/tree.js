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

export function sections(root, order, hidden = []) {
  const kids = (root.children || []).filter((k) => !hidden.includes(k.id));
  const linksOf = (n) => (n.children || []).filter((c) => c.url);
  const partOf = (node, path, depth) => {
    const links = linksOf(node);
    const parts = (node.children || []).filter((c) => !c.url).map((c) => partOf(c, [...path, c.title || '(untitled)'], depth + 1));
    return { id: node.id, title: node.title || '(untitled)', node, links, parts, all: [...links, ...parts.flatMap((pt) => pt.all)], path, depth };
  };
  const folders = kids
    .filter((k) => !k.url)
    .map((f) => {
      const links = linksOf(f);
      const parts = (f.children || []).filter((c) => !c.url).map((c) => partOf(c, [c.title || '(untitled)'], 0));
      return { id: f.id, title: f.title || '(untitled)', node: f, links, parts, all: [...links, ...parts.flatMap((pt) => pt.all)] };
    });
  const loose = linksOf(root);
  if (loose.length) folders.push({ id: `unsorted:${root.id}`, title: 'Unsorted', node: root, links: loose, parts: [], all: loose, virtual: true });
  const rank = new Map(order.map((id, i) => [id, i]));
  const key = (x) => (x.virtual ? Infinity : rank.has(x.id) ? rank.get(x.id) : 1e9 + (x.node.index || 0));
  return folders.sort((a, b) => key(a) - key(b));
}

export function allParts(folder) {
  return (folder.parts || []).flatMap((p) => [p, ...allParts(p)]);
}
