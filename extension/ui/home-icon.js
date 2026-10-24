import { WEB_ICON } from '../constants/urls.js';
import { letterIcon } from '../domain/icons.js';
import { tileIconSrcs, faviconUrl } from '../services/favicon.js';
import { h } from './dom.js';

let globe = null;

function pixels(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 16, 16);
  return g.getImageData(0, 0, 16, 16).data.join();
}

function globePixels() {
  globe ||= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(pixels(img));
    img.onerror = () => resolve('');
    img.src = faviconUrl('https://favicon.invalid/', 64);
  });
  return globe;
}

export function homeIconImg(bm, box, iconMap) {
  const srcs = tileIconSrcs(bm, iconMap);
  const favicon = faviconUrl('', 64).split('?')[0];
  const img = h('img', { class: 'wait', src: srcs.shift(), alt: '', loading: 'lazy', decoding: 'async' });
  const next = () => {
    const src = srcs.shift();
    if (src) {
      img.src = src;
      return;
    }
    img.remove();
    box.classList.add('letter');
    box.textContent = letterIcon(bm);
  };
  img.addEventListener('error', next);
  img.addEventListener('load', async () => {
    if (img.src.startsWith(WEB_ICON) && img.naturalWidth <= 16) return next();
    if (img.src.startsWith(favicon) && pixels(img) === (await globePixels())) return next();
    img.classList.remove('wait');
  });
  box.append(img);
  return box;
}
