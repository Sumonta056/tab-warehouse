import {
  h,
  svgIcon,
  THEMES,
  applyTheme,
  folderList,
  clockText,
  letterIcon,
  hostOf,
  normalizeUrl,
  deriveUrl,
  explainEnv,
  envText,
  parseEnvText,
  ENVS,
  ENV_NAMES,
} from './lib/core.js';
import { homeBgUrl, homeIconMap, homeLinks, homeLinksList, setHomeBg, applyHomeVars, tileIconSrc } from './home.js';
import { exportJson, exportHtml, importFile } from './lib/transfer.js';

export const TABS = [
  ['appearance', 'Appearance'],
  ['home', 'Home page'],
  ['bookmarks', 'Bookmarks'],
  ['env', 'Environments'],
  ['backup', 'Backup'],
];

const ENV_HINTS = {
  PROD: 'the real site',
  TEST: 'a copy for checking changes',
  STAGE: 'a copy for checking changes before release',
  LOCAL: 'a copy that runs on your computer',
};
const EXAMPLE_RULES = [
  { pattern: 'localhost', env: 'LOCAL' },
  { pattern: 'staging.', env: 'STAGE' },
  { pattern: 'test.', env: 'TEST' },
  { pattern: 'shop.example.com', env: 'PROD' },
];
const EXAMPLE_MAP = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: 'staging.shop.example.com', LOCAL: 'localhost:3000' }];
const TRY_SAMPLES = [
  'https://shop.example.com/cart',
  'https://test.shop.example.com/cart',
  'https://staging.shop.example.com/cart',
  'http://localhost:3000/cart',
  'https://news.example.org',
];

let tab = 'appearance';
let envTryUrl = TRY_SAMPLES[1];
let envDrag = null;
let scroll = {};
const timers = {};

function later(key, fn, ms = 300) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, ms);
}

const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;
const envBadge = (e) => h('span', { class: `badge ${e || 'none'}` }, e || 'No label');
const cleanHost = (v) => {
  v = (v || '').trim().toLowerCase();
  return /^[a-z][a-z0-9+.-]*:\/\//.test(v) ? hostOf(v) : v.replace(/\/.*$/, '');
};

export function renderSettings(page, ctx) {
  const status = h('span', { class: 'set-status', role: 'status' }, 'Changes save automatically');
  const save = async (patch) => {
    status.textContent = 'Saving…';
    await ctx.save(patch);
    status.textContent = 'Saved';
  };
  const saveLater = (key, patch) => {
    status.textContent = 'Saving…';
    Object.assign(ctx.settings, patch());
    later(key, () => save(patch()));
  };
  const c = Object.assign(Object.create(ctx), { save, saveLater });

  const tabs = h('div', { class: 'set-tabs', role: 'tablist', 'aria-label': 'Settings sections' });
  const body = h('div', { class: 'set-body', id: 'setPanel', role: 'tabpanel' });
  const show = (k, focus) => {
    scroll[tab] = body.scrollTop;
    tab = k;
    tabs.replaceChildren(
      ...TABS.map(([key, label]) =>
        h(
          'button',
          {
            class: `set-tab ${key === tab ? 'on' : ''}`,
            role: 'tab',
            id: `tab-${key}`,
            dataset: { tab: key },
            'aria-selected': String(key === tab),
            'aria-controls': 'setPanel',
            tabindex: key === tab ? '0' : '-1',
            onClick: () => show(key),
          },
          label,
        ),
      ),
    );
    body.setAttribute('aria-labelledby', `tab-${tab}`);
    body.replaceChildren(VIEWS[tab](c));
    body.scrollTop = scroll[tab] || 0;
    if (focus) tabs.querySelector('.on')?.focus();
  };
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = TABS.findIndex(([k]) => k === tab);
    show(TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0], true);
  });
  body.addEventListener('scroll', () => {
    scroll[tab] = body.scrollTop;
  });

  page.append(
    h(
      'section',
      { class: 'set-view', id: 'settingsView', 'aria-label': 'Settings' },
      h(
        'div',
        { class: 'set-top' },
        h('h2', { tabindex: '-1' }, 'Settings'),
        status,
        h('button', { class: 'btn set-done', onClick: () => ctx.done() }, 'Done'),
      ),
      tabs,
      body,
    ),
  );
  show(tab);
}

/* ---------- building blocks ---------- */
function card(title, sub, ...kids) {
  return h('div', { class: 'set-card' }, h('h3', {}, title), sub ? h('p', { class: 'sub' }, sub) : null, ...kids);
}
function field(label, ...ctl) {
  return h('label', { class: 'set-f' }, h('span', {}, label), ...ctl);
}
function range(label, value, min, max, unit, onInput, disabled = false) {
  const out = h('output', {}, `${value}${unit}`);
  const input = h('input', { type: 'range', min, max, value, 'aria-label': label, disabled });
  input.addEventListener('input', () => {
    out.textContent = `${input.value}${unit}`;
    onInput(Number(input.value));
  });
  return field(label, h('span', { class: 'set-rng' }, input, out));
}
function toggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', class: 'switch', role: 'switch', checked: !!checked, 'aria-label': label });
  input.addEventListener('change', () => onChange(input.checked));
  return field(label, input);
}

/* ---------- tabs ---------- */
const VIEWS = {
  appearance(c) {
    const s = c.settings;
    let look = { ...s.sideLook };
    const swatches = h('div', { class: 'theme-sws', id: 'themeSwatches', role: 'radiogroup', 'aria-label': 'Accent color' });
    const drawSwatches = () => {
      const theme = c.settings.theme;
      const custom = !THEMES[theme];
      const picker = h('input', {
        type: 'color',
        value: custom && /^#[0-9a-f]{6}$/i.test(theme) ? theme : '#8ab4f8',
        'aria-label': 'Custom color',
        title: 'Custom color',
      });
      picker.addEventListener('input', () => {
        applyTheme(picker.value);
        c.saveLater('theme', () => ({ theme: picker.value }));
      });
      picker.addEventListener('change', async () => {
        applyTheme(picker.value);
        await c.save({ theme: picker.value });
        drawSwatches();
      });
      swatches.replaceChildren(
        ...Object.entries(THEMES).map(([name, [col]]) =>
          h('button', {
            type: 'button',
            class: `theme-sw ${theme === name ? 'on' : ''}`,
            style: { background: col },
            role: 'radio',
            'aria-checked': String(theme === name),
            'aria-label': cap(name),
            title: cap(name),
            dataset: { theme: name },
            onClick: async () => {
              applyTheme(name);
              await c.save({ theme: name });
              drawSwatches();
            },
          }),
        ),
        h('label', { class: `theme-custom ${custom ? 'on' : ''}` }, picker),
      );
    };
    drawSwatches();

    const mode = h('div', { class: 'seg', id: 'lookMode', role: 'radiogroup', 'aria-label': 'Sidebar background' });
    const color = h('input', { type: 'color', id: 'lookColor', 'aria-label': 'Sidebar color' });
    const dark = h('input', { type: 'range', id: 'lookDark', min: 30, max: 95, 'aria-label': 'Sidebar darkness' });
    const blur = h('input', { type: 'range', id: 'lookBlur', min: 0, max: 24, 'aria-label': 'Sidebar blur' });
    const darkOut = h('output', { id: 'lookDarkOut' }),
      blurOut = h('output', { id: 'lookBlurOut' });
    const note = h('p', { class: 'sub', id: 'lookNote' }, 'Upload a background on Home first.');
    const draw = () => {
      const image = look.mode === 'image';
      mode.replaceChildren(
        ...[
          ['solid', 'Solid color'],
          ['image', 'Home image'],
        ].map(([m, l]) =>
          h(
            'button',
            {
              type: 'button',
              role: 'radio',
              class: look.mode === m ? 'on' : '',
              'aria-checked': String(look.mode === m),
              dataset: { mode: m },
              onClick: () => {
                look.mode = m;
                commit();
              },
            },
            l,
          ),
        ),
      );
      color.value = look.color;
      dark.value = look.dark;
      blur.value = look.blur;
      dark.disabled = blur.disabled = !image;
      darkOut.textContent = `${look.dark}%`;
      blurOut.textContent = `${look.blur}px`;
      note.hidden = !image || !!homeBgUrl();
    };
    const commit = () => {
      draw();
      c.applySideLook(look);
      c.saveLater('sideLook', () => ({ sideLook: look }));
    };
    color.addEventListener('input', () => {
      look.color = color.value;
      commit();
    });
    dark.addEventListener('input', () => {
      look.dark = Number(dark.value);
      commit();
    });
    blur.addEventListener('input', () => {
      look.blur = Number(blur.value);
      commit();
    });
    draw();

    return h(
      'div',
      { class: 'set-grid one' },
      h(
        'div',
        { class: 'set-col' },
        card('Accent color', 'Colors the active folder, Home buttons, focus rings and buttons.', swatches),
        card(
          'Sidebar background',
          'The sidebar on the left shows each change at once.',
          field('Background', mode),
          field('Color', color),
          field('Darkness', h('span', { class: 'set-rng' }, dark, darkOut)),
          field('Blur', h('span', { class: 'set-rng' }, blur, blurOut)),
          note,
        ),
      ),
    );
  },

  home(c) {
    const o = { ...c.settings.home };
    const { folder, links } = homeLinks(c.tree, c.settings);
    const icons = homeIconMap();
    const prevBg = h('div', { class: 'home-bg' });
    const prevClock = h('div', { class: 'pv-clock' });
    const prevDate = h('div', { class: 'pv-date' });
    const preview = h(
      'div',
      { class: 'home-preview', id: 'homePreview', 'aria-hidden': 'true' },
      prevBg,
      h('div', { class: 'home-shade' }),
      h(
        'div',
        { class: 'pv-content' },
        prevClock,
        prevDate,
        h(
          'div',
          { class: 'pv-tiles' },
          ...links
            .slice(0, 6)
            .map((bm) =>
              h(
                'span',
                { class: 'pv-tile' },
                h(
                  'span',
                  { class: 'ic' },
                  h('img', { src: tileIconSrc(bm, icons), alt: '', loading: 'lazy', decoding: 'async', onError: (e) => e.target.replaceWith(letterIcon(bm)) }),
                ),
                h('span', { class: 'lbl' }, bm.title),
              ),
            ),
        ),
      ),
    );
    const live = () => {
      applyHomeVars(preview, o);
      const now = new Date();
      prevClock.textContent = clockText(now, o);
      prevDate.textContent = o.date ? now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';
      prevBg.style.backgroundImage = homeBgUrl() ? `url("${homeBgUrl()}")` : '';
    };
    const set = (key) => (v) => {
      o[key] = v;
      live();
      c.saveLater('home', () => ({ home: { ...c.settings.home, ...o } }));
    };
    live();

    const file = h('input', { type: 'file', accept: 'image/*', class: 'sr', 'aria-label': 'Background image file' });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        await setHomeBg(f);
        live();
        c.onBgChange();
      } catch {
        c.toast('That file is not an image the browser can read.');
      }
      file.value = '';
    });
    const color = h('input', { type: 'color', value: o.color, 'aria-label': 'Background color' });
    color.addEventListener('input', () => set('color')(color.value));

    return h(
      'div',
      { class: 'set-grid' },
      h(
        'div',
        { class: 'set-col' },
        card(`Links (${links.length})`, 'The tiles on Home, in order. Drag to reorder. Remove shows an Undo.', homeLinksList(links, folder, c)),
        card(
          'Background',
          null,
          field(
            'Image',
            h(
              'span',
              { class: 'set-row' },
              h('button', { type: 'button', class: 'btn sm', onClick: () => file.click() }, 'Upload image…'),
              h(
                'button',
                {
                  type: 'button',
                  class: 'btn sm',
                  onClick: async () => {
                    await setHomeBg(null);
                    live();
                    c.onBgChange();
                  },
                },
                'Remove image',
              ),
              file,
            ),
          ),
          range('Image opacity', o.imgOpacity, 0, 100, '%', set('imgOpacity')),
          range('Darkness', o.dark, 0, 90, '%', set('dark')),
          range('Blur', o.blur, 0, 12, 'px', set('blur')),
          field('Color', color),
        ),
        card(
          'Clock',
          null,
          range('Size', o.clockSize, 48, 260, '', set('clockSize')),
          toggle('24-hour', o.h24, set('h24')),
          toggle('Seconds', o.seconds, set('seconds')),
          toggle('Date', o.date, set('date')),
        ),
        card(
          'Tiles',
          null,
          toggle('Show names', o.labels, set('labels')),
          toggle('Open in new tab', o.newTab, set('newTab')),
          range('Icon size', o.tileSize, 40, 88, '', set('tileSize')),
          range('Per row', o.perRow, 4, 16, '', set('perRow')),
        ),
      ),
      h('div', { class: 'set-col set-aside' }, h('p', { class: 'set-label' }, 'Preview'), preview),
    );
  },

  bookmarks(c) {
    const s = c.settings;
    const sel = h(
      'select',
      { id: 'rootSelect', 'aria-label': 'Root folder' },
      ...folderList(c.tree).map((f) => h('option', { value: f.id, selected: f.id === c.root.id }, `${'  '.repeat(f.depth)}${f.title}`)),
    );
    sel.addEventListener('change', async () => {
      await c.save({ rootId: sel.value });
      await c.refresh();
    });
    return h(
      'div',
      { class: 'set-grid one' },
      h(
        'div',
        { class: 'set-col' },
        card('Root folder', 'Its subfolders become the sidebar folders.', sel),
        card(
          'Display',
          null,
          toggle('Site favicons', s.showFavicons, (v) => c.save({ showFavicons: v })),
        ),
        card(
          'Sidebar order',
          'Order and categories are saved in this extension, not in Chrome.',
          h('button', { type: 'button', class: 'btn sm', id: 'resetOrder', onClick: () => c.resetOrder() }, 'Reset sidebar order'),
        ),
      ),
    );
  },

  env(c) {
    let rules = c.settings.envRules.map((r) => ({ ...r }));
    let map = c.settings.hostMap.map((r) => ({ ...r }));
    const root = h('div', { class: 'env-tab' });
    const saveRules = () => c.save({ envRules: rules });
    const saveMap = () => c.save({ hostMap: map });
    let updateTry = () => {};

    const envSelect = (value, label, onChange) => {
      const sel = h(
        'select',
        { class: `env-sel ${value}`, 'aria-label': label },
        ...ENVS.map((e) => h('option', { value: e, selected: e === value }, `${e} · ${ENV_NAMES[e]}`)),
      );
      sel.addEventListener('change', () => {
        sel.className = `env-sel ${sel.value}`;
        onChange(sel.value);
      });
      return sel;
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
      if (to < 0 || to >= rules.length || from === to) return;
      const [r] = rules.splice(from, 1);
      rules.splice(to, 0, r);
      saveRules();
      draw(focusSel?.replace('{i}', to));
    };

    function intro() {
      const input = h('input', { type: 'text', id: 'envTry', value: envTryUrl, spellcheck: 'false', 'aria-label': 'A link to try' });
      const out = h('div', { class: 'env-out', 'aria-live': 'polite' });
      updateTry = () => {
        const url = normalizeUrl(envTryUrl);
        const x = explainEnv({ url, title: '' }, rules);
        const why =
          x.rule >= 0
            ? `Label ${x.rule + 1} matched: the address contains “${rules[x.rule].pattern}”.`
            : rules.length
              ? 'No label matches this address.'
              : 'There are no labels yet.';
        const host = hostOf(url);
        const row = host && map.find((r) => ENVS.some((e) => (r[e] || '').toLowerCase() === host));
        const others = row
          ? ENVS.filter((e) => (row[e] || '').toLowerCase() !== host).map((e) =>
              h(
                'div',
                { class: `env-other ${row[e] ? '' : 'miss'}` },
                envBadge(e),
                row[e] ? h('span', { class: 'u' }, deriveUrl(url, e, [row]) || '') : 'Not set in step 2',
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
          h('p', {}, h('b', {}, '1. Labels. '), 'Each link gets a colored label, so you can see at a glance which version it opens.'),
          h(
            'p',
            {},
            h('b', {}, '2. Same site in each version. '),
            'When the extension knows the addresses of all versions, it can open the same page in another version with one click.',
          ),
          h('div', { class: 'env-legend' }, ...ENVS.flatMap((e) => [envBadge(e), h('span', {}, `${ENV_NAMES[e]} — ${ENV_HINTS[e]}`)])),
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
      const head = h('div', { class: 'env-rule head' }, h('span'), h('span', {}, 'If the address contains'), h('span', {}, 'Show the label'), h('span'));
      const rows = rules.map((r, i) => {
        const input = h('input', { type: 'text', class: 'env-in', value: r.pattern, 'aria-label': `Label ${i + 1}: address contains`, dataset: { i } });
        input.addEventListener('change', () => {
          const v = cleanHost(input.value);
          if (!v) {
            removeWithUndo(rules, i, 'label', saveRules);
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
          envSelect(r.env, `Label ${i + 1}: label`, (v) => {
            r.env = v;
            saveRules();
            updateTry();
          }),
          h(
            'button',
            { type: 'button', class: 'x', 'aria-label': `Remove label ${i + 1}`, title: 'Remove', onClick: () => removeWithUndo(rules, i, 'label', saveRules) },
            svgIcon('x'),
          ),
        );
        row.addEventListener('keydown', (e) => {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault();
          moveRule(i, i + (e.key === 'ArrowUp' ? -1 : 1), `.env-rule[data-i="{i}"] .env-in`);
        });
        grip.addEventListener('dragstart', (e) => {
          envDrag = i;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', r.pattern);
          e.dataTransfer.setDragImage?.(row, 10, 10);
          row.classList.add('dragging');
        });
        grip.addEventListener('dragend', () => {
          envDrag = null;
          row.classList.remove('dragging');
          root.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
        });
        row.addEventListener('dragover', (e) => {
          if (envDrag == null || envDrag === i) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const b = row.getBoundingClientRect();
          root.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
          row.classList.add(e.clientY > b.top + b.height / 2 ? 'drop-after' : 'drop-before');
        });
        row.addEventListener('drop', (e) => {
          if (envDrag == null || envDrag === i) return;
          e.preventDefault();
          const from = envDrag,
            after = row.classList.contains('drop-after');
          envDrag = null;
          let to = i + (after ? 1 : 0);
          if (from < to) to--;
          moveRule(from, to);
        });
        return row;
      });
      const empty = h(
        'div',
        { class: 'env-empty' },
        'No labels yet. Add one below, or start with examples.',
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
      const addIn = h('input', { type: 'text', class: 'env-in', id: 'envAddPattern', placeholder: 'e.g. test.', 'aria-label': 'New label: address contains' });
      const addSel = envSelect('TEST', 'New label: label', () => {});
      const add = h(
        'form',
        { class: 'env-rule add', novalidate: true },
        h('span'),
        addIn,
        addSel,
        h('button', { type: 'submit', class: 'x add', 'aria-label': 'Add label', title: 'Add label' }, svgIcon('plus')),
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
        h('h3', {}, h('span', { class: 'step' }, '1'), `Labels (${rules.length})`),
        h(
          'p',
          { class: 'sub' },
          'When a link’s address contains the text on the left, the link gets the label on the right. The list is checked ',
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

    function sitesCard() {
      const head = h('div', { class: 'env-site head' }, ...ENVS.map((e) => h('span', {}, envBadge(e))), h('span'));
      const rows = map.map((r, i) =>
        h(
          'div',
          { class: 'env-site', dataset: { i } },
          ...ENVS.map((e) => {
            const input = h('input', {
              type: 'text',
              class: 'env-in',
              value: r[e] || '',
              placeholder: 'none',
              'aria-label': `Site ${i + 1}: ${ENV_NAMES[e]} address`,
            });
            input.addEventListener('change', () => {
              r[e] = cleanHost(input.value);
              input.value = r[e];
              if (ENVS.every((x) => !r[x])) {
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
      const ins = ENVS.map((e) =>
        h('input', {
          type: 'text',
          class: 'env-in',
          id: `envAdd${e}`,
          placeholder: `${ENV_NAMES[e]} address`,
          'aria-label': `New site: ${ENV_NAMES[e]} address`,
        }),
      );
      const add = h(
        'form',
        { class: 'env-site add', novalidate: true },
        ...ins,
        h('button', { type: 'submit', class: 'x add', 'aria-label': 'Add site', title: 'Add site' }, svgIcon('plus')),
      );
      add.addEventListener('submit', (e) => {
        e.preventDefault();
        const row = Object.fromEntries(ENVS.map((x, j) => [x, cleanHost(ins[j].value)]));
        if (ENVS.every((x) => !row[x])) {
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
          'One row for each site. Type the site’s address in each version. Then a link’s menu can open the same page in another version, and “Env matrix” can fill in missing links. Leave a box empty if that version does not exist.',
        ),
        head,
        ...(rows.length ? rows : [empty]),
        add,
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
        ta.value = envText(rules, map);
        ta.select();
        try {
          await Promise.race([navigator.clipboard.writeText(ta.value), new Promise((_, no) => setTimeout(no, 1000))]);
          c.toast('Copied. You can paste it anywhere.');
        } catch {
          c.toast('Press ⌘C (Ctrl+C) to copy the selected text.');
        }
      };
      const doImport = async () => {
        const p = parseEnvText(ta.value);
        if (!p.rules.length && !p.hostMap.length) {
          c.toast('Nothing to import. Paste text that you copied from this section.');
          return;
        }
        const old = { envRules: rules, hostMap: map };
        rules = p.rules;
        map = p.hostMap;
        await c.save({ envRules: rules, hostMap: map });
        draw();
        const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
        c.toast(
          `Imported ${n(rules.length, 'label')} and ${n(map.length, 'site')}${p.skipped ? `. Skipped ${n(p.skipped, 'line')} that could not be read` : ''}`,
          {
            label: 'Undo',
            run: async () => {
              rules = old.envRules;
              map = old.hostMap;
              await c.save(old);
              draw();
            },
          },
        );
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
      root.replaceChildren(intro(), h('div', { class: 'env-cols' }, labelsCard(), sitesCard()), copyCard());
      if (focusSel) root.querySelector(focusSel)?.focus();
    }
    draw();
    return root;
  },

  backup(c) {
    const file = h('input', { type: 'file', id: 'importFile', accept: '.json,.html,.htm', class: 'sr', 'aria-label': 'Import file' });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        const r = await importFile(f, c.root, c.settings);
        await c.reload();
        c.toast(
          `Imported: ${r.folders} folder${r.folders === 1 ? '' : 's'}, ${r.links} new link${r.links === 1 ? '' : 's'}${r.skipped ? `, ${r.skipped} already there` : ''}`,
        );
      } catch (err) {
        c.toast(`Import failed: ${err.message}`);
      }
      file.value = '';
    });
    return h(
      'div',
      { class: 'set-grid one' },
      h(
        'div',
        { class: 'set-col' },
        card(
          'Export',
          "JSON keeps sidebar order, categories, per-folder sort and env rules. HTML is Chrome's own bookmark format.",
          h(
            'div',
            { class: 'set-row' },
            h('button', { type: 'button', class: 'btn sm', id: 'exportJson', onClick: () => exportJson(c.root, c.secs, c.settings) }, 'Export JSON'),
            h('button', { type: 'button', class: 'btn sm', id: 'exportHtml', onClick: () => exportHtml(c.root, c.secs) }, 'Export HTML'),
          ),
        ),
        card(
          'Import',
          'Import merges. URLs that already exist are skipped.',
          h('button', { type: 'button', class: 'btn sm', id: 'importBtn', onClick: () => file.click() }, 'Import…'),
          file,
        ),
      ),
    );
  },
};
