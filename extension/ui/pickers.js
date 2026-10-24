import { DUE_QUICK } from '../constants/due.js';
import { PRIS, PRI_NAMES } from '../constants/priority.js';
import { dueLabel, dueQuickDate, dueState, isDue } from '../domain/due.js';
import { h, svgIcon } from './dom.js';

export function priPicker(value, onPick) {
  const box = h('div', { class: 'pri-pick', role: 'group', 'aria-label': 'Priority' });
  const draw = (v) =>
    box.replaceChildren(
      ...[null, ...PRIS].map((p) =>
        h(
          'button',
          {
            type: 'button',
            class: `${p ? `pri-${p}` : ''} ${v === p ? 'on' : ''}`,
            'aria-pressed': String(v === p),
            dataset: { pri: p || 'none' },
            onClick: () => {
              draw(p);
              onPick(p);
            },
          },
          p ? h('span', { class: 'pri-dot' }) : null,
          p ? PRI_NAMES[p] : 'None',
        ),
      ),
    );
  draw(value || null);
  return box;
}

export function duePicker(due) {
  const [d = '', t = ''] = isDue(due) ? due.split('T') : [];
  const date = h('input', { type: 'date', class: 'due-in due-date', value: d, 'aria-label': 'Due date' });
  const time = h('input', { type: 'time', class: 'due-in due-time', value: t, 'aria-label': 'Due time (optional)' });
  const cal = h('input', { type: 'checkbox', class: 'due-cal-box' });
  const calLbl = h('label', { class: 'due-cal', title: 'Also add to Google Calendar' }, cal, 'Google Calendar');
  const value = () => (date.value ? (time.value ? `${date.value}T${time.value}` : date.value) : '');
  const inputs = h('div', { class: 'due-row' }, date, time);
  inputs.hidden = !d;
  const showInputs = (box) => {
    inputs.hidden = false;
    box.focus();
  };
  const quick = DUE_QUICK.map(([label, days]) => ({
    days,
    b: h(
      'button',
      {
        type: 'button',
        class: 'chip due-q',
        'aria-pressed': 'false',
        onClick: () => {
          date.value = dueQuickDate(days);
          sync();
        },
      },
      label,
    ),
  }));
  const pick = h(
    'button',
    {
      type: 'button',
      class: 'chip due-q due-pick-date',
      onClick: () => {
        showInputs(date);
        try {
          date.showPicker();
        } catch {}
      },
    },
    'Pick a date…',
  );
  const label = h('span', { class: 'due-now' }, svgIcon('calendar'), h('span', {}));
  const addTime = h(
    'button',
    {
      type: 'button',
      class: 'due-add-time',
      onClick: () => {
        showInputs(time);
        sync();
      },
    },
    '+ Time',
  );
  const sync = () => {
    const v = value();
    cal.disabled = !date.value;
    if (!date.value) cal.checked = false;
    calLbl.classList.toggle('off', !date.value);
    clear.hidden = !date.value && !time.value;
    for (const { b, days } of quick) b.setAttribute('aria-pressed', String(!!date.value && date.value === dueQuickDate(days)));
    sum.hidden = !isDue(v);
    label.className = `due-now ${dueState(v) || ''}`;
    label.lastChild.textContent = dueLabel(v);
    addTime.hidden = !inputs.hidden || !!time.value;
    quickRow.hidden = !inputs.hidden;
  };
  const reset = () => {
    date.value = '';
    time.value = '';
    inputs.hidden = true;
    sync();
  };
  const clear = h('button', { type: 'button', class: 'due-clr', 'aria-label': 'Clear due date', onClick: reset }, '✕');
  const sum = h('div', { class: 'due-sum' }, label, addTime, calLbl, clear);
  const quickRow = h('div', { class: 'due-quick' }, ...quick.map((q) => q.b), pick);
  date.addEventListener('input', sync);
  time.addEventListener('input', sync);
  sync();
  const el = h('div', { class: 'due-pick', role: 'group', 'aria-label': 'Due date' }, quickRow, inputs, sum);
  const focus = () => (inputs.hidden ? quick[0].b : date).focus();
  return { el, date, value, reset, focus, calendar: () => cal.checked && isDue(value()) };
}
