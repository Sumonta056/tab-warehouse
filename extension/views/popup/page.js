import { detectEnv } from '../../domain/env.js';
import { switchTargets } from '../../domain/derive.js';
import { defaultTitle, siteUrl } from '../../domain/popup.js';
import { tagNames, tagPlain } from '../../domain/tags.js';
import { openTab } from '../../services/tabs.js';
import { linkBadge, tagBadge } from '../../ui/badges.js';
import { h } from '../../ui/dom.js';
import { iconEl } from '../../ui/icons.js';
import { popup, target } from '../../state/popup-state.js';
import { renderExists } from './exists.js';

const $ = (s) => document.querySelector(s);

export function renderPage() {
  const { tab, settings } = popup;
  const page = $('#page');
  if (!tab?.url) {
    page.replaceChildren(h('span', { class: 'muted' }, 'No tab to save. Open a page and try again.'));
    return;
  }
  popup.titleEl = h('input', {
    class: 'field',
    'aria-label': 'Title',
    autocomplete: 'off',
    onInput: () => {
      popup.titleEdited = true;
      updateBadge();
    },
  });
  popup.titleEl.value = defaultTitle(popup.mode, tab);
  popup.targetEl = h('span', { class: 'target' });
  popup.badgeEl = h('span');
  page.replaceChildren(
    iconEl({ title: tab.title, url: tab.url }, settings.showFavicons),
    h('span', { class: 'txt' }, popup.titleEl, popup.targetEl),
    popup.badgeEl,
  );
  updateTarget();
}

export function renderSwitch() {
  const { tab, settings } = popup;
  if (!tab?.url) return;
  const box = $('#switch');
  const sw = switchTargets(tab.url, settings.hostMap, tagNames(settings));
  if (sw?.to.length)
    box.replaceChildren(
      h('span', { class: 'lbl' }, 'Open this page in'),
      ...sw.to.map(({ env, url }) =>
        h(
          'button',
          { class: 'env-go', title: url, dataset: { env }, onClick: (e) => openEnv(url, e.shiftKey || e.metaKey || e.ctrlKey) },
          tagBadge(env, settings.customTags),
          h('span', { class: 'u' }, url),
          h('span', { class: 'n' }, tagPlain(settings, env)),
        ),
      ),
    );
  else if (!sw && detectEnv({ title: tab.title, url: tab.url }, settings.envRules))
    box.replaceChildren(h('span', { class: 'switch-hint' }, 'To open this page in your other versions, add this site in Settings › Tags.'));
  else return;
  box.hidden = false;
}

async function openEnv(url, bg) {
  await openTab({ url, index: popup.tab.index + 1, active: !bg });
  if (bg) status('Opened in a background tab');
  else window.close();
}

function updateTarget() {
  if (!popup.targetEl) return;
  popup.targetEl.textContent = target() || '';
  updateBadge();
}

function updateBadge() {
  const { settings } = popup;
  const bm = { title: popup.titleEl.value, url: target() || '' };
  const env = detectEnv(bm, settings.envRules);
  const badge = linkBadge(env, bm.url, settings.customTags) || h('span');
  popup.badgeEl.replaceWith(badge);
  popup.badgeEl = badge;
}

export function renderModes() {
  const c = $('#modes');
  if (!c) return;
  const { mode } = popup;
  const site = siteUrl(popup.tab?.url);
  c.replaceChildren(
    h(
      'button',
      { class: `chip ${mode === 'page' ? 'on' : ''}`, 'aria-pressed': String(mode === 'page'), title: 'Save this page', onClick: () => setMode('page') },
      'Page',
    ),
    h(
      'button',
      {
        class: `chip ${mode === 'site' ? 'on' : ''}`,
        'aria-pressed': String(mode === 'site'),
        disabled: !site,
        title: site ? `Save the whole site: ${site}` : 'This page has no website address',
        onClick: () => setMode('site'),
      },
      'Site',
    ),
  );
}

async function setMode(m) {
  popup.mode = m;
  if (!popup.titleEdited && popup.titleEl) popup.titleEl.value = defaultTitle(m, popup.tab);
  renderModes();
  updateTarget();
  await renderExists();
  $('#q').focus();
}

export function status(msg, err = false) {
  const s = $('#status');
  s.textContent = msg;
  s.classList.toggle('err', err);
}
