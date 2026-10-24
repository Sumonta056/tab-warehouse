import { ENVS, ENV_NAMES, ENV_HINTS } from '../../constants/envs.js';
import { TAG_COLORS, EXAMPLE_RULES, EXAMPLE_MAP, TRY_SAMPLES } from '../../constants/tags.js';
import { deriveUrl, findSiteRow } from '../../domain/derive.js';
import { explainEnv, explainWhy } from '../../domain/env.js';
import { envText, parseEnvText, importSummary } from '../../domain/env-text.js';
import { tagNameError, cleanTags, renameTag, removeTag, firstFreeColor, moveItem, dropIndex } from '../../domain/tags.js';
import { capitalize } from '../../domain/text.js';
import { hostOf, normalizeUrl, cleanHost } from '../../domain/url.js';
import { tagBadge } from '../../ui/badges.js';
import { h, svgIcon } from '../../ui/dom.js';

let envTryUrl = TRY_SAMPLES[1];
let envDrag = null;

const refill = (list, next) => list.splice(0, list.length, ...next);

export function env(c) {
  let rules = c.settings.envRules.map((r) => ({ ...r }));
  let map = c.settings.hostMap.map((r) => ({ ...r }));
  let tags = (c.settings.customTags || []).map((t) => ({ ...t }));
  const root = h('div', { class: 'env-tab' });
  const saveRules = () => c.save({ envRules: rules });
  const saveMap = () => c.save({ hostMap: map });
  const saveTags = () => c.save({ customTags: tags });
  let updateTry = () => {};
  const names = () => [...ENVS, ...tags.map((t) => t.name)];
  const plain = (e) => ENV_NAMES[e] || tags.find((t) => t.name === e)?.plain || e;
  const envBadge = (e) => (e ? tagBadge(e, tags) : h('span', { class: 'badge none' }, 'No tag'));

  const envSelect = (value, label, onChange) => {
    const sel = h('select', { 'aria-label': label }, ...names().map((e) => h('option', { value: e, selected: e === value }, `${e} · ${plain(e)}`)));
    const paint = () => {
      const t = tags.find((x) => x.name === sel.value);
      sel.className = `env-sel ${t ? 'tag' : sel.value}`;
      if (t) sel.dataset.tag = t.color;
      else delete sel.dataset.tag;
    };
    paint();
    sel.addEventListener('change', () => {
      paint();
      onChange(sel.value);
    });
    return sel;
  };
  const sortable = (row, grip, kind, i, label, move) => {
    const clear = () => root.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
    const mine = () => envDrag?.kind === kind && envDrag.i !== i;
    grip.addEventListener('dragstart', (e) => {
      envDrag = { kind, i };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', label);
      e.dataTransfer.setDragImage?.(row, 10, 10);
      row.classList.add('dragging');
    });
    grip.addEventListener('dragend', () => {
      envDrag = null;
      row.classList.remove('dragging');
      clear();
    });
    row.addEventListener('dragover', (e) => {
      if (!mine()) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const b = row.getBoundingClientRect();
      clear();
      row.classList.add(e.clientY > b.top + b.height / 2 ? 'drop-after' : 'drop-before');
    });
    row.addEventListener('drop', (e) => {
      if (!mine()) return;
      e.preventDefault();
      const from = envDrag.i,
        after = row.classList.contains('drop-after');
      envDrag = null;
      move(from, dropIndex(from, i, after));
    });
  };
  const removeWithUndo = (list, i, what, save) => {
    const [item] = list.splice(i, 1);
    save();
    draw();
    c.toast(`Removed ${what}`, {
      label: 'Undo',
      run: () => {
        list.splice(i, 0, item);
        save();
        draw();
      },
    });
  };
  const moveRule = (from, to, focusSel) => {
    const next = moveItem(rules, from, to);
    if (!next) return;
    refill(rules, next);
    saveRules();
    draw(focusSel?.replace('{i}', to));
  };

  function intro() {
    const input = h('input', { type: 'text', id: 'envTry', value: envTryUrl, spellcheck: 'false', 'aria-label': 'A link to try' });
    const out = h('div', { class: 'env-out', 'aria-live': 'polite' });
    updateTry = () => {
      const url = normalizeUrl(envTryUrl);
      const x = explainEnv({ url, title: '' }, rules);
      const why = explainWhy(x, rules);
      const host = hostOf(url);
      const row = findSiteRow(map, host, names());
      const others = row
        ? names()
            .filter((e) => (row[e] || '').toLowerCase() !== host)
            .map((e) =>
              h(
                'div',
                { class: `env-other ${row[e] ? '' : 'miss'}` },
                envBadge(e),
                row[e] ? h('span', { class: 'u' }, deriveUrl(url, e, [row], names()) || '') : 'Not set in step 2',
              ),
            )
        : [h('div', { class: 'env-other miss' }, map.length ? 'This site is not in step 2 yet.' : 'Fill in step 2 to see links to the other versions.')];
      out.replaceChildren(
        h('div', { class: 'env-result' }, envBadge(x.env), h('div', { class: 't' }, h('div', { class: 'u' }, url || '—'), h('div', { class: 'why' }, why))),
        h('p', { class: 'set-label' }, 'Same page in the other versions'),
        h('div', { class: 'env-others' }, ...others),
      );
    };
    input.addEventListener('input', () => {
      envTryUrl = input.value;
      updateTry();
    });
    updateTry();
    return h(
      'div',
      { class: 'set-card env-intro' },
      h(
        'div',
        {},
        h('h3', {}, 'What is this?'),
        h(
          'p',
          {},
          'Many websites have more than one version of the same site: the live site that customers use, and copies for testing. This section helps you tell them apart.',
        ),
        h('p', {}, h('b', {}, '1. Tags by address. '), 'Each link gets a colored tag, so you can see at a glance which version it opens.'),
        h(
          'p',
          {},
          h('b', {}, '2. Same site in each version. '),
          'When the extension knows the addresses of all versions, it can open the same page in another version with one click.',
        ),
        h('div', { class: 'env-legend' }, ...names().flatMap((e) => [envBadge(e), h('span', {}, `${plain(e)} — ${ENV_HINTS[e] || 'your tag'}`)])),
        h('p', { class: 'sub' }, 'Do not use more than one version of a site? You can leave this section empty.'),
      ),
      h(
        'div',
        { class: 'env-try' },
        h('p', { class: 'set-label' }, 'Try it'),
        input,
        h(
          'div',
          { class: 'env-samples' },
          ...TRY_SAMPLES.map((u) =>
            h(
              'button',
              {
                type: 'button',
                class: 'chip',
                onClick: () => {
                  envTryUrl = u;
                  input.value = u;
                  updateTry();
                },
              },
              u.replace(/^https?:\/\//, ''),
            ),
          ),
        ),
        out,
      ),
    );
  }

  function labelsCard() {
    const head = h('div', { class: 'env-rule head' }, h('span'), h('span', {}, 'If the address contains'), h('span', {}, 'Give the tag'), h('span'));
    const rows = rules.map((r, i) => {
      const input = h('input', { type: 'text', class: 'env-in', value: r.pattern, 'aria-label': `Rule ${i + 1}: address contains`, dataset: { i } });
      input.addEventListener('change', () => {
        const v = cleanHost(input.value);
        if (!v) {
          removeWithUndo(rules, i, 'rule', saveRules);
          return;
        }
        r.pattern = v;
        input.value = v;
        saveRules();
        updateTry();
      });
      const grip = h('span', { class: 'grip', draggable: true, title: 'Drag to change the order', 'aria-hidden': 'true' }, svgIcon('grip'));
      const row = h(
        'div',
        { class: 'env-rule', dataset: { i } },
        grip,
        input,
        envSelect(r.env, `Rule ${i + 1}: tag`, (v) => {
          r.env = v;
          saveRules();
          updateTry();
        }),
        h(
          'button',
          { type: 'button', class: 'x', 'aria-label': `Remove rule ${i + 1}`, title: 'Remove', onClick: () => removeWithUndo(rules, i, 'rule', saveRules) },
          svgIcon('x'),
        ),
      );
      row.addEventListener('keydown', (e) => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        moveRule(i, i + (e.key === 'ArrowUp' ? -1 : 1), `.env-rule[data-i="{i}"] .env-in`);
      });
      sortable(row, grip, 'rule', i, r.pattern, moveRule);
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
            rules = EXAMPLE_RULES.map((r) => ({ ...r }));
            saveRules();
            draw();
          },
        },
        'Add examples',
      ),
    );
    const addIn = h('input', { type: 'text', class: 'env-in', id: 'envAddPattern', placeholder: 'e.g. test.', 'aria-label': 'New rule: address contains' });
    const addSel = envSelect('TEST', 'New rule: tag', () => {});
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
      rules.push({ pattern: v, env: addSel.value });
      saveRules();
      draw('#envAddPattern');
    });
    return h(
      'div',
      { class: 'set-card', id: 'envLabels' },
      h('h3', {}, h('span', { class: 'step' }, '1'), `Tags by address (${rules.length})`),
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

  function tagsCard() {
    const saveAll = () => c.save({ customTags: tags, envRules: rules, hostMap: map });
    const taken = (except) => tags.filter((t) => t !== except).map((t) => t.name);
    const swatches = (value, label, onPick) => {
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
    };
    const moveTag = (from, to) => {
      const next = moveItem(tags, from, to);
      if (!next) return;
      refill(tags, next);
      saveTags();
      draw(`#envTags .tag-row[data-i="${to}"] .tag-name`);
    };
    const rows = tags.map((tg, i) => {
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
        const renamed = renameTag(rules, map, old, v);
        refill(rules, renamed.rules);
        refill(map, renamed.map);
        saveAll();
        draw();
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
        tags = cleanTags(tags);
        saveTags();
        draw();
      });
      const remove = () => {
        const n = rules.filter((r) => r.env === tg.name).length;
        const what = n ? `Its ${n} rule${n === 1 ? '' : 's'} and its site column are` : 'Its site column is';
        if (!confirm(`Delete the tag ${tg.name}? ${what} removed too.`)) return;
        tags.splice(i, 1);
        ({ rules, map } = removeTag(rules, map, tg.name));
        saveAll();
        draw();
      };
      const grip = h('span', { class: 'grip', draggable: true, title: 'Drag to change the order', 'aria-hidden': 'true' }, svgIcon('grip'));
      const row = h(
        'div',
        { class: 'tag-row', dataset: { i } },
        grip,
        envBadge(tg.name),
        name,
        plainIn,
        swatches(tg.color, `Tag ${tg.name}: color`, (col) => {
          tg.color = col;
          saveTags();
          draw(`#envTags .tag-row[data-i="${i}"] .tag-sw[data-tag="${col}"]`);
        }),
        h('button', { type: 'button', class: 'x', 'aria-label': `Delete tag ${tg.name}`, title: 'Delete', onClick: remove }, svgIcon('x')),
      );
      row.addEventListener('keydown', (e) => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        moveTag(i, i + (e.key === 'ArrowUp' ? -1 : 1));
      });
      sortable(row, grip, 'tag', i, tg.name, moveTag);
      return row;
    });
    let addColor = firstFreeColor(tags, TAG_COLORS);
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
      tags = cleanTags([...tags, { name: v, plain: addPlain.value, color: addColor }]);
      saveTags();
      draw('#tagAddName');
    });
    return h(
      'div',
      { class: 'set-card', id: 'envTags' },
      h('h3', {}, `Your tags (${tags.length})`),
      h(
        'p',
        { class: 'sub' },
        'Add your own tags next to the built-in ones, for example QA, UAT or DEMO. A rule in step 1 gives a link its tag. Drag ',
        svgIcon('grip'),
        ' or press Alt+↑/↓ to change the order.',
      ),
      h('div', { class: 'tag-builtin' }, ...ENVS.map(envBadge), h('span', { class: 'sub' }, 'Built in')),
      ...rows,
      add,
    );
  }

  function sitesCard() {
    const cols = names();
    const head = h('div', { class: 'env-site head' }, ...cols.map((e) => h('span', {}, envBadge(e))), h('span'));
    const rows = map.map((r, i) =>
      h(
        'div',
        { class: 'env-site', dataset: { i } },
        ...cols.map((e) => {
          const input = h('input', {
            type: 'text',
            class: 'env-in',
            value: r[e] || '',
            placeholder: 'none',
            'aria-label': `Site ${i + 1}: ${plain(e)} address`,
          });
          input.addEventListener('change', () => {
            r[e] = cleanHost(input.value);
            input.value = r[e];
            if (cols.every((x) => !r[x])) {
              removeWithUndo(map, i, 'site', saveMap);
              return;
            }
            saveMap();
            updateTry();
          });
          return input;
        }),
        h(
          'button',
          { type: 'button', class: 'x', 'aria-label': `Remove site ${i + 1}`, title: 'Remove', onClick: () => removeWithUndo(map, i, 'site', saveMap) },
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
            map = EXAMPLE_MAP.map((r) => ({ ...r }));
            saveMap();
            draw();
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
        placeholder: `${plain(e)} address`,
        'aria-label': `New site: ${plain(e)} address`,
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
      map.push(row);
      saveMap();
      draw('#envAddPROD');
    });
    return h(
      'div',
      { class: 'set-card', id: 'envSites' },
      h('h3', {}, h('span', { class: 'step' }, '2'), `Same site in each version (${map.length})`),
      h(
        'p',
        { class: 'sub' },
        'One row for each site. Type the site’s address in each version. Then a link’s menu can open the same page in another version, and “Tag matrix” can fill in missing links. Leave a box empty if that version does not exist.',
      ),
      sites,
    );
  }

  function copyCard() {
    const ta = h('textarea', {
      id: 'envText',
      rows: 6,
      spellcheck: 'false',
      placeholder: 'Paste text that you copied from this section, then click Import.',
      'aria-label': 'Text to copy or import',
    });
    const copy = async () => {
      ta.value = envText(rules, map, tags);
      ta.select();
      try {
        await Promise.race([navigator.clipboard.writeText(ta.value), new Promise((_, no) => setTimeout(no, 1000))]);
        c.toast('Copied. You can paste it anywhere.');
      } catch {
        c.toast('Press ⌘C (Ctrl+C) to copy the selected text.');
      }
    };
    const doImport = async () => {
      const p = parseEnvText(
        ta.value,
        tags.map((t) => t.name),
      );
      if (!p.rules.length && !p.hostMap.length && !p.tags.length) {
        c.toast('Nothing to import. Paste text that you copied from this section.');
        return;
      }
      const old = { envRules: rules, hostMap: map, customTags: tags };
      rules = p.rules;
      map = p.hostMap;
      tags = [...tags, ...p.tags];
      await c.save({ envRules: rules, hostMap: map, customTags: tags });
      draw();
      c.toast(importSummary(p, rules, map), {
        label: 'Undo',
        run: async () => {
          rules = old.envRules;
          map = old.hostMap;
          tags = old.customTags;
          await c.save(old);
          draw();
        },
      });
    };
    return h(
      'div',
      { class: 'set-card env-copy' },
      h('h3', {}, 'Copy or paste these settings'),
      h(
        'p',
        { class: 'sub' },
        'Copy both lists as text to keep a backup or to give them to a teammate. To load them, paste the text and click Import. Import replaces both lists, and you can undo it.',
      ),
      ta,
      h(
        'div',
        { class: 'set-row env-actions' },
        h('button', { type: 'button', class: 'btn sm', id: 'envCopy', onClick: copy }, 'Copy to clipboard'),
        h('button', { type: 'button', class: 'btn primary sm', id: 'envImport', onClick: doImport }, 'Import'),
      ),
      h('details', {}, h('summary', {}, 'What does the text look like?'), h('pre', {}, envText(EXAMPLE_RULES.slice(0, 2), EXAMPLE_MAP))),
    );
  }

  function draw(focusSel) {
    root.replaceChildren(intro(), tagsCard(), h('div', { class: 'env-cols' }, labelsCard(), sitesCard()), copyCard());
    if (focusSel) root.querySelector(focusSel)?.focus();
  }
  draw();
  return root;
}
