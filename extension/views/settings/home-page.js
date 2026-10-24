import { clockText } from '../../domain/clock.js';
import { imageSaveError } from '../../domain/errors.js';
import { homeLinks } from '../../domain/home.js';
import { h } from '../../ui/dom.js';
import { homeIconImg } from '../../ui/home-icon.js';
import { applyHomeVars } from '../../ui/theme.js';
import { homeBgUrl, homeIconMap, setHomeBg } from '../../state/home-assets.js';
import { card, field, range, toggle } from './controls.js';
import { homeLinksList } from './home-links.js';

export function home(c) {
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
}
