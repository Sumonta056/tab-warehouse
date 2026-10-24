export function clearMarks() {
  document.querySelectorAll('.drop-before, .drop-after, .drop-into').forEach((n) => n.classList.remove('drop-before', 'drop-after', 'drop-into'));
}

export function markHalf(el, e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const r = el.getBoundingClientRect();
  clearMarks();
  el.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
}

export function markInto(el, e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  clearMarks();
  el.classList.add('drop-into');
}

export function unmarkOnLeave(el, ...classes) {
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove(...classes);
  });
}

export function headerDrag(el, slot, kind, id, onDrop) {
  el.addEventListener('dragstart', (e) => {
    if (e.target !== el) return;
    slot.drag = { kind, id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    requestAnimationFrame(() => el.classList.add('dragging'));
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    clearMarks();
    slot.drag = null;
  });
  el.addEventListener('dragover', (e) => {
    if (slot.drag?.kind !== kind || slot.drag.id === id) return;
    markHalf(el, e);
  });
  el.addEventListener('drop', async (e) => {
    if (slot.drag?.kind !== kind || slot.drag.id === id) return;
    e.preventDefault();
    const after = el.classList.contains('drop-after');
    const from = slot.drag.id;
    clearMarks();
    slot.drag = null;
    await onDrop(from, after);
  });
}
