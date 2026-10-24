import { base } from '../fixtures.js';

const area = 'ui';
const mod = (t, name) => t.w.eval(`import('/extension/ui/${name}.js')`);
const lab = (t) => {
  t.$('#uiLab')?.remove();
  const box = t.d.createElement('div');
  box.id = 'uiLab';
  Object.assign(box.style, { position: 'fixed', top: '0', left: '0', width: '240px', zIndex: '50', background: 'var(--bg)' });
  t.d.body.append(box);
  return box;
};
const block = (t, box, name) => {
  const el = t.d.createElement('div');
  el.textContent = name;
  Object.assign(el.style, { height: '40px', display: 'block' });
  box.append(el);
  return el;
};
const dayOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const pressed = (els) => els.map((b) => b.getAttribute('aria-pressed'));

export default [
  {
    area,
    name: 'ui toast: one toast at a time, Undo runs once and closes it, a plain toast leaves after 2.5 s',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { toast } = await mod(t, 'toast');
      let undone = 0;
      toast('First');
      toast('Removed rule', { label: 'Undo', run: () => undone++ });
      t.eq(t.$$('.toast').length, 1, 'a new toast replaces the old one');
      const el = t.$('.toast');
      t.eq(el.getAttribute('role'), 'status', 'announced as status');
      t.eq(el.firstChild.textContent, 'Removed rule', 'message as text');
      t.eq(el.querySelector('button')?.textContent, 'Undo', 'action button');
      await t.sleep(2700);
      t.ok(t.$('.toast'), 'an undo toast stays longer than 2.5 s');
      t.click(el.querySelector('button'));
      t.eq(undone, 1, 'Undo ran once');
      t.ok(!t.$('.toast'), 'Undo closes the toast');
      toast('Saved');
      t.ok(!t.$('.toast button'), 'no button without an action');
      await t.sleep(2700);
      t.ok(!t.$('.toast'), 'a plain toast is gone after 2.5 s');
    },
  },
  {
    area,
    name: 'ui menu: opens inside the window, runs one item and closes; a new menu or an outside click closes the old one',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { showMenu, menuOpen } = await mod(t, 'menu');
      const ran = [];
      const items = [{ label: 'Rename', icon: 'pencil', run: () => ran.push('rename') }, '-', { label: 'Delete', danger: true, run: () => ran.push('delete') }];
      showMenu({ clientX: t.w.innerWidth - 4, clientY: t.w.innerHeight - 4 }, items);
      const m = t.$('.menu');
      t.eq(m?.getAttribute('role'), 'menu', 'role menu');
      t.eq(t.menuLabels(), ['Rename', 'Delete'], 'items in order');
      t.ok(m.querySelector('hr'), 'separator');
      t.ok(m.querySelector('button.danger')?.textContent === 'Delete', 'danger item marked');
      t.ok(m.querySelector('button svg'), 'item icon');
      const r = m.getBoundingClientRect();
      t.ok(r.right <= t.w.innerWidth - 7 && r.bottom <= t.w.innerHeight - 7, 'kept inside the window');
      t.ok(menuOpen(), 'menuOpen() while open');
      t.menu('Rename');
      t.eq(ran, ['rename'], 'item ran once');
      t.ok(!t.$('.menu') && !menuOpen(), 'closed after a choice');

      showMenu({ clientX: 20, clientY: 20 }, items);
      showMenu({ clientX: 30, clientY: 30 }, items);
      t.eq(t.$$('.menu').length, 1, 'only one menu at a time');
      await t.sleep(20);
      t.d.body.click();
      t.ok(!t.$('.menu') && !menuOpen(), 'an outside click closes it');
      t.eq(ran, ['rename'], 'an outside click runs nothing');
    },
  },
  {
    area,
    name: 'ui menu: the color row marks the current color and picks one',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { showMenu } = await mod(t, 'menu');
      const picked = [];
      showMenu({ clientX: 20, clientY: 20 }, [{ swatches: true, value: 'red', pick: (c) => picked.push(c) }]);
      const sws = t.$$('.menu .sw');
      t.eq(sws[0].getAttribute('aria-label'), 'Default color', 'default first');
      t.eq(
        sws.filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.dataset.color),
        ['red'],
        'current color checked',
      );
      t.click(t.$('.menu .sw[data-color="blue"]'));
      t.eq(picked, ['blue'], 'picked blue');
      t.ok(!t.$('.menu'), 'closed');
      showMenu({ clientX: 20, clientY: 20 }, [{ swatches: true, value: 'blue', pick: (c) => picked.push(c) }]);
      t.click(t.$('.menu .sw.none'));
      t.eq(picked, ['blue', null], 'Default gives null');
    },
  },
  {
    area,
    name: 'ui pickers: the priority picker presses one choice and reports it',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { priPicker } = await mod(t, 'pickers');
      const got = [];
      const box = priPicker('med', (p) => got.push(p));
      lab(t).append(box);
      const buttons = () => [...box.querySelectorAll('button')];
      t.eq(
        buttons().map((b) => b.textContent),
        ['None', 'High', 'Medium', 'Low'],
        'choices',
      );
      t.eq(pressed(buttons()), ['false', 'false', 'true', 'false'], 'Medium pressed');
      t.click(buttons()[1]);
      t.eq(pressed(buttons()), ['false', 'true', 'false', 'false'], 'High pressed');
      t.click(buttons()[0]);
      t.eq(got, ['high', null], 'reports high, then null for None');
      t.eq(pressed(buttons()), ['true', 'false', 'false', 'false'], 'None pressed');
    },
  },
  {
    area,
    name: 'ui pickers: due quick chips set the date and press their chip; ✕ clears; a saved date shows its boxes',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { duePicker } = await mod(t, 'pickers');
      const box = lab(t);
      const p = duePicker('');
      box.append(p.el);
      const chips = () => [...p.el.querySelectorAll('.due-q:not(.due-pick-date)')];
      const cal = p.el.querySelector('.due-cal-box');
      t.eq(
        [...p.el.querySelectorAll('.due-q')].map((b) => b.textContent),
        ['Today', 'Tomorrow', 'Next week', 'Pick a date…'],
        'quick chips',
      );
      t.ok(p.el.querySelector('.due-row').hidden && p.el.querySelector('.due-sum').hidden, 'no boxes and no summary without a date');
      t.ok(cal.disabled, 'calendar box off without a date');
      t.eq(p.value(), '', 'empty');
      t.click(chips()[1]);
      t.eq(p.value(), dayOffset(1), 'Tomorrow sets the date');
      t.eq(pressed(chips()), ['false', 'true', 'false'], 'Tomorrow pressed');
      t.ok(!p.el.querySelector('.due-sum').hidden && !cal.disabled, 'summary and calendar box show');
      t.ok(
        p.el.querySelector('.due-now').classList.contains('soon') && p.el.querySelector('.due-now').textContent.startsWith('Due '),
        'summary chip says when, colored as soon',
      );
      t.click(chips()[2]);
      t.eq(p.value(), dayOffset(7), 'Next week');
      t.eq(pressed(chips()), ['false', 'false', 'true'], 'Next week pressed');
      cal.checked = true;
      t.ok(p.calendar(), 'calendar() is on with a date and the box checked');
      t.click(p.el.querySelector('.due-clr'));
      t.eq(p.value(), '', '✕ clears');
      t.ok(!cal.checked && cal.disabled && !p.calendar(), 'calendar box unchecked and off');
      t.ok(!p.el.querySelector('.due-quick').hidden, 'quick chips back');

      const saved = duePicker('2026-11-01T10:30');
      box.append(saved.el);
      t.eq(saved.value(), '2026-11-01T10:30', 'keeps the saved value');
      t.ok(!saved.el.querySelector('.due-row').hidden, 'date and time boxes show');
      t.ok(saved.el.querySelector('.due-quick').hidden, 'quick chips hide while the boxes show');
      saved.focus();
      t.eq(t.d.activeElement, saved.date, 'focus() goes to the date box');
      p.focus();
      t.eq(t.d.activeElement, chips()[0], 'focus() without a date goes to Today');
    },
  },
  {
    area,
    name: 'ui h(): text and attributes stay text, never markup; highlight() marks terms safely',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { h, highlight } = await mod(t, 'dom');
      const evil = '<img src=x onerror="window.__pwned=1"><b>bold</b>';
      let clicks = 0;
      const el = h(
        'div',
        {
          class: 'a b',
          dataset: { id: '7' },
          title: evil,
          hidden: true,
          disabled: false,
          'aria-label': null,
          draggable: true,
          style: { color: 'red' },
          onClick: () => clicks++,
        },
        evil,
        5,
        null,
        false,
        ['x', h('i', {}, 'y')],
      );
      lab(t).append(el);
      t.eq(el.querySelector('img, b'), null, 'no elements from text');
      t.eq(el.textContent, `${evil}5xy`, 'text kept as written');
      t.eq(el.getAttribute('title'), evil, 'attribute kept as text');
      t.eq(el.className, 'a b', 'class');
      t.eq(el.dataset.id, '7', 'dataset');
      t.eq(el.getAttribute('hidden'), '', 'true gives an empty attribute');
      t.ok(!el.hasAttribute('disabled') && !el.hasAttribute('aria-label'), 'false and null are left out');
      t.eq(el.getAttribute('draggable'), 'true', 'draggable is the string true');
      t.ok(!h('span', { draggable: false }).hasAttribute('draggable'), 'draggable false is left out');
      t.eq(el.style.color, 'red', 'style object');
      el.click();
      t.eq(clicks, 1, 'onClick listener');

      const span = h('span');
      highlight(span, `${evil} shop`, 'img SHOP');
      t.eq(span.querySelectorAll('img, b').length, 0, 'highlight adds no elements from text');
      t.eq(
        [...span.querySelectorAll('mark')].map((m) => m.textContent),
        ['img', 'shop'],
        'terms marked, any case',
      );
      t.eq(span.textContent, `${evil} shop`, 'text unchanged');
      highlight(span, 'a.b (c)', '(c)');
      t.eq(span.querySelector('mark')?.textContent, '(c)', 'regex characters are plain text');
      highlight(span, 'plain', '');
      t.ok(!span.querySelector('mark') && span.textContent === 'plain', 'no query, no marks');
      await t.sleep(50);
      t.ok(!t.w.__pwned, 'nothing ran');
    },
  },
  {
    area,
    name: 'ui dnd: one drop mark at a time, dragleave to the outside unmarks, headerDrag reports the dropped side',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const { markHalf, markInto, clearMarks, unmarkOnLeave, headerDrag } = await mod(t, 'dnd');
      const box = lab(t);
      const [a, b, c] = ['A', 'B', 'C'].map((n) => block(t, box, n));
      const ev = (el, y) => ({
        prevented: false,
        preventDefault() {
          this.prevented = true;
        },
        dataTransfer: {},
        clientY: el.getBoundingClientRect().top + y,
      });
      const marks = () => [a, b, c].map((x) => [...x.classList].filter((k) => k.startsWith('drop-')).join(' '));
      const e1 = ev(a, 5);
      markHalf(a, e1);
      t.eq(marks(), ['drop-before', '', ''], 'upper half marks before');
      t.ok(e1.prevented && e1.dataTransfer.dropEffect === 'move', 'accepts the drop as a move');
      markHalf(b, ev(b, 35));
      t.eq(marks(), ['', 'drop-after', ''], 'lower half marks after and clears the old mark');
      markInto(c, ev(c, 20));
      t.eq(marks(), ['', '', 'drop-into'], 'into');
      clearMarks();
      t.eq(marks(), ['', '', ''], 'clearMarks');

      const inner = t.d.createElement('span');
      c.append(inner);
      unmarkOnLeave(c, 'drop-into');
      c.classList.add('drop-into');
      c.dispatchEvent(new t.w.DragEvent('dragleave', { bubbles: true, relatedTarget: inner }));
      t.ok(c.classList.contains('drop-into'), 'leaving to a child keeps the mark');
      c.dispatchEvent(new t.w.DragEvent('dragleave', { bubbles: true, relatedTarget: a }));
      t.ok(!c.classList.contains('drop-into'), 'leaving to the outside removes it');

      const slot = {};
      const drops = [];
      for (const [el, id] of [
        [a, 'A'],
        [b, 'B'],
      ])
        headerDrag(el, slot, 'cat', id, (from, after) => drops.push([from, id, after]));
      headerDrag(c, slot, 'part', 'C', () => drops.push('wrong kind'));
      t.ok(t.drag(a, b, 'after'), 'A onto B accepted');
      t.ok(t.drag(b, a, 'before'), 'B onto A accepted');
      t.ok(!t.drag(a, a), 'a header does not take itself');
      t.ok(!t.drag(a, c), 'another kind refuses');
      await t.sleep(20);
      t.eq(
        drops,
        [
          ['A', 'B', true],
          ['B', 'A', false],
        ],
        'onDrop(from, after)',
      );
      t.eq(slot.drag, null, 'drag slot cleared');
      t.eq(marks(), ['', '', ''], 'no marks left');
    },
  },
];
