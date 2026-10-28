import { dueLabel } from '../../domain/due.js';
import { todayList, upNext } from '../../domain/today.js';
import { displayUrl, hostOf } from '../../domain/url.js';
import { openTab } from '../../services/tabs.js';
import { h, svgIcon } from '../../ui/dom.js';
import { state } from '../../state/page-state.js';
import { setDone } from '../../state/links.js';

let skip = 0;

export function renderUpNext() {
  const home = document.getElementById('home');
  if (!home) return;
  const old = home.querySelector('#upNext');
  const focus = old?.contains(document.activeElement) ? document.activeElement.className : null;
  old?.remove();
  const next = upNext(todayList(state.secs, state.linkMeta), skip);
  home.classList.toggle('has-up', !!next);
  if (!next) return;
  const el = bar(next);
  home.append(el);
  if (focus) (el.querySelector(`.${focus}`) || el.querySelector('.up-open')).focus({ preventScroll: true });
}

async function go(bm) {
  openTab({ url: bm.url });
  await setDone(bm.id, true);
  renderUpNext();
}

function bar({ bm, state: due, k, m, open }) {
  const name = bm.title || displayUrl(bm.url);
  return h(
    'div',
    { class: 'up-next', id: 'upNext', role: 'group', 'aria-label': 'Up next' },
    h(
      'button',
      { class: 'up-open', title: bm.url, 'aria-label': `Up next: open ${name} in a new tab and tick it`, onClick: () => go(bm) },
      h('span', { class: 'up-lbl' }, 'Up next', h('span', { class: 'up-pos' }, `${k} of ${m}`)),
      h('span', { class: 'up-txt' }, h('span', { class: 'up-ttl' }, name), h('span', { class: 'up-host' }, hostOf(bm.url))),
      due === 'overdue' ? h('span', { class: 'up-due' }, dueLabel(state.linkMeta[bm.id].due)) : null,
      h('span', { class: 'up-go', 'aria-hidden': 'true' }, svgIcon('external')),
    ),
    open > 1
      ? h(
          'button',
          {
            class: 'up-skip',
            title: 'Skip',
            'aria-label': 'Skip to the next link',
            onClick: () => {
              skip++;
              renderUpNext();
            },
          },
          svgIcon('chevron'),
        )
      : null,
  );
}
