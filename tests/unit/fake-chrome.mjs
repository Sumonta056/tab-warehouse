const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

function event() {
  const fns = [];
  return {
    addListener: (f) => fns.push(f),
    fire: (...a) => fns.map((f) => f(...a)),
    get count() {
      return fns.length;
    },
  };
}

export function fakeChrome({ tree, store = {}, manifest = {}, tabs = [], current = null, commands = null } = {}) {
  let nextId = 1000;
  const root = clone(
    tree || {
      id: '0',
      title: '',
      children: [
        { id: '1', title: 'Bookmarks bar', children: [] },
        { id: '2', title: 'Other bookmarks', children: [] },
      ],
    },
  );
  const find = (id, n = root) => {
    if (n.id === id) return n;
    for (const c of n.children || []) {
      const r = find(id, c);
      if (r) return r;
    }
    return null;
  };
  const parentOf = (id, n = root) => {
    for (const c of n.children || []) {
      if (c.id === id) return n;
      const r = parentOf(id, c);
      if (r) return r;
    }
    return null;
  };
  const reindex = (n) => (n.children || []).forEach((c, i) => ((c.index = i), (c.parentId = n.id), reindex(c)));
  reindex(root);
  const missing = (id) => Promise.reject(new Error(`Can't find bookmark for id. ${id}`));
  const shallow = (n) => {
    const c = clone(n);
    delete c.children;
    return c;
  };
  const events = { onCreated: event(), onRemoved: event(), onChanged: event(), onMoved: event(), onChildrenReordered: event() };
  const calls = [];
  const data = clone(store);

  const chrome = {
    calls,
    data,
    tree: root,
    bookmarks: {
      ...events,
      getTree: async () => [clone(root)],
      getSubTree: async (id) => (find(id) ? [clone(find(id))] : missing(id)),
      getChildren: async (id) => (find(id) ? (find(id).children || []).map(shallow) : missing(id)),
      create: async ({ parentId, title = '', url, index }) => {
        const p = find(parentId);
        if (!p) return missing(parentId);
        const n = { id: String(nextId++), title, ...(url ? { url } : { children: [] }), dateAdded: 1700000000000 + nextId };
        p.children.splice(index ?? p.children.length, 0, n);
        reindex(root);
        events.onCreated.fire(n.id, shallow(n));
        return shallow(n);
      },
      update: async (id, changes) => {
        const n = find(id);
        if (!n) return missing(id);
        Object.assign(n, changes);
        return shallow(n);
      },
      move: async (id, { parentId, index }) => {
        const n = find(id);
        const from = parentOf(id);
        from.children.splice(from.children.indexOf(n), 1);
        const to = find(parentId ?? from.id);
        to.children.splice(index ?? to.children.length, 0, n);
        reindex(root);
        return shallow(n);
      },
      remove: async (id) => {
        const p = parentOf(id);
        if (!p) return missing(id);
        if (find(id).children?.length) return Promise.reject(new Error("Can't remove non-empty folder"));
        p.children = p.children.filter((c) => c.id !== id);
        reindex(root);
      },
      removeTree: async (id) => {
        const p = parentOf(id);
        p.children = p.children.filter((c) => c.id !== id);
        reindex(root);
      },
    },
    storage: {
      onChanged: event(),
      local: {
        get: async (keys) => {
          const list = keys == null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, clone(data[k])]));
        },
        set: async (o) => {
          Object.assign(data, clone(o));
        },
        remove: async (k) => {
          for (const key of [].concat(k)) delete data[key];
        },
      },
    },
    runtime: {
      onMessage: event(),
      getManifest: () => manifest,
      getURL: (p) => `chrome-extension://abc${p.startsWith('/') ? '' : '/'}${p}`,
      sendMessage: async (msg) => {
        calls.push(['sendMessage', msg]);
        return true;
      },
    },
    tabs: {
      create: async (props) => {
        calls.push(['tabs.create', props]);
        return { id: 99, ...props };
      },
      update: async (a, b) => {
        calls.push(typeof a === 'number' ? ['tabs.update', a, b] : ['tabs.update', a]);
        return b || a;
      },
      query: async (q) => {
        calls.push(['tabs.query', q]);
        return tabs;
      },
      getCurrent: async () => current,
    },
    action: {
      setBadgeBackgroundColor: async (o) => calls.push(['badgeColor', o]),
      setBadgeText: async (o) => calls.push(['badgeText', o]),
      setTitle: async (o) => calls.push(['title', o]),
      openPopup: async () => calls.push(['openPopup']),
      setPopup: async (o) => calls.push(['setPopup', o]),
    },
    commands: {
      onCommand: event(),
      getAll: async () => commands || [],
    },
    omnibox: {
      onInputChanged: event(),
      onInputEntered: event(),
      setDefaultSuggestion: (o) => calls.push(['defaultSuggestion', o]),
    },
  };
  globalThis.chrome = chrome;
  return chrome;
}
