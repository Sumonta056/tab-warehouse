import { PRIS, PRI_NAMES } from '../../constants/priority.js';
import { linkMatcher, isFiltering, hasMeta } from '../../domain/filter.js';
import { h, svgIcon } from '../../ui/dom.js';
import { state, setState } from '../../state/page-state.js';
import { folderPrefs } from '../../state/folders.js';
import { renderList } from './list.js';
import { renderMatrix } from './matrix.js';
import { renderParts, newPart } from './parts.js';

export function renderBody(ctx) {
  const body = document.querySelector('#body');
  if (!body) return;
  body.replaceChildren();
  const s = state.current,
    p = folderPrefs(s.id);
  const withMeta = hasMeta(s.all, state.linkMeta);
  if (!withMeta) setState({ priF: 'all' });
  const match = linkMatcher(state.linkMeta, state.filterQ, state.priF);
  const links = s.all.filter(match);
  if (withMeta && p.view !== 'matrix') body.append(priFilter(ctx));
  if (!s.all.length && !s.parts.length) body.append(h('div', { class: 'empty' }, 'Empty folder. Add a link or drag one in from another folder.'));
  else if (isFiltering(state.filterQ, state.priF) && !links.length) body.append(h('div', { class: 'empty' }, 'Nothing matches the filter.'));
  else if (p.view === 'matrix') renderMatrix(ctx, body, links, s, p);
  else if (s.parts.length) renderParts(ctx, body, s, p, match);
  else renderList(ctx, body, links, s, p);
  if (!s.virtual && p.view !== 'matrix') body.append(h('button', { class: 'btn ghost sm newPart', onClick: () => newPart(s) }, svgIcon('plus'), 'New section'));
}

function priFilter(ctx) {
  const opts = [['all', 'All'], ...PRIS.map((x) => [x, PRI_NAMES[x]]), ['note', 'Has note'], ['overdue', 'Overdue'], ['due', 'Has due date']];
  return h(
    'div',
    { class: 'pri-filter', role: 'group', 'aria-label': 'Show' },
    ...opts.map(([v, l]) =>
      h(
        'button',
        {
          class: `chip ${PRIS.includes(v) ? `pri-${v}` : ''} ${state.priF === v ? 'on' : ''}`,
          'aria-pressed': String(state.priF === v),
          dataset: { pri: v },
          onClick: () => {
            setState({ priF: v });
            renderBody(ctx);
          },
        },
        PRIS.includes(v) ? h('span', { class: 'pri-dot' }) : null,
        l,
      ),
    ),
  );
}
