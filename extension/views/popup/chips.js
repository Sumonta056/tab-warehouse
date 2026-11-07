import { saveChips, togglePinIn } from '../../domain/popup.js';
import { saveSettings } from '../../services/storage.js';
import { h, svgIcon } from '../../ui/dom.js';
import { showMenu } from '../../ui/menu.js';
import { toast } from '../../ui/toast.js';
import { popup } from '../../state/popup-state.js';
import { openTo, renderFolders } from './folders.js';

let chips = [];

export function renderChips() {
  chips = popup.query ? [] : saveChips(popup.folders, popup.settings);
  const box = document.querySelector('#chips');
  box.hidden = !chips.length;
  box.replaceChildren(...chips.map(chipEl));
}

function chipEl(c) {
  return h(
    'button',
    {
      type: 'button',
      class: `chip save-chip ${c.pinned ? 'pinned' : 'recent'}`,
      dataset: { id: c.id },
      title: c.tip,
      'aria-keyshortcuts': `Alt+${c.n}`,
      onClick: () => pickChip(c.id),
      onContextmenu: (e) => {
        if (!c.pinned) return;
        e.preventDefault();
        showMenu(e, [{ label: 'Unpin', run: () => togglePinned(c.id) }]);
      },
    },
    c.pinned && svgIcon('pin'),
    h('span', { class: 'ct' }, c.title),
    h('span', { class: 'ck', 'aria-hidden': 'true' }, String(c.n)),
  );
}

export function markChips() {
  document.querySelectorAll('#chips .save-chip').forEach((el) => el.classList.toggle('on', el.dataset.id === popup.selId));
}

function pickChip(id) {
  popup.selId = id;
  openTo(id);
  renderFolders();
  document.querySelector('#q').focus();
}

export function chipKey(e) {
  if (!e.altKey || e.shiftKey || e.ctrlKey || e.metaKey || e.target?.id !== 'q') return false;
  const m = /^Digit(\d)$/.exec(e.code || '');
  const c = m && chips[Number(m[1]) - 1];
  if (!c) return false;
  pickChip(c.id);
  return true;
}

export async function togglePinned(id) {
  const r = togglePinIn(popup.settings.savePins, id, new Set(popup.folders.map((f) => f.id)));
  if (r.error) {
    toast(r.error);
    return;
  }
  popup.settings = { ...popup.settings, savePins: r.pins };
  renderFolders();
  await saveSettings({ savePins: r.pins });
}
