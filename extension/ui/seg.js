import { h } from './dom.js';

export function seg(label, opts, val, onPick) {
  return h(
    'span',
    { class: 'seg', role: 'group', 'aria-label': label },
    ...opts.map(([v, l]) => h('button', { class: v === val ? 'on' : '', 'aria-pressed': v === val ? 'true' : 'false', onClick: () => onPick(v) }, l)),
  );
}
