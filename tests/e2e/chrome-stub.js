(() => {
  const H = window.parent.__harness;
  window.__errors = [];
  window.addEventListener('error', (e) => window.__errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason?.message || e.reason)));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const find = (id, node = H.tree) => {
    if (node.id === id) return node;
    for (const c of node.children || []) {
      const r = find(id, c);
      if (r) return r;
    }
    return null;
  };
  const reindex = (node, parentId) => {
    if (parentId !== undefined) node.parentId = parentId;
    (node.children || []).forEach((c, i) => {
      c.index = i;
      reindex(c, node.id);
    });
  };
  const listeners = {};
  const on = (name) => ({
    addListener: (f) => {
      (listeners[name] ||= []).push(f);
    },
  });
  const emit = (name, ...args) => {
    H.log.push([name, ...args.map((a) => (typeof a === 'object' ? clone(a) : a))]);
    setTimeout(() => (listeners[name] || []).forEach((f) => f(...args)), 0);
  };
  const fail = (msg) => Promise.reject(new Error(msg));
  const validUrl = (u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  };

  const bookmarks = {
    async getTree() {
      return [clone(H.tree)];
    },
    async getSubTree(id) {
      const n = find(id);
      return n ? [clone(n)] : fail(`Can't find bookmark for id. ${id}`);
    },
    async getChildren(id) {
      const n = find(id);
      return n
        ? clone(n.children || []).map((c) => {
            delete c.children;
            return c;
          })
        : fail(`Can't find parent bookmark for id. ${id}`);
    },
    async get(id) {
      const n = find(id);
      return n ? [clone({ ...n, children: undefined })] : fail(`Can't find bookmark for id. ${id}`);
    },
    async search(q) {
      const out = [];
      const walk = (n) => {
        if (n.url && (!q.url || n.url === q.url)) out.push(n);
        (n.children || []).forEach(walk);
      };
      walk(H.tree);
      return clone(out);
    },
    async create({ parentId, title = '', url, index }) {
      const p = find(parentId);
      if (!p || p.url) return fail(`Can't find parent bookmark for id. ${parentId}`);
      if (url !== undefined && !validUrl(url)) return fail('Invalid URL.');
      const node = { id: String(H.nextId++), title, dateAdded: Date.now(), ...(url !== undefined ? { url } : { children: [] }) };
      p.children ||= [];
      if (index == null || index > p.children.length) p.children.push(node);
      else p.children.splice(index, 0, node);
      reindex(H.tree);
      emit('onCreated', node.id, clone(node));
      return clone(node);
    },
    async move(id, { parentId, index }) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      const from = find(node.parentId);
      const to = find(parentId ?? node.parentId);
      if (!to || to.url) return fail(`Can't find parent bookmark for id. ${parentId}`);
      const oldIndex = node.index;
      from.children.splice(from.children.indexOf(node), 1);
      let at = index == null ? to.children.length : index;
      if (from === to && index != null && index > oldIndex) at -= 1;
      to.children.splice(Math.min(at, to.children.length), 0, node);
      reindex(H.tree);
      emit('onMoved', id, { parentId: to.id, index: node.index, oldParentId: from.id, oldIndex });
      return clone(node);
    },
    async update(id, changes) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      if (changes.url !== undefined && !validUrl(changes.url)) return fail('Invalid URL.');
      if (changes.title !== undefined) node.title = changes.title;
      if (changes.url !== undefined && node.url !== undefined) node.url = changes.url;
      emit('onChanged', id, clone(changes));
      return clone(node);
    },
    async remove(id) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      if (node.children?.length) return fail("Can't remove non-empty folder (use recursive to force).");
      const p = find(node.parentId);
      p.children.splice(p.children.indexOf(node), 1);
      reindex(H.tree);
      emit('onRemoved', id, { parentId: p.id, index: node.index });
    },
    async removeTree(id) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      const p = find(node.parentId);
      p.children.splice(p.children.indexOf(node), 1);
      reindex(H.tree);
      emit('onRemoved', id, { parentId: p.id, index: node.index });
    },
    onCreated: on('onCreated'),
    onRemoved: on('onRemoved'),
    onChanged: on('onChanged'),
    onMoved: on('onMoved'),
    onChildrenReordered: on('onChildrenReordered'),
  };

  const storageListeners = [];
  const local = {
    async get(keys) {
      const all = clone(H.store);
      if (keys == null) return all;
      const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list)
        if (k in all) out[k] = all[k];
        else if (keys && typeof keys === 'object' && !Array.isArray(keys)) out[k] = keys[k];
      return out;
    },
    async set(items) {
      if (H.storageQuota != null && JSON.stringify({ ...H.store, ...items }).length > H.storageQuota) throw new Error('Resource::kQuotaBytes quota exceeded');
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: clone(H.store[k] ?? null), newValue: clone(v) };
        H.store[k] = clone(v);
      }
      setTimeout(() => storageListeners.forEach((f) => f(clone(changes), 'local')), 0);
    },
    async remove(keys) {
      for (const k of [].concat(keys)) delete H.store[k];
    },
  };

  window.chrome = {
    bookmarks,
    storage: { local, onChanged: { addListener: (f) => storageListeners.push(f) } },
    runtime: { getURL: (p) => `${window.parent.location.origin}${p.startsWith('/') ? '' : '/'}${p}` },
    tabs: {
      async create(o) {
        H.tabs.push(o);
        return { id: H.tabs.length };
      },
      async query() {
        return H.activeTab ? [clone(H.activeTab)] : [];
      },
    },
  };
  window.close = () => {
    H.closed = true;
  };
})();
