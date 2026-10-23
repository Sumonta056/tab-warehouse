import {
  h,
  svgIcon,
  THEMES,
  applyTheme,
  folderList,
  clockText,
  hostOf,
  normalizeUrl,
  deriveUrl,
  explainEnv,
  envText,
  parseEnvText,
  ENVS,
  ENV_NAMES,
  TAG_COLORS,
  tagNameError,
  cleanTags,
  tagBadge,
  imageSaveError,
  clampFont,
  FONT_SCALE,
  flatten,
  findDuplicates,
} from './lib/core.js';
import { homeBgUrl, homeIconMap, homeLinks, homeLinksList, setHomeBg, applyHomeVars, homeIconImg } from './home.js';
import { exportJson, exportHtml, importFile } from './lib/transfer.js';

export const TABS = [
  ['appearance', 'Appearance'],
  ['home', 'Home page'],
  ['bookmarks', 'Bookmarks'],
  ['dupes', 'Duplicates'],
  ['env', 'Tags'],
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
let dupLoose = false;
const timers = {};

function later(key, fn, ms = 300) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, ms);
}

const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;
const cleanHost = (v) => {
  v = (v || '').trim().toLowerCase();
  return /^[a-z][a-z0-9+.-]*:\/\//.test(v) ? hostOf(v) : v.replace(/\/.*$/, '');
};

export function setSettingsTab(key) {
  if (TABS.some(([k]) => k === key)) tab = key;
}

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

function fontSlider(c, key, label) {
  const f = range(label, clampFont(c.settings[key]), FONT_SCALE.min, FONT_SCALE.max, '%', (v) => {
    c.applyFontSize({ ...c.settings, [key]: v });
    c.saveLater(key, () => ({ [key]: v }));
  });
  const input = f.querySelector('input');
  input.step = 5;
  input.id = key;
  return f;
}

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

/* ---------- tabs ---------- */
const VIEWS = {
  appearance(c) {
    const s = c.settings;
    const nameBox = h('input', {
      type: 'text',
      id: 'userName',
      value: s.userName || '',
      placeholder: 'Your name',
      maxlength: 40,
      autocomplete: 'off',
      'aria-label': 'What is your name?',
    });
    nameBox.addEventListener('change', async () => {
      const userName = nameBox.value.trim();
      if (userName === (c.settings.userName || '')) return;
      await c.save({ userName });
      c.renderBrand();
    });
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
        card(
          'Your name',
          'The sidebar and the browser tab show "<name>\'s Warehouse". Leave it empty for "Tab Warehouse".',
          field('What is your name?', nameBox),
        ),
        card(
          'Text size',
          'Makes the text in each pane bigger or smaller.',
          fontSlider(c, 'fontSide', 'Sidebar'),
          fontSlider(c, 'fontPage', 'Page'),
          fontSlider(c, 'fontBoard', 'Board'),
        ),
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
            .map((bm) => h('span', { class: 'pv-tile' }, homeIconImg(bm, h('span', { class: 'ic' }), icons), h('span', { class: 'lbl' }, bm.title))),
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
      } catch (err) {
        c.toast(imageSaveError(err));
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
          range('Space above tiles', o.tilesGap, 0, 240, 'px', set('tilesGap')),
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

  dupes(c) {
    return h('div', { class: 'set-grid one' }, h('div', { class: 'set-col' }, dupCard(c)));
  },

  env(c) {
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
        let to = i + (after ? 1 : 0);
        if (from < to) to--;
        move(from, to);
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
            ? `Rule ${x.rule + 1} matched: the address contains “${rules[x.rule].pattern}”.`
            : rules.length
              ? 'No rule matches this address.'
              : 'There are no rules yet.';
        const host = hostOf(url);
        const row = host && map.find((r) => names().some((e) => (r[e] || '').toLowerCase() === host));
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
              'aria-label': cap(col),
              title: cap(col),
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
        if (to < 0 || to >= tags.length || from === to) return;
        const [t] = tags.splice(from, 1);
        tags.splice(to, 0, t);
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
          rules.forEach((r) => {
            if (r.env === old) r.env = v;
          });
          map.forEach((r) => {
            if (!(old in r)) return;
            r[v] = r[old];
            delete r[old];
          });
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
          rules = rules.filter((r) => r.env !== tg.name);
          map.forEach((r) => delete r[tg.name]);
          map = map.filter((r) => Object.values(r).some(Boolean));
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
      let addColor = TAG_COLORS.find((col) => !tags.some((t) => t.color === col)) || TAG_COLORS[0];
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
        const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
        c.toast(
          `Imported ${p.tags.length ? `${n(p.tags.length, 'tag')}, ` : ''}${n(rules.length, 'rule')} and ${n(map.length, 'site')}${p.skipped ? `. Skipped ${n(p.skipped, 'line')} that could not be read` : ''}`,
          {
            label: 'Undo',
            run: async () => {
              rules = old.envRules;
              map = old.hostMap;
              tags = old.customTags;
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
      root.replaceChildren(intro(), tagsCard(), h('div', { class: 'env-cols' }, labelsCard(), sitesCard()), copyCard());
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
          "JSON keeps sidebar order, categories, per-folder sort, tags and link notes. HTML is Chrome's own bookmark format.",
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
