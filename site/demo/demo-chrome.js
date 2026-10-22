(() => {
  const L = (title, url) => ({ title, url });
  const F = (title, children = []) => ({ title, children });

  const sampleTree = () =>
    F('', [
      F('Bookmarks bar', [
        F('Shop project', [
          F('Checkout', [
            L('Checkout PROD', 'https://shop.example.com/checkout/cart'),
            L('Checkout TEST', 'https://test.shop.example.com/checkout/cart'),
            L('Checkout STAGE', 'https://staging.shop.example.com/checkout/cart'),
            L('Checkout local', 'http://localhost:3000/checkout/cart'),
          ]),
          L('Orders admin', 'https://shop.example.com/admin/orders?status=open'),
          L('Orders admin', 'https://test.shop.example.com/admin/orders?status=open'),
          L('Product API', 'https://shop.example.com/api/v2/products'),
          L('Product API', 'http://localhost:3000/api/v2/products'),
          L('Health check', 'https://staging.shop.example.com/health'),
        ]),
        F('Sprint board', [
          F('In progress', [
            L('Add dark mode to settings · Issue #42', 'https://github.com/Sumonta056/tab-warehouse/issues/42'),
            L('Sidebar resize handle · Pull request #51', 'https://github.com/Sumonta056/tab-warehouse/pull/51'),
          ]),
          F('Blocked', [L('Waiting on design review', 'https://www.figma.com/file/demo/warehouse-ui')]),
          L('Sprint 14 board', 'https://github.com/users/Sumonta056/projects/1'),
          L('Release checklist', 'https://github.com/Sumonta056/tab-warehouse/blob/main/CONTRIBUTING.md'),
        ]),
        F('Docs', [
          L('chrome.bookmarks API', 'https://developer.chrome.com/docs/extensions/reference/api/bookmarks'),
          L('Manifest V3 overview', 'https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3'),
          L('HTML drag and drop API', 'https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API'),
          L('CSS color-mix()', 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix'),
        ]),
        F('Learning pending', [
          F('Priority', [
            L('System design primer', 'https://github.com/donnemartin/system-design-primer'),
            L('Designing data-intensive applications', 'https://dataintensive.net/'),
          ]),
          L('The Rust book', 'https://doc.rust-lang.org/book/'),
          L('web.dev: Learn performance', 'https://web.dev/learn/performance'),
          L('Refactoring UI', 'https://www.refactoringui.com/'),
        ]),
        F('Reading list', [L('Hacker News', 'https://news.ycombinator.com/'), L('Lobsters', 'https://lobste.rs/'), L('CSS-Tricks', 'https://css-tricks.com/')]),
        F('Weekly report', [
          L('Team metrics', 'https://shop.example.com/admin/metrics?range=7d'),
          L('Standup notes', 'https://docs.google.com/document/d/demo'),
        ]),
        L('A loose link', 'https://example.com/'),
      ]),
      F('Other bookmarks', [
        F('Home', [
          L('GitHub', 'https://github.com/'),
          L('Gmail', 'https://mail.google.com/mail/u/0/'),
          L('Drive', 'https://drive.google.com/drive/u/0/my-drive'),
          L('Calendar', 'https://calendar.google.com/'),
          L('YouTube', 'https://www.youtube.com/'),
          L('LinkedIn', 'https://www.linkedin.com/'),
          L('Claude', 'https://claude.ai/'),
          L('ChatGPT', 'https://chatgpt.com/'),
          L('Gemini', 'https://gemini.google.com/'),
          L('Stack Overflow', 'https://stackoverflow.com/'),
          L('MDN', 'https://developer.mozilla.org/'),
          L('Figma', 'https://www.figma.com/'),
          L('Notion', 'https://www.notion.so/'),
          L('Excalidraw', 'https://excalidraw.com/'),
          L('Medium', 'https://medium.com/'),
          L('Dev To', 'https://dev.to/'),
          L('Reddit', 'https://www.reddit.com/'),
          L('Keep', 'https://keep.google.com/'),
        ]),
      ]),
    ]);

  const sampleSettings = (ids) => ({
    userName: 'Alex',
    theme: 'teal',
    rootId: ids['Bookmarks bar'],
    showFavicons: true,
    categories: [
      { id: 'c1', name: 'Work', closed: false, color: 'green' },
      { id: 'c2', name: 'Learning', closed: false, color: 'yellow' },
      { id: 'c3', name: 'Later', closed: false, color: 'red' },
    ],
    folderCat: {
      [ids['Shop project']]: 'c1',
      [ids['Sprint board']]: 'c1',
      [ids['Weekly report']]: 'c1',
      [ids['Docs']]: 'c2',
      [ids['Learning pending']]: 'c2',
      [ids['Reading list']]: 'c3',
    },
    partColors: { [ids['Priority']]: 'green', [ids['In progress']]: 'blue', [ids['Blocked']]: 'red' },
    envRules: [
      { pattern: 'localhost', env: 'LOCAL' },
      { pattern: 'test.', env: 'TEST' },
      { pattern: 'staging.', env: 'STAGE' },
      { pattern: 'shop.example.com', env: 'PROD' },
    ],
    hostMap: [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: 'staging.shop.example.com', LOCAL: 'localhost:3000' }],
    lastFolder: ids['Shop project'],
    home: { folderId: ids['Home'], seeded: true, newTab: true, dark: 70, blur: 2 },
    sideLook: { mode: 'image', color: '#141414', dark: 85, blur: 14 },
  });

  const fresh = () => {
    let next = 0;
    const ids = {};
    const day = 86400000;
    const stamp = (node, parentId, index) => {
      node.id = String(next++);
      node.index = index;
      node.dateAdded = Date.now() - (200 - next) * day;
      if (parentId !== undefined) node.parentId = parentId;
      if (node.children) ids[node.title] ||= node.id;
      (node.children || []).forEach((c, i) => stamp(c, node.id, i));
    };
    const tree = sampleTree();
    stamp(tree);
    return {
      tree,
      store: { settings: sampleSettings(ids), homeIcons: {}, homeBg: new URL('bg.jpg', document.currentScript?.src || location.href).href },
      nextId: 1000,
      activeTab: { id: 1, title: 'Checkout · Shop TEST', url: 'https://test.shop.example.com/checkout/payment?step=2' },
      listeners: [],
    };
  };

  let host = window;
  try {
    if (window.top.location.origin === location.origin) host = window.top;
  } catch {}
  const S = (host.__twDemo ||= fresh());

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const find = (id, node = S.tree) => {
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
  const listen = (name) => ({
    addListener: (f) => S.listeners.push({ win: window, name, f }),
  });
  window.addEventListener('pagehide', () => {
    S.listeners = S.listeners.filter((l) => l.win !== window);
  });
  const emit = (name, ...args) => {
    for (const l of S.listeners.filter((x) => x.name === name)) {
      const copy = clone(args);
      setTimeout(() => {
        try {
          l.f(...copy);
        } catch {}
      }, 0);
    }
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
  const strip = (n) => {
    const c = clone(n);
    delete c.children;
    return c;
  };

  const bookmarks = {
    async getTree() {
      return [clone(S.tree)];
    },
    async getSubTree(id) {
      const n = find(id);
      return n ? [clone(n)] : fail(`Can't find bookmark for id. ${id}`);
    },
    async getChildren(id) {
      const n = find(id);
      return n ? (n.children || []).map(strip) : fail(`Can't find parent bookmark for id. ${id}`);
    },
    async get(id) {
      const n = find(id);
      return n ? [strip(n)] : fail(`Can't find bookmark for id. ${id}`);
    },
    async search(q) {
      const out = [];
      const walk = (n) => {
        if (n.url && (!q.url || n.url === q.url)) out.push(strip(n));
        (n.children || []).forEach(walk);
      };
      walk(S.tree);
      return out;
    },
    async create({ parentId, title = '', url, index }) {
      const p = find(parentId);
      if (!p || p.url) return fail(`Can't find parent bookmark for id. ${parentId}`);
      if (url !== undefined && !validUrl(url)) return fail('Invalid URL.');
      const node = { id: String(S.nextId++), title, dateAdded: Date.now(), ...(url !== undefined ? { url } : { children: [] }) };
      p.children ||= [];
      if (index == null || index > p.children.length) p.children.push(node);
      else p.children.splice(index, 0, node);
      reindex(S.tree);
      emit('onCreated', node.id, node);
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
      reindex(S.tree);
      emit('onMoved', id, { parentId: to.id, index: node.index, oldParentId: from.id, oldIndex });
      return clone(node);
    },
    async update(id, changes) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      if (changes.url !== undefined && !validUrl(changes.url)) return fail('Invalid URL.');
      if (changes.title !== undefined) node.title = changes.title;
      if (changes.url !== undefined && node.url !== undefined) node.url = changes.url;
      emit('onChanged', id, changes);
      return clone(node);
    },
    async remove(id) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      if (node.children?.length) return fail("Can't remove non-empty folder (use recursive to force).");
      return bookmarks.removeTree(id);
    },
    async removeTree(id) {
      const node = find(id);
      if (!node) return fail(`Can't find bookmark for id. ${id}`);
      const p = find(node.parentId);
      p.children.splice(p.children.indexOf(node), 1);
      reindex(S.tree);
      emit('onRemoved', id, { parentId: p.id, index: node.index });
    },
    onCreated: listen('onCreated'),
    onRemoved: listen('onRemoved'),
    onChanged: listen('onChanged'),
    onMoved: listen('onMoved'),
    onChildrenReordered: listen('onChildrenReordered'),
  };

  const local = {
    async get(keys) {
      const all = clone(S.store);
      if (keys == null) return all;
      const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list)
        if (k in all) out[k] = all[k];
        else if (keys && typeof keys === 'object' && !Array.isArray(keys)) out[k] = keys[k];
      return out;
    },
    async set(items) {
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: S.store[k] ?? null, newValue: v };
        S.store[k] = clone(v);
      }
      emit('storage', changes, 'local');
    },
    async remove(keys) {
      for (const k of [].concat(keys)) delete S.store[k];
    },
  };

  window.chrome = {
    bookmarks,
    storage: { local, onChanged: listen('storage') },
    runtime: { getURL: (p) => new URL(p.replace(/^\//, ''), location.href).href },
    tabs: {
      async create({ url }) {
        window.open(url, '_blank', 'noopener');
        return { id: 2 };
      },
      async query() {
        return [clone(S.activeTab)];
      },
    },
  };
  window.close = () => host.__twDemoClosePopup?.();
})();
