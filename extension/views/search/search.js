import { searchLinks } from '../../domain/search.js';
import { h } from '../../ui/dom.js';
import { state } from '../../state/page-state.js';
import { folderPrefs } from '../../state/folders.js';

export function renderSearch(page, ctx) {
  const { query } = state;
  const hits = searchLinks(state.secs, query, state.linkMeta, state.settings.envRules);
  page.append(
    h(
      'div',
      { class: 'head' },
      h('h2', {}, 'Search'),
      h('span', { class: 'cnt mono muted' }, `${hits.length} result${hits.length === 1 ? '' : 's'} for “${query}”`),
      h('button', { class: 'btn add', onClick: () => ctx.clearSearch() }, 'Clear'),
    ),
  );
  if (!hits.length) {
    page.append(h('div', { class: 'empty' }, 'Nothing matches. Try part of an ID or host.'));
    return;
  }
  const list = h('div', { class: 'list' });
  for (const { bm, s, crumb } of hits.slice(0, 300)) list.append(ctx.renderRow(bm, s, { ...folderPrefs(s.id), sort: 'manual' }, { crumb, q: query }));
  page.append(list);
}
