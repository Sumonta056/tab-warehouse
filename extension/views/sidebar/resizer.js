import { SIDE_WIDTH } from '../../constants/limits.js';
import { clampSideWidth } from '../../domain/sizes.js';
import { saveSettings } from '../../services/storage.js';
import { state } from '../../state/page-state.js';

export function setSideWidth(w) {
  const px = clampSideWidth(w);
  document.documentElement.style.setProperty('--side-w', `${px}px`);
  const r = document.querySelector('#resizer');
  if (r) r.setAttribute('aria-valuenow', String(px));
  return px;
}

export function bindResizer() {
  const r = document.querySelector('#resizer');
  const side = document.querySelector('.side');
  r.setAttribute('aria-valuemin', String(SIDE_WIDTH.min));
  r.setAttribute('aria-valuemax', String(SIDE_WIDTH.max));
  setSideWidth(state.settings.sideWidth);
  const persist = (px) => {
    state.settings.sideWidth = px;
    saveSettings({ sideWidth: px });
  };
  r.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      r.setPointerCapture(e.pointerId);
    } catch {}
    document.body.classList.add('resizing');
    const x0 = e.clientX,
      w0 = side.getBoundingClientRect().width;
    let raf = 0,
      next = w0;
    const move = (ev) => {
      next = w0 + ev.clientX - x0;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          setSideWidth(next);
        });
    };
    const up = () => {
      r.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
      document.body.classList.remove('resizing');
      persist(setSideWidth(next));
    };
    r.addEventListener('pointermove', move);
    r.addEventListener('pointerup', up, { once: true });
    r.addEventListener('pointercancel', up, { once: true });
  });
  r.addEventListener('dblclick', () => persist(setSideWidth(SIDE_WIDTH.initial)));
  let keyTimer;
  r.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const px = setSideWidth(side.getBoundingClientRect().width + (e.key === 'ArrowLeft' ? -16 : 16));
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => persist(px), 300);
  });
}
