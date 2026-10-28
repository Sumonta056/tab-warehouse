import { TODAY_STATES } from '../../constants/due.js';
import { SCHEDULE } from '../../constants/pages.js';
import { scheduleGroups } from '../../domain/schedule.js';
import { h, svgIcon } from '../../ui/dom.js';
import { state } from '../../state/page-state.js';
import { folderPrefs } from '../../state/folders.js';

const links = (n) => `${n} link${n === 1 ? '' : 's'}`;
const size = (gs) => gs.reduce((sum, g) => sum + g.items.length, 0);

export function renderSchedule(page, ctx) {
  const groups = scheduleGroups(state.secs, state.linkMeta);
  const top = groups.filter((g) => TODAY_STATES.includes(g.state));
  const later = groups.filter((g) => !TODAY_STATES.includes(g.state));
  const m = size(top);
  const done = size(top.filter((g) => g.state === 'done'));
  page.append(
    h(
      'div',
      { class: 'head' },
      h('h2', {}, SCHEDULE.title),
      h('span', { class: 'cnt mono muted' }, `${done} of ${m} done`),
      m
        ? h(
            'span',
            {
              class: 'today-bar',
              role: 'progressbar',
              'aria-label': 'Done today',
              'aria-valuemin': '0',
              'aria-valuemax': String(m),
              'aria-valuenow': String(done),
            },
            h('span', { style: { width: `${Math.round((done / m) * 100)}%` } }),
          )
        : null,
    ),
  );
  if (!groups.length) {
    page.append(
      h('div', { class: 'empty' }, 'No links with a due date. Use “Add to today” or Set due date in the ⋯ menu of a link, or Due in the save popup.'),
    );
    return;
  }
  const p = folderPrefs(SCHEDULE.id);
  const list = h('div', { class: 'list schedule' });
  const add = (g) => {
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
    if (!closed)
      for (const { bm, s, crumb } of g.items) list.append(ctx.renderRow(bm, s, { ...folderPrefs(s.id), sort: 'due' }, { crumb, q: '', check: true }));
  };
  if (!m) list.append(h('div', { class: 'empty' }, 'Nothing for today. Use “Add to today” in the ⋯ menu of a link.'));
  top.forEach(add);
  if (later.length) {
    list.append(h('div', { class: 'today-part' }, h('span', {}, 'Upcoming'), h('span', { class: 'cnt muted' }, links(size(later)))));
    later.forEach(add);
  }
  page.append(list);
}
