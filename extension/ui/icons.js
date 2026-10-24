import { letterIcon } from '../domain/icons.js';
import { faviconUrl } from '../services/favicon.js';
import { h } from './dom.js';

export function iconEl(bm, showFavicons) {
  const ico = h('span', { class: 'ico' });
  if (showFavicons) {
    const img = h('img', { src: faviconUrl(bm.url), alt: '' });
    img.addEventListener('error', () => {
      img.remove();
      ico.textContent = letterIcon(bm);
    });
    ico.append(img);
  } else ico.textContent = letterIcon(bm);
  return ico;
}
