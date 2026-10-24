import { EXAMPLE_RULES } from '../../../constants/tags.js';
import { moveItem } from '../../../domain/tags.js';
import { cleanHost } from '../../../domain/url.js';
import { h, svgIcon } from '../../../ui/dom.js';
import { refill } from './state.js';

export function rulesCard(s) {
  const moveRule = (from, to, focusSel) => {
    const next = moveItem(s.rules, from, to);
    if (!next) return;
    refill(s.rules, next);
    s.saveRules();
    s.draw(focusSel?.replace('{i}', to));
  };
  const head = h('div', { class: 'env-rule head' }, h('span'), h('span', {}, 'If the address contains'), h('span', {}, 'Give the tag'), h('span'));
  const rows = s.rules.map((r, i) => {
    const input = h('input', { type: 'text', class: 'env-in', value: r.pattern, 'aria-label': `Rule ${i + 1}: address contains`, dataset: { i } });
    input.addEventListener('change', () => {
      const v = cleanHost(input.value);
      if (!v) {
        s.removeWithUndo(s.rules, i, 'rule', s.saveRules);
        return;
      }
      r.pattern = v;
      input.value = v;
      s.saveRules();
      s.updateTry();
    });
    const grip = h('span', { class: 'grip', draggable: true, title: 'Drag to change the order', 'aria-hidden': 'true' }, svgIcon('grip'));
    const row = h(
      'div',
      { class: 'env-rule', dataset: { i } },
      grip,
      input,
      s.envSelect(r.env, `Rule ${i + 1}: tag`, (v) => {
        r.env = v;
        s.saveRules();
        s.updateTry();
      }),
      h(
        'button',
        { type: 'button', class: 'x', 'aria-label': `Remove rule ${i + 1}`, title: 'Remove', onClick: () => s.removeWithUndo(s.rules, i, 'rule', s.saveRules) },
        svgIcon('x'),
      ),
    );
    row.addEventListener('keydown', (e) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      moveRule(i, i + (e.key === 'ArrowUp' ? -1 : 1), `.env-rule[data-i="{i}"] .env-in`);
    });
    s.sortable(row, grip, 'rule', i, r.pattern, moveRule);
    return row;
  });
  const empty = h(
    'div',
    { class: 'env-empty' },
    'No rules yet. Add one below, or start with examples.',
    h(
      'button',
      {
        type: 'button',
        class: 'btn sm',
        onClick: () => {
          s.rules = EXAMPLE_RULES.map((r) => ({ ...r }));
          s.saveRules();
          s.draw();
        },
      },
      'Add examples',
    ),
  );
  const addIn = h('input', { type: 'text', class: 'env-in', id: 'envAddPattern', placeholder: 'e.g. test.', 'aria-label': 'New rule: address contains' });
  const addSel = s.envSelect('TEST', 'New rule: tag', () => {});
  const add = h(
    'form',
    { class: 'env-rule add', novalidate: true },
    h('span'),
    addIn,
    addSel,
    h('button', { type: 'submit', class: 'x add', 'aria-label': 'Add rule', title: 'Add rule' }, svgIcon('plus')),
  );
  add.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = cleanHost(addIn.value);
    if (!v) {
      addIn.focus();
      return;
    }
    s.rules.push({ pattern: v, env: addSel.value });
    s.saveRules();
    s.draw('#envAddPattern');
  });
  return h(
    'div',
    { class: 'set-card', id: 'envLabels' },
    h('h3', {}, h('span', { class: 'step' }, '1'), `Tags by address (${s.rules.length})`),
    h(
      'p',
      { class: 'sub' },
      'When a link’s address contains the text on the left, the link gets the tag on the right. The list is checked ',
      h('b', {}, 'from top to bottom'),
      ', and the first match wins. Drag ',
      svgIcon('grip'),
      ' or press Alt+↑/↓ to change the order.',
    ),
    head,
    ...(rows.length ? rows : [empty]),
    add,
  );
}
