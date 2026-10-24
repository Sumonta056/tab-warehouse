import { ENVS } from '../../../constants/envs.js';
import { EXAMPLE_MAP } from '../../../constants/tags.js';
import { cleanHost } from '../../../domain/url.js';
import { h, svgIcon } from '../../../ui/dom.js';

export function sitesCard(s) {
  const cols = s.names();
  const head = h('div', { class: 'env-site head' }, ...cols.map((e) => h('span', {}, s.envBadge(e))), h('span'));
  const rows = s.map.map((r, i) =>
    h(
      'div',
      { class: 'env-site', dataset: { i } },
      ...cols.map((e) => {
        const input = h('input', {
          type: 'text',
          class: 'env-in',
          value: r[e] || '',
          placeholder: 'none',
          'aria-label': `Site ${i + 1}: ${s.plain(e)} address`,
        });
        input.addEventListener('change', () => {
          r[e] = cleanHost(input.value);
          input.value = r[e];
          if (cols.every((x) => !r[x])) {
            s.removeWithUndo(s.map, i, 'site', s.saveMap);
            return;
          }
          s.saveMap();
          s.updateTry();
        });
        return input;
      }),
      h(
        'button',
        { type: 'button', class: 'x', 'aria-label': `Remove site ${i + 1}`, title: 'Remove', onClick: () => s.removeWithUndo(s.map, i, 'site', s.saveMap) },
        svgIcon('x'),
      ),
    ),
  );
  const empty = h(
    'div',
    { class: 'env-empty' },
    'No sites yet. Add one row for each site: its address in each version.',
    h(
      'button',
      {
        type: 'button',
        class: 'btn sm',
        onClick: () => {
          s.map = EXAMPLE_MAP.map((r) => ({ ...r }));
          s.saveMap();
          s.draw();
        },
      },
      'Add example',
    ),
  );
  const ins = cols.map((e) =>
    h('input', {
      type: 'text',
      class: 'env-in',
      id: `envAdd${e}`,
      placeholder: `${s.plain(e)} address`,
      'aria-label': `New site: ${s.plain(e)} address`,
    }),
  );
  const add = h(
    'form',
    { class: 'env-site add', novalidate: true },
    ...ins,
    h('button', { type: 'submit', class: 'x add', 'aria-label': 'Add site', title: 'Add site' }, svgIcon('plus')),
  );
  const sites = h('div', { class: `env-sites ${cols.length > ENVS.length ? 'wide' : ''}` }, head, ...(rows.length ? rows : [empty]), add);
  sites.style.setProperty('--cols', cols.length);
  add.addEventListener('submit', (e) => {
    e.preventDefault();
    const row = Object.fromEntries(cols.map((x, j) => [x, cleanHost(ins[j].value)]));
    if (cols.every((x) => !row[x])) {
      ins[0].focus();
      return;
    }
    s.map.push(row);
    s.saveMap();
    s.draw('#envAddPROD');
  });
  return h(
    'div',
    { class: 'set-card', id: 'envSites' },
    h('h3', {}, h('span', { class: 'step' }, '2'), `Same site in each version (${s.map.length})`),
    h(
      'p',
      { class: 'sub' },
      'One row for each site. Type the site’s address in each version. Then a link’s menu can open the same page in another version, and “Tag matrix” can fill in missing links. Leave a box empty if that version does not exist.',
    ),
    sites,
  );
}
