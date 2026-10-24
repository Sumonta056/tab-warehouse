import { ENVS, ENV_NAMES } from '../../../constants/envs.js';
import { dropIndex } from '../../../domain/tags.js';
import { tagBadge } from '../../../ui/badges.js';
import { h } from '../../../ui/dom.js';

let envDrag = null;

export const refill = (list, next) => list.splice(0, list.length, ...next);

export function tagsState(c, root) {
  const s = {
    c,
    root,
    rules: c.settings.envRules.map((r) => ({ ...r })),
    map: c.settings.hostMap.map((r) => ({ ...r })),
    tags: (c.settings.customTags || []).map((t) => ({ ...t })),
    updateTry: () => {},
    draw: () => {},
  };
  s.saveRules = () => c.save({ envRules: s.rules });
  s.saveMap = () => c.save({ hostMap: s.map });
  s.saveTags = () => c.save({ customTags: s.tags });
  s.names = () => [...ENVS, ...s.tags.map((t) => t.name)];
  s.plain = (e) => ENV_NAMES[e] || s.tags.find((t) => t.name === e)?.plain || e;
  s.envBadge = (e) => (e ? tagBadge(e, s.tags) : h('span', { class: 'badge none' }, 'No tag'));

  s.envSelect = (value, label, onChange) => {
    const sel = h('select', { 'aria-label': label }, ...s.names().map((e) => h('option', { value: e, selected: e === value }, `${e} · ${s.plain(e)}`)));
    const paint = () => {
      const t = s.tags.find((x) => x.name === sel.value);
      sel.className = `env-sel ${t ? 'tag' : sel.value}`;
      if (t) sel.dataset.tag = t.color;
      else delete sel.dataset.tag;
    };
    paint();
    sel.addEventListener('change', () => {
      paint();
      onChange(sel.value);
    });
    return sel;
  };

  s.sortable = (row, grip, kind, i, label, move) => {
    const clear = () => root.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
    const mine = () => envDrag?.kind === kind && envDrag.i !== i;
    grip.addEventListener('dragstart', (e) => {
      envDrag = { kind, i };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', label);
      e.dataTransfer.setDragImage?.(row, 10, 10);
      row.classList.add('dragging');
    });
    grip.addEventListener('dragend', () => {
      envDrag = null;
      row.classList.remove('dragging');
      clear();
    });
    row.addEventListener('dragover', (e) => {
      if (!mine()) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const b = row.getBoundingClientRect();
      clear();
      row.classList.add(e.clientY > b.top + b.height / 2 ? 'drop-after' : 'drop-before');
    });
    row.addEventListener('drop', (e) => {
      if (!mine()) return;
      e.preventDefault();
      const from = envDrag.i,
        after = row.classList.contains('drop-after');
      envDrag = null;
      move(from, dropIndex(from, i, after));
    });
  };

  s.removeWithUndo = (list, i, what, save) => {
    const [item] = list.splice(i, 1);
    save();
    s.draw();
    c.toast(`Removed ${what}`, {
      label: 'Undo',
      run: () => {
        list.splice(i, 0, item);
        save();
        s.draw();
      },
    });
  };

  return s;
}
