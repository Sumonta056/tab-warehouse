import { h } from '../../../ui/dom.js';
import { copyCard } from './copy.js';
import { introCard } from './intro.js';
import { rulesCard } from './rules.js';
import { sitesCard } from './sites.js';
import { tagsState } from './state.js';
import { yourTagsCard } from './your-tags.js';

export function env(c) {
  const root = h('div', { class: 'env-tab' });
  const s = tagsState(c, root);
  s.draw = (focusSel) => {
    root.replaceChildren(introCard(s), yourTagsCard(s), h('div', { class: 'env-cols' }, rulesCard(s), sitesCard(s)), copyCard(s));
    if (focusSel) root.querySelector(focusSel)?.focus();
  };
  s.draw();
  return root;
}
