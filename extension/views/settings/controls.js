import { h } from '../../ui/dom.js';

const timers = {};

export function later(key, fn, ms = 300) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, ms);
}

export function card(title, sub, ...kids) {
  return h('div', { class: 'set-card' }, h('h3', {}, title), sub ? h('p', { class: 'sub' }, sub) : null, ...kids);
}
export function field(label, ...ctl) {
  return h('label', { class: 'set-f' }, h('span', {}, label), ...ctl);
}
export function range(label, value, min, max, unit, onInput, disabled = false) {
  const out = h('output', {}, `${value}${unit}`);
  const input = h('input', { type: 'range', min, max, value, 'aria-label': label, disabled });
  input.addEventListener('input', () => {
    out.textContent = `${input.value}${unit}`;
    onInput(Number(input.value));
  });
  return field(label, h('span', { class: 'set-rng' }, input, out));
}
export function toggle(label, checked, onChange) {
  const input = h('input', { type: 'checkbox', class: 'switch', role: 'switch', checked: !!checked, 'aria-label': label });
  input.addEventListener('change', () => onChange(input.checked));
  return field(label, input);
}
