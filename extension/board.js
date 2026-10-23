import { h, svgIcon, iconEl, highlight, detectEnv, linkBadge, tagNames, sameAsUrl, displayUrl, sortLinks, hostOf, normalizeUrl } from './lib/core.js';

let adding = null;

const terms = (q) => q.split(/\s+/).filter(Boolean);
const matcher = (q) => (bm) => terms(q).every((t) => `${bm.title} ${bm.url}`.toLowerCase().includes(t));

export function renderBoard(page, ctx) {
  const { settings, secs } = ctx;
  const real = secs.filter((s) => !s.virtual);
  const hasCats = settings.categories.length > 0;
  page.append(
    h('div', { class: 'head' }, h('h2', {}, 'Board'), h('span', { class: 'cnt mono muted' }, `${real.length} folder${real.length === 1 ? '' : 's'}`)),
  );
  const fIn = h('input', { type: 'search', placeholder: 'Filter links…', value: ctx.filter, autocomplete: 'off' });
  let timer;
  fIn.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      ctx.filter = fIn.value.trim().toLowerCase();
      renderColumns(ctx);
    }, 60);
  });
  fIn.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    fIn.value = '';
    ctx.filter = '';
    renderColumns(ctx);
  });
  const group = settings.board.group;
  page.append(
    h(
      'div',
      { class: 'toolbar' },
      h('label', { class: 'search' }, h('span', { class: 'sr' }, 'Filter links on the board'), svgIcon('search'), fIn),
      hasCats
        ? h(
            'span',
            { class: 'seg board-group', role: 'group', 'aria-label': 'Group' },
            ...[
              ['cat', 'By category'],
              ['flat', 'One row'],
            ].map(([v, l]) =>
              h(
                'button',
                {
                  class: v === group ? 'on' : '',
                  'aria-pressed': String(v === group),
                  dataset: { group: v },
                  onClick: () => v !== group && ctx.setBoard({ group: v }),
                },
                l,
              ),
            ),
          )
        : null,
    ),
  );
  page.append(h('div', { class: 'board', id: 'boardCols' }));
  renderColumns(ctx);
}

function lanes(ctx) {
  const { settings, secs } = ctx;
  const unsorted = secs.filter((s) => s.virtual);
  if (!settings.categories.length || settings.board.group === 'flat') return [{ name: null, items: secs }];
  const out = ctx
    .groups()
    .filter((g) => g.cat)
    .map((g) => ({ name: g.cat.name, color: g.cat.color, items: g.items }));
  const rest = ctx.groups().find((g) => !g.cat);
  out.push({ name: 'No category', items: [...rest.items, ...unsorted] });
  return out.filter((l) => l.items.length);
}

function renderColumns(ctx) {
  const box = document.getElementById('boardCols');
  if (!box) return;
  box.replaceChildren();
  if (!ctx.secs.length) {
    box.append(h('div', { class: 'empty' }, 'No folders under this root. Add a folder with New folder in the sidebar.'));
    return;
  }
  for (const lane of lanes(ctx)) {
    if (lane.name)
      box.append(
        h(
          'div',
          { class: 'blane-h', dataset: lane.color ? { color: lane.color } : null },
          h('span', {}, `${lane.name} (${lane.items.length})`),
          h('span', { class: 'line' }),
        ),
      );
    box.append(h('div', { class: 'blane' }, ...lane.items.map((s) => column(s, ctx))));
  }
}

function column(s, ctx) {
  const { settings } = ctx;
  const p = ctx.folderPrefs(s.id);
  const match = matcher(ctx.filter);
  const sort = (list) => sortLinks(list.filter(match), p.sort, settings.envRules, tagNames(settings));
  const cards = h('div', { class: 'bcards' });
  let hits = 0;
  if (s.parts.length) {
    for (const g of [...s.parts, { id: `none:${s.id}`, title: 'No section', node: s.node, links: s.links, none: true }]) {
      const list = sort(g.links);
      hits += list.length;
      cards.append(sectionHeader(g, list.length, ctx));
      list.forEach((bm) => cards.append(card(bm, p, ctx)));
    }
  } else {
    const list = sort(s.links);
    hits = list.length;
    list.forEach((bm) => cards.append(card(bm, p, ctx)));
  }
  if (!hits) cards.append(h('div', { class: 'bempty' }, ctx.filter ? 'Nothing matches.' : 'No links yet. Drop one here.'));

  const col = h('section', { class: `bcol ${s.virtual ? 'unsorted' : ''}`, dataset: { id: s.id }, 'aria-label': s.title });
  const head = h(
    'header',
    { class: 'bcol-h', draggable: !s.virtual, title: s.virtual ? 'Loose links directly under the root' : 'Drag to reorder folders' },
    h('button', { class: 'bcol-name', title: 'Open folder', onClick: () => ctx.select(s) }, s.title),
    h('span', { class: 'bcol-n' }, String(s.all.length)),
    h(
      'button',
      {
        class: 'more',
        'aria-label': `Folder menu for ${s.title}`,
        title: 'More',
        onClick: (e) => {
          e.stopPropagation();
          ctx.folderMenu(e, s);
        },
      },
      svgIcon('more'),
    ),
  );
  head.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ctx.folderMenu(e, s);
  });
  if (!s.virtual) {
    head.addEventListener('dragstart', (e) => {
      if (e.target !== head) return;
      ctx.drag = { kind: 'folder', id: s.id };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', s.title);
      requestAnimationFrame(() => col.classList.add('dragging'));
    });
    head.addEventListener('dragend', () => {
      col.classList.remove('dragging');
      ctx.clearMarks();
      ctx.drag = null;
    });
  }
  col.addEventListener('dragover', (e) => {
    const d = ctx.drag;
    if (!d) return;
    if (d.kind === 'folder' && d.id !== s.id && !s.virtual) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = col.getBoundingClientRect();
      ctx.clearMarks();
      col.classList.add(e.clientX > r.left + r.width / 2 ? 'drop-after' : 'drop-before');
    } else if (d.kind === 'link' && d.parentId !== s.node.id) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      ctx.clearMarks();
      col.classList.add('drop-into');
    }
  });
  col.addEventListener('dragleave', (e) => {
    if (!col.contains(e.relatedTarget)) col.classList.remove('drop-before', 'drop-after', 'drop-into');
  });
  col.addEventListener('drop', async (e) => {
    const d = ctx.drag;
    if (!d) return;
    e.preventDefault();
    const after = col.classList.contains('drop-after');
    ctx.clearMarks();
    ctx.drag = null;
    if (d.kind === 'folder') {
      if (d.id === s.id || s.virtual) return;
      await ctx.moveFolder(d.id, s.id, after);
      ctx.toast('Folder order saved');
    } else if (d.kind === 'link' && d.parentId !== s.node.id) {
      await chrome.bookmarks.move(d.id, { parentId: s.node.id });
      ctx.toast(`Moved to ${s.title}`);
    }
  });
  col.append(head, cards, adding === s.id ? addForm(s, ctx) : addButton(s, ctx));
  return col;
}

function sectionHeader(g, count, ctx) {
  const color = !g.none && ctx.settings.partColors[g.id];
  const el = h(
    'div',
    { class: `bsec ${g.none ? 'NONE' : ''}`, dataset: color ? { color, part: g.id } : { part: g.id } },
    color ? h('span', { class: 'dot' }) : null,
    h('span', { class: 't' }, g.title),
    h('span', { class: 'n' }, String(count)),
  );
  el.addEventListener('dragover', (e) => {
    const d = ctx.drag;
    if (d?.kind !== 'link') return;
    e.stopPropagation();
    if (d.parentId === g.node.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    ctx.clearMarks();
    el.classList.add('drop-into');
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drop-into');
  });
  el.addEventListener('drop', async (e) => {
    const d = ctx.drag;
    if (d?.kind !== 'link') return;
    e.preventDefault();
    e.stopPropagation();
    ctx.clearMarks();
    ctx.drag = null;
    await chrome.bookmarks.move(d.id, { parentId: g.node.id });
    ctx.toast(`Moved to ${g.title}`);
  });
  return el;
}

function card(bm, p, ctx) {
  const { settings } = ctx;
  const q = ctx.filter;
  const env = detectEnv(bm, settings.envRules);
  const ttl = h('span', { class: 'bcard-ttl' });
  const url = h('span', { class: 'bcard-url' });
  highlight(ttl, bm.title || displayUrl(bm.url), q);
  if (bm.title && !sameAsUrl(bm.title, bm.url)) highlight(url, displayUrl(bm.url), q);
  const el = h(
    'a',
    { class: 'bcard', href: bm.url, target: '_blank', rel: 'noopener', draggable: true, dataset: { id: bm.id }, title: bm.url },
    iconEl(bm, settings.showFavicons),
    h('span', { class: 'bcard-txt' }, ttl, url),
    linkBadge(env, bm.url, settings.customTags),
    h(
      'button',
      {
        class: 'bcard-del',
        'aria-label': 'Delete link',
        title: 'Delete',
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx.deleteLink(bm);
        },
      },
      svgIcon('x'),
    ),
  );
  el.addEventListener('dragstart', (e) => {
    ctx.drag = { kind: 'link', id: bm.id, parentId: bm.parentId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bm.url);
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    ctx.clearMarks();
    ctx.drag = null;
  });
  el.addEventListener('dragover', (e) => {
    const d = ctx.drag;
    if (d?.kind !== 'link' || d.id === bm.id || p.sort !== 'manual') return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const r = el.getBoundingClientRect();
    ctx.clearMarks();
    el.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
  });
  el.addEventListener('drop', async (e) => {
    const d = ctx.drag;
    if (d?.kind !== 'link' || d.id === bm.id || p.sort !== 'manual') return;
    e.preventDefault();
    e.stopPropagation();
    const after = el.classList.contains('drop-after');
    ctx.clearMarks();
    ctx.drag = null;
    await chrome.bookmarks.move(d.id, { parentId: bm.parentId, index: bm.index + (after ? 1 : 0) });
  });
  return el;
}

function addButton(s, ctx) {
  return h(
    'button',
    {
      class: 'bcol-add',
      onClick: () => {
        adding = s.id;
        renderColumns(ctx);
        document.querySelector('.bcol-form input')?.focus();
      },
    },
    svgIcon('plus'),
    'Add link',
  );
}

function addForm(s, ctx) {
  const urlIn = h('input', { type: 'url', class: 'url-in', placeholder: 'https://…', 'aria-label': 'URL' });
  const nameIn = h('input', { type: 'text', placeholder: 'Name (optional)', 'aria-label': 'Name' });
  const cancel = () => {
    adding = null;
    renderColumns(ctx);
  };
  const form = h(
    'form',
    { class: 'edit bcol-form', novalidate: true },
    h('label', {}, 'URL', urlIn),
    h('label', {}, 'Name', nameIn),
    h(
      'div',
      { class: 'actions' },
      h('button', { class: 'btn sm primary', type: 'submit' }, 'Save'),
      h('button', { class: 'btn sm', type: 'button', onClick: cancel }, 'Cancel'),
    ),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = normalizeUrl(urlIn.value);
    if (!url) {
      urlIn.focus();
      return;
    }
    const title = nameIn.value.trim() || hostOf(url).replace(/^www\./, '') || displayUrl(url);
    try {
      await chrome.bookmarks.create({ parentId: s.node.id, title, url });
      adding = null;
      ctx.toast('Added');
    } catch (err) {
      ctx.toast(`Couldn't add: ${err.message}`);
    }
  });
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    cancel();
  });
  return form;
}
