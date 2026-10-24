import { SCHEDULE } from '../../constants/pages.js';
import { scheduleGroups } from '../../domain/schedule.js';
import { h, svgIcon } from '../../ui/dom.js';
import { state } from '../../state/page-state.js';
import { folderPrefs } from '../../state/folders.js';

export function renderSchedule(page, ctx) {
  const groups = scheduleGroups(state.secs, state.linkMeta);
  const n = groups.reduce((sum, g) => sum + g.items.length, 0);
  page.append(h('div', { class: 'head' }, h('h2', {}, 'Schedule'), h('span', { class: 'cnt mono muted' }, `${n} link${n === 1 ? '' : 's'}`)));
  if (!n) {
    page.append(h('div', { class: 'empty' }, 'No links with a due date. Set one in the ⋯ menu of a link, or with Due in the save popup.'));
    return;
  }
  const p = folderPrefs(SCHEDULE.id);
  const list = h('div', { class: 'list schedule' });
  for (const g of groups) {
    const closed = !!p.closed[g.state];
    const hdr = h(
      'button',
      {
        class: `grp dueg ${g.state} ${closed ? 'closed' : ''}`,
        'aria-expanded': closed ? 'false' : 'true',
        dataset: { due: g.state },
        onClick: () => ctx.setFolderPrefs(SCHEDULE.id, { closed: { ...p.closed, [g.state]: !closed } }),
      },
      svgIcon('chevron'),
      g.name,
      h('span', { class: 'line' }),
      String(g.items.length),
    );
    hdr.querySelector('svg').classList.add('chev');
    list.append(hdr);
    if (!closed) for (const { bm, s, crumb } of g.items) list.append(ctx.renderRow(bm, s, { ...folderPrefs(s.id), sort: 'due' }, { crumb, q: '' }));
  }
  page.append(list);
}
