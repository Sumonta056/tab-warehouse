import { brandName } from '../../domain/settings.js';
import { todayBadge, todayCount, todayList } from '../../domain/today.js';
import { svgIcon } from '../../ui/dom.js';
import { state } from '../../state/page-state.js';

const ICONS = [
  ['#searchIcon', 'search'],
  ['#gearIcon', 'gear'],
  ['#plusIcon', 'plus'],
  ['#catIcon', 'plus'],
  ['#homeIcon', 'home'],
  ['#boardIcon', 'board'],
  ['#scheduleIcon', 'calendar'],
  ['#ghIcon', 'github'],
  ['#webIcon', 'globe'],
  ['#fabIcon', 'home'],
];

export function paintIcons() {
  for (const [sel, name] of ICONS) document.querySelector(sel).append(svgIcon(name));
}

export function renderBrand() {
  const name = brandName(state.settings);
  document.querySelector('#brandTitle').textContent = name;
  document.title = name;
}

export function renderTodayCount() {
  const el = document.querySelector('#todayCnt');
  const count = todayCount(todayList(state.secs, state.linkMeta));
  const badge = todayBadge(count);
  const btn = el.parentElement;
  el.hidden = !count.n;
  el.textContent = badge.text;
  el.classList.toggle('overdue', count.overdue);
  btn.setAttribute('aria-label', badge.label);
  btn.title = badge.title;
}
