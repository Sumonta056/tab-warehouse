import { findDuplicates } from '../../domain/duplicates.js';
import { flatten } from '../../domain/tree.js';
import { h } from '../../ui/dom.js';
import { card, toggle } from './controls.js';

let dupLoose = false;

function dupCard(c) {
  const homeId = c.settings.home.folderId;
  const where = (bm) => bm.path || 'Unsorted';
  const added = (bm) => (bm.dateAdded ? new Date(bm.dateAdded).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const el = card('Duplicate links', 'The same address saved in more than one place. Keep one copy; the others are deleted with Undo.');
  el.id = 'dupCard';
  const body = h('div', { class: 'dup-body' });
  const draw = () => {
    const links = flatten({ children: (c.root.children || []).filter((n) => n.id !== homeId) });
    const groups = findDuplicates(links, dupLoose);
    el.querySelector('h3').textContent = `Duplicate links (${groups.length})`;
    body.replaceChildren(
      toggle('Ignore #part and tracking parameters (utm_…)', dupLoose, (v) => {
        dupLoose = v;
        draw();
      }),
      groups.length > 1
        ? h(
            'button',
            { type: 'button', class: 'btn sm', id: 'dupOldest', onClick: () => c.removeLinks(groups.flatMap((g) => g.links.slice(1))) },
            'Keep the oldest in every group',
          )
        : '',
      groups.length
        ? h(
            'div',
            { class: 'dup-list', id: 'dupList' },
            ...groups.map((g) =>
              h(
                'div',
                { class: 'dup-group' },
                h('div', { class: 'dup-url' }, g.links[0].url),
                ...g.links.map((bm) =>
                  h(
                    'div',
                    { class: 'dup-row', dataset: { id: bm.id } },
                    h('span', { class: 'dup-where' }, where(bm), bm.url !== g.links[0].url ? h('span', { class: 'dup-alt' }, bm.url) : null),
                    h('span', { class: 'dup-date' }, added(bm)),
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'btn sm',
                        'aria-label': `Keep this (${where(bm)})`,
                        onClick: () => c.removeLinks(g.links.filter((x) => x.id !== bm.id)),
                      },
                      'Keep this',
                    ),
                  ),
                ),
              ),
            ),
          )
        : h('p', { class: 'dup-empty' }, 'No duplicate links.'),
    );
  };
  draw();
  el.append(body);
  return el;
}

export function dupes(c) {
  return h('div', { class: 'set-grid one' }, h('div', { class: 'set-col' }, dupCard(c)));
}
