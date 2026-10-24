import { h } from './dom.js';

let toastEl = null,
  toastTimer = null;

export function toast(msg, action) {
  toastEl?.remove();
  clearTimeout(toastTimer);
  toastEl = h(
    'div',
    { class: 'toast', role: 'status' },
    msg,
    action
      ? h(
          'button',
          {
            onClick: () => {
              action.run();
              toastEl.remove();
            },
          },
          action.label,
        )
      : null,
  );
  document.body.append(toastEl);
  toastTimer = setTimeout(() => toastEl?.remove(), action ? 8000 : 2500);
}
