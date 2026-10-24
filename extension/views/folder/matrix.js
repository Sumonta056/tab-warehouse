import { buildMatrix, matrixLinks, matrixMissing, queryLabel } from '../../domain/matrix.js';
import { deriveUrl } from '../../domain/derive.js';
import { sortLinks } from '../../domain/sort.js';
import { tagNames } from '../../domain/tags.js';
import { sameAsUrl, displayUrl } from '../../domain/url.js';
import { createBookmark } from '../../services/bookmarks.js';
import { openTab } from '../../services/tabs.js';
import { h, svgIcon } from '../../ui/dom.js';
import { showMenu } from '../../ui/menu.js';
import { toast } from '../../ui/toast.js';
import { state } from '../../state/page-state.js';
import { tagColor } from './list.js';
import { renderRow } from './row.js';

const COLORS = { PROD: 'var(--prod-fg)', TEST: 'var(--test-fg)', STAGE: 'var(--stage-fg)', LOCAL: 'var(--local-fg)' };

export function renderMatrix(ctx, body, links, s, p) {
  const { settings } = state;
  const tags = tagNames(settings);
  const { rows, rest } = buildMatrix(links, settings.envRules, tags);
  if (!rows.length) {
    body.append(
      h(
        'div',
        { class: 'empty' },
        'No link in this folder has a tag, so there is nothing to lay out as a matrix. Use List view or add tags by address in Settings › Tags.',
      ),
    );
    return;
  }
  const table = h(
    'table',
    {},
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', {}, 'Resource (path)'),
        ...tags.map((e) =>
          h(
            'th',
            { class: 'env' },
            h('span', { class: 'dot', dataset: tagColor(e) ? { tag: tagColor(e) } : null, style: COLORS[e] ? { background: COLORS[e] } : null }),
            e,
          ),
        ),
        h('th', {}),
      ),
    ),
  );
  const tb = h('tbody');
  for (const r of rows) {
    const any = tags.map((e) => r.cells[e][0]).find(Boolean);
    const tr = h(
      'tr',
      {},
      h(
        'td',
        {},
        h(
          'div',
          { class: 'res' },
          h('b', {}, r.key),
          any && !sameAsUrl(any.title, any.url) ? h('span', { class: 'muted', style: { fontSize: '11px' } }, any.title) : null,
        ),
      ),
    );
    for (const e of tags) {
      const cell = h('div', { class: 'cell' });
      if (r.cells[e].length) {
        for (const bm of r.cells[e]) {
          const color = tagColor(e);
          cell.append(
            h(
              'a',
              { class: `pill ${color ? 'tag' : e}`, dataset: color ? { tag: color } : null, href: bm.url, target: '_blank', rel: 'noopener', title: bm.url },
              h('span', {}, queryLabel(bm.url)),
            ),
          );
        }
      } else {
        const d = any && deriveUrl(any.url, e, settings.hostMap, tags);
        if (d)
          cell.append(
            h(
              'button',
              { class: 'pill derive', title: `${d}\nClick: open · Alt+click: save as bookmark here`, onClick: (ev) => deriveClick(ev, d, any, s) },
              '+ derive',
            ),
          );
        else cell.append(h('span', { class: 'pill none' }, '—'));
      }
      tr.append(h('td', {}, cell));
    }
    tr.append(
      h(
        'td',
        {},
        h('div', { class: 'cell' }, h('button', { class: 'btn ghost sm icon', 'aria-label': 'Row menu', onClick: (e) => rowMenu(e, r, s) }, svgIcon('more'))),
      ),
    );
    tb.append(tr);
  }
  table.append(tb);
  body.append(h('div', { class: 'matrix' }, table));
  body.append(
    h(
      'div',
      { class: 'matrix-note' },
      h('span', { class: 'pill derive', style: { minHeight: '26px' } }, '+ derive'),
      'same path on another host. Click opens; Alt+click saves it as a bookmark in this folder. Hosts are mapped in Settings.',
    ),
  );
  if (rest.length) {
    body.append(h('div', { class: 'grp NONE' }, 'NO TAG', h('span', { class: 'line' }), String(rest.length)));
    const list = h('div', { class: 'list' });
    sortLinks(rest, p.sort, settings.envRules, tagNames(settings)).forEach((bm) => list.append(renderRow(ctx, bm, s, p)));
    body.append(list);
  }
}

async function deriveClick(ev, url, from, s) {
  ev.preventDefault();
  if (ev.altKey) {
    await createBookmark({ parentId: s.node.id, title: sameAsUrl(from.title, from.url) ? displayUrl(url) : from.title, url });
    toast('Derived link saved');
  } else openTab({ url });
}

function rowMenu(e, r, s) {
  const tags = tagNames(state.settings);
  const all = matrixLinks(r, tags);
  const missing = matrixMissing(r, tags, state.settings.hostMap);
  showMenu(e, [
    { label: `Open all (${all.length})`, icon: 'external', run: () => all.forEach((bm) => openTab({ url: bm.url, active: false })) },
    { label: 'Copy path', icon: 'copy', run: () => navigator.clipboard.writeText(r.key).then(() => toast('Path copied')) },
    ...(missing.length
      ? [
          '-',
          {
            label: `Save derived links (${missing.map((m) => m.env).join(', ')})`,
            icon: 'save',
            run: async () => {
              for (const m of missing) await createBookmark({ parentId: s.node.id, title: displayUrl(m.url), url: m.url });
              toast(`${missing.length} link${missing.length > 1 ? 's' : ''} saved`);
            },
          },
        ]
      : []),
  ]);
}
