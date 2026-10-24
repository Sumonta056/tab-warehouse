import { NOTE_MAX } from '../../constants/limits.js';
import { h, svgIcon } from '../../ui/dom.js';
import { priPicker, duePicker } from '../../ui/pickers.js';
import { popup } from '../../state/popup-state.js';

export function renderMeta() {
  if (!popup.tab?.url) return;
  popup.noteEl = h('input', {
    id: 'note',
    class: 'field note-line',
    type: 'text',
    autocomplete: 'off',
    maxlength: String(NOTE_MAX),
    placeholder: 'Add a note…',
    'aria-label': 'Note',
  });
  const dueEl = duePicker('');
  popup.dueEl = dueEl;
  dueEl.el.id = 'duePick';
  dueEl.el.hidden = true;
  const dueBtn = h(
    'button',
    {
      type: 'button',
      id: 'dueBtn',
      class: 'due-btn',
      'aria-expanded': 'false',
      'aria-controls': 'duePick',
      onClick: () => {
        const open = dueEl.el.hidden;
        dueEl.el.hidden = !open;
        dueBtn.setAttribute('aria-expanded', String(open));
        dueBtn.classList.toggle('on', open);
        document.body.classList.toggle('due-open', open);
        if (open) dueEl.focus();
        else dueEl.reset();
      },
    },
    svgIcon('calendar'),
    'Due',
  );
  document.querySelector('#meta').replaceChildren(
    h(
      'div',
      { class: 'pri-row' },
      priPicker(popup.pri, (p) => (popup.pri = p)),
      dueBtn,
    ),
    h('div', { class: 'opt-row' }, popup.noteEl, h('div', { class: 'modes', id: 'modes', role: 'group', 'aria-label': 'Save' })),
    dueEl.el,
  );
}
