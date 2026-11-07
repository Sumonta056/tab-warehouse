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
  const noteRow = h('div', { id: 'noteRow', class: 'note-row' }, popup.noteEl);
  noteRow.hidden = true;
  const dueEl = duePicker('');
  popup.dueEl = dueEl;
  dueEl.el.id = 'duePick';
  dueEl.el.hidden = true;
  const toggle = (btn, open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('on', open);
  };
  const noteBtn = h(
    'button',
    {
      type: 'button',
      id: 'noteBtn',
      class: 'tool-btn',
      title: 'Add a note',
      'aria-label': 'Add a note',
      'aria-expanded': 'false',
      'aria-controls': 'noteRow',
      onClick: () => {
        const open = noteRow.hidden;
        noteRow.hidden = !open;
        toggle(noteBtn, open);
        if (open) popup.noteEl.focus();
        else popup.noteEl.value = '';
      },
    },
    svgIcon('note'),
  );
  const dueBtn = h(
    'button',
    {
      type: 'button',
      id: 'dueBtn',
      class: 'tool-btn',
      title: 'Due date',
      'aria-label': 'Due date',
      'aria-expanded': 'false',
      'aria-controls': 'duePick',
      onClick: () => {
        const open = dueEl.el.hidden;
        dueEl.el.hidden = !open;
        toggle(dueBtn, open);
        document.body.classList.toggle('due-open', open);
        if (open) dueEl.focus();
        else dueEl.reset();
      },
    },
    svgIcon('calendar'),
  );
  document.querySelector('#meta').replaceChildren(
    h(
      'div',
      { class: 'tool-row' },
      priPicker(popup.pri, (p) => (popup.pri = p), { dots: true }),
      h('span', { class: 'tool-sep', 'aria-hidden': 'true' }),
      noteBtn,
      dueBtn,
      h('div', { class: 'modes', id: 'modes', role: 'group', 'aria-label': 'Save' }),
    ),
    noteRow,
    dueEl.el,
  );
}
