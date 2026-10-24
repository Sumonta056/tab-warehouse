import { ICON_PATHS } from '../constants/icons.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'draggable') el.setAttribute(k, v ? 'true' : 'false');
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function svgIcon(name) {
  const filled = name === 'grip' || name === 'more';
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('fill', filled ? 'currentColor' : 'none');
  el.setAttribute('stroke', filled ? 'none' : 'currentColor');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = ICON_PATHS[name] || '';
  return el;
}

export function highlight(el, text, query) {
  el.replaceChildren();
  if (!query) {
    el.textContent = text;
    return;
  }
  const terms = query
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) {
    el.textContent = text;
    return;
  }
  const re = new RegExp(`(${terms.join('|')})`, 'ig');
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) el.append(text.slice(last, m.index));
    el.append(h('mark', {}, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) el.append(text.slice(last));
}
