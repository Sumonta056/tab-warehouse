import { PRI_NAMES } from '../../constants/priority.js';
import { envGroups } from '../../domain/env.js';
import { priGroups, priFirst } from '../../domain/meta.js';
import { sortLinks } from '../../domain/sort.js';
import { tagNames } from '../../domain/tags.js';
import { moveBookmark } from '../../services/bookmarks.js';
import { h, svgIcon } from '../../ui/dom.js';
import { clearMarks, markInto, unmarkOnLeave } from '../../ui/dnd.js';
import { state } from '../../state/page-state.js';
import { setPri } from './actions.js';
import { renderRow } from './row.js';

export const tagColor = (name) => state.settings.customTags?.find((t) => t.name === name)?.color;

export function renderList(ctx, body, links, s, p) {
  const { settings, linkMeta } = state;
  const list = h('div', { class: 'list' });
  const sorted = priFirst(sortLinks(links, p.sort, settings.envRules, tagNames(settings)), linkMeta);
  const pris = p.sort === 'env' ? [] : priGroups(sorted, linkMeta);
  if (pris.some((g) => g.pri)) {
    list.dataset.pri = 'groups';
    for (const g of pris) {
      const hdr = priHeader(ctx, g, s, p, g.links.at(-1));
      list.append(hdr);
      if (hdr.getAttribute('aria-expanded') === 'true') g.links.forEach((bm) => list.append(renderRow(ctx, bm, s, p)));
    }
  } else if (p.sort === 'env') {
    for (const { env: e, links: g } of envGroups(sorted, settings.envRules, tagNames(settings))) {
      const closed = !!p.closed[e];
      const color = tagColor(e);
      const hdr = h(
        'button',
        {
          class: `grp ${color ? 'tag' : e} ${closed ? 'closed' : ''}`,
          dataset: { env: e, ...(color ? { tag: color } : {}) },
          'aria-expanded': closed ? 'false' : 'true',
          onClick: () => ctx.setFolderPrefs(s.id, { closed: { ...p.closed, [e]: !closed } }),
        },
        svgIcon('chevron'),
        e === 'NONE' ? 'NO TAG' : e,
        h('span', { class: 'line' }),
        String(g.length),
      );
      hdr.querySelector('svg').classList.add('chev');
      list.append(hdr);
      if (!closed) g.forEach((bm) => list.append(renderRow(ctx, bm, s, p)));
    }
  } else sorted.forEach((bm) => list.append(renderRow(ctx, bm, s, p)));
  body.append(list);
  if (p.sort !== 'manual')
    body.append(h('div', { class: 'subnote' }, 'Reordering by drag is only available in Manual sort. Dragging to a sidebar folder still moves the link.'));
}

function priHeader(ctx, g, s, p, last) {
  const key = `pri:${g.pri || 'none'}`;
  const closed = !!p.closed[key];
  const el = h(
    'button',
    {
      class: `grp prig ${g.pri ? `pri-${g.pri}` : 'NONE'} ${closed ? 'closed' : ''}`,
      'aria-expanded': closed ? 'false' : 'true',
      dataset: { pri: g.pri || 'none' },
      onClick: () => ctx.setFolderPrefs(s.id, { closed: { ...p.closed, [key]: !closed } }),
    },
    svgIcon('chevron'),
    g.pri ? PRI_NAMES[g.pri] : 'Other',
    h('span', { class: 'line' }),
    String(g.links.length),
  );
  el.querySelector('svg').classList.add('chev');
  el.addEventListener('dragover', (e) => {
    const { drag } = state;
    if (drag?.kind !== 'link' || (state.linkMeta[drag.id]?.pri || null) === g.pri) return;
    markInto(el, e);
  });
  unmarkOnLeave(el, 'drop-into');
  el.addEventListener('drop', async (e) => {
    if (state.drag?.kind !== 'link') return;
    e.preventDefault();
    clearMarks();
    const id = state.drag.id;
    if (p.sort === 'manual' && last && last.id !== id) await moveBookmark(id, { parentId: last.parentId, index: last.index + 1 });
    await setPri(ctx, id, g.pri);
  });
  return el;
}
