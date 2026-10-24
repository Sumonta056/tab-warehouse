import { SETTINGS_TABS } from '../../constants/pages.js';
import { h } from '../../ui/dom.js';
import { later } from './controls.js';
import { appearance } from './appearance.js';
import { home } from './home-page.js';
import { bookmarks } from './bookmarks.js';
import { dupes } from './duplicates.js';
import { env } from './tags.js';
import { backup } from './backup.js';
import { keys } from './shortcuts.js';

const VIEWS = { appearance, home, bookmarks, dupes, env, backup, keys };

let tab = 'appearance';
let scroll = {};

export function setSettingsTab(key) {
  if (SETTINGS_TABS.some(([k]) => k === key)) tab = key;
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
      ...SETTINGS_TABS.map(([key, label]) =>
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
    const i = SETTINGS_TABS.findIndex(([k]) => k === tab);
    show(SETTINGS_TABS[(i + (e.key === 'ArrowRight' ? 1 : SETTINGS_TABS.length - 1)) % SETTINGS_TABS.length][0], true);
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
