import { THEMES } from '../../constants/themes.js';
import { FONT_SCALE } from '../../constants/limits.js';
import { capitalize } from '../../domain/text.js';
import { clampFont } from '../../domain/sizes.js';
import { h } from '../../ui/dom.js';
import { applyTheme } from '../../ui/theme.js';
import { homeBgUrl } from '../../state/home-assets.js';
import { card, field, range } from './controls.js';

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

export function appearance(c) {
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
          'aria-label': capitalize(name),
          title: capitalize(name),
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
}
