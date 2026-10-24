import { ENVS } from '../../../constants/envs.js';
import { TAG_COLORS } from '../../../constants/tags.js';
import { tagNameError, cleanTags, renameTag, removeTag, firstFreeColor, moveItem } from '../../../domain/tags.js';
import { capitalize } from '../../../domain/text.js';
import { h, svgIcon } from '../../../ui/dom.js';
import { refill } from './state.js';

function swatches(value, label, onPick) {
  const group = h('div', { class: 'tag-sws', role: 'group', 'aria-label': label });
  group.append(
    ...TAG_COLORS.map((col) =>
      h('button', {
        type: 'button',
        class: 'tag-sw',
        dataset: { tag: col },
        'aria-pressed': String(col === value),
        'aria-label': capitalize(col),
        title: capitalize(col),
        onClick: () => {
          group.querySelectorAll('.tag-sw').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tag === col)));
          onPick(col);
        },
      }),
    ),
  );
  return group;
}

export function yourTagsCard(s) {
  const c = s.c;
  const saveAll = () => c.save({ customTags: s.tags, envRules: s.rules, hostMap: s.map });
  const taken = (except) => s.tags.filter((t) => t !== except).map((t) => t.name);
  const moveTag = (from, to) => {
    const next = moveItem(s.tags, from, to);
    if (!next) return;
    refill(s.tags, next);
    s.saveTags();
    s.draw(`#envTags .tag-row[data-i="${to}"] .tag-name`);
  };
  const rows = s.tags.map((tg, i) => {
    const name = h('input', {
      type: 'text',
      class: 'env-in tag-name',
      value: tg.name,
      maxlength: 8,
      spellcheck: 'false',
      'aria-label': `Tag ${i + 1}: name`,
    });
    name.addEventListener('change', () => {
      const v = name.value.trim().toUpperCase();
      if (v === tg.name) {
        name.value = v;
        return;
      }
      const err = tagNameError(v, taken(tg));
      if (err) {
        name.value = tg.name;
        c.toast(err);
        return;
      }
      const old = tg.name;
      tg.name = v;
      const renamed = renameTag(s.rules, s.map, old, v);
      refill(s.rules, renamed.rules);
      refill(s.map, renamed.map);
      saveAll();
      s.draw();
    });
    const plainIn = h('input', {
      type: 'text',
      class: 'env-in tag-plain',
      value: tg.plain,
      placeholder: 'Plain name',
      'aria-label': `Tag ${i + 1}: plain name`,
    });
    plainIn.addEventListener('change', () => {
      tg.plain = plainIn.value;
      s.tags = cleanTags(s.tags);
      s.saveTags();
      s.draw();
    });
    const remove = () => {
      const n = s.rules.filter((r) => r.env === tg.name).length;
      const what = n ? `Its ${n} rule${n === 1 ? '' : 's'} and its site column are` : 'Its site column is';
      if (!confirm(`Delete the tag ${tg.name}? ${what} removed too.`)) return;
      s.tags.splice(i, 1);
      ({ rules: s.rules, map: s.map } = removeTag(s.rules, s.map, tg.name));
      saveAll();
      s.draw();
    };
    const grip = h('span', { class: 'grip', draggable: true, title: 'Drag to change the order', 'aria-hidden': 'true' }, svgIcon('grip'));
    const row = h(
      'div',
      { class: 'tag-row', dataset: { i } },
      grip,
      s.envBadge(tg.name),
      name,
      plainIn,
      swatches(tg.color, `Tag ${tg.name}: color`, (col) => {
        tg.color = col;
        s.saveTags();
        s.draw(`#envTags .tag-row[data-i="${i}"] .tag-sw[data-tag="${col}"]`);
      }),
      h('button', { type: 'button', class: 'x', 'aria-label': `Delete tag ${tg.name}`, title: 'Delete', onClick: remove }, svgIcon('x')),
    );
    row.addEventListener('keydown', (e) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      moveTag(i, i + (e.key === 'ArrowUp' ? -1 : 1));
    });
    s.sortable(row, grip, 'tag', i, tg.name, moveTag);
    return row;
  });
  let addColor = firstFreeColor(s.tags, TAG_COLORS);
  const addName = h('input', {
    type: 'text',
    class: 'env-in tag-name',
    id: 'tagAddName',
    maxlength: 8,
    spellcheck: 'false',
    placeholder: 'e.g. QA',
    'aria-label': 'New tag: name',
  });
  const addPlain = h('input', {
    type: 'text',
    class: 'env-in tag-plain',
    id: 'tagAddPlain',
    placeholder: 'Plain name',
    'aria-label': 'New tag: plain name',
  });
  const add = h(
    'form',
    { class: 'tag-row add', novalidate: true },
    h('span'),
    h('span'),
    addName,
    addPlain,
    swatches(addColor, 'New tag: color', (col) => {
      addColor = col;
    }),
    h('button', { type: 'submit', class: 'x add', 'aria-label': 'Add tag', title: 'Add tag' }, svgIcon('plus')),
  );
  add.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = addName.value.trim().toUpperCase();
    const err = tagNameError(v, taken());
    if (err) {
      c.toast(err);
      addName.focus();
      return;
    }
    s.tags = cleanTags([...s.tags, { name: v, plain: addPlain.value, color: addColor }]);
    s.saveTags();
    s.draw('#tagAddName');
  });
  return h(
    'div',
    { class: 'set-card', id: 'envTags' },
    h('h3', {}, `Your tags (${s.tags.length})`),
    h(
      'p',
      { class: 'sub' },
      'Add your own tags next to the built-in ones, for example QA, UAT or DEMO. A rule in step 1 gives a link its tag. Drag ',
      svgIcon('grip'),
      ' or press Alt+↑/↓ to change the order.',
    ),
    h('div', { class: 'tag-builtin' }, ...ENVS.map(s.envBadge), h('span', { class: 'sub' }, 'Built in')),
    ...rows,
    add,
  );
}
