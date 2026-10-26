import { PAGES } from '../../constants/pages.js';
import { folderGroups, orderStep } from '../../domain/folders.js';
import { markAttrs } from '../../domain/marks.js';
import { createBookmark, moveBookmark } from '../../services/bookmarks.js';
import { saveSettings } from '../../services/storage.js';
import { h, markIcon, svgIcon } from '../../ui/dom.js';
import { clearMarks, markHalf, markInto, unmarkOnLeave } from '../../ui/dnd.js';
import { toast } from '../../ui/toast.js';
import { state, setState, openView } from '../../state/page-state.js';
import { saveOrder, moveFolder } from '../../state/folders.js';
import { catHeader } from './categories.js';

const nav = () => document.querySelector('#nav');

export function renderNav(ctx) {
  const { settings, secs } = state;
  setState({ navSearch: !!state.query });
  const open = openView();
  for (const v of PAGES) {
    const btn = document.querySelector(`#${v.id}Btn`);
    btn.classList.toggle('on', open === v);
    btn.setAttribute('aria-current', open === v ? 'page' : 'false');
  }
  const gear = document.querySelector('#settingsBtn');
  gear.classList.toggle('on', !!open?.settings);
  gear.setAttribute('aria-pressed', String(!!open?.settings));
  const box = nav();
  box.replaceChildren();
  if (!settings.categories.length) {
    secs.forEach((s) => box.append(navItem(ctx, s)));
    return;
  }
  for (const g of folderGroups(settings, secs)) {
    if (!g.cat && !g.items.length) continue;
    box.append(catHeader(ctx, g));
    if (g.cat?.closed) continue;
    g.items.forEach((s) => box.append(navItem(ctx, s)));
    if (g.cat && !g.items.length) box.append(h('div', { class: 'cat-empty' }, 'Drag folders here'));
  }
  secs.filter((s) => s.virtual).forEach((s) => box.append(navItem(ctx, s)));
}

function navItem(ctx, s) {
  const el = h(
    'button',
    {
      class: `nav ${s.id === openView()?.id ? 'on' : ''} ${s.virtual ? 'unsorted' : ''}`,
      ...markAttrs(!s.virtual && state.settings.folderColors[s.id], { id: s.id }),
      draggable: !s.virtual,
      title: s.virtual ? 'Loose links directly under the root' : 'Drag to reorder · Alt+↑/↓ to move',
      onClick: () => ctx.select(s),
      onKeydown: (e) => {
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          moveSection(ctx, s, e.key === 'ArrowUp' ? -1 : 1);
        }
      },
    },
    h('span', { class: 'grip', 'aria-hidden': 'true' }, svgIcon('grip')),
    s.virtual ? null : markIcon(state.settings.folderIcons[s.id]),
    h('span', { class: 't' }, s.title),
    h('span', { class: 'n' }, String(s.all.length)),
  );
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ctx.folderMenu(e, s);
  });
  bindNavDrag(ctx, el, s);
  return el;
}

async function moveSection(ctx, s, delta) {
  const ids = orderStep(state.settings, state.secs, s, delta);
  if (!ids) return;
  await saveOrder(ids);
  renderNav(ctx);
  nav()
    .querySelector(`.nav[data-id="${CSS.escape(s.id)}"]`)
    ?.focus();
}

export function bindNavDrag(ctx, el, s) {
  if (!s.virtual) {
    el.addEventListener('dragstart', (e) => {
      state.drag = { kind: 'folder', id: s.id };
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', s.title);
      requestAnimationFrame(() => el.classList.add('dragging'));
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      clearMarks();
      state.drag = null;
    });
  }

  el.addEventListener('dragover', (e) => {
    const { drag } = state;
    if (!drag) return;
    if (drag.kind === 'folder' && drag.id !== s.id && !s.virtual) markHalf(el, e);
    else if (drag.kind === 'link' && drag.parentId !== s.node.id) markInto(el, e);
  });
  unmarkOnLeave(el, 'drop-before', 'drop-after', 'drop-into');
  el.addEventListener('drop', async (e) => {
    const { drag } = state;
    if (!drag) return;
    e.preventDefault();
    if (drag.kind === 'folder') {
      const after = el.classList.contains('drop-after');
      clearMarks();
      await moveFolder(drag.id, s.id, after);
      renderNav(ctx);
      toast('Sidebar order saved');
    } else if (drag.kind === 'link') {
      clearMarks();
      await moveBookmark(drag.id, { parentId: s.node.id });
      toast(`Moved to ${s.title}`);
    }
  });
}

export async function newFolder() {
  const title = prompt('Folder name');
  if (!title) return;
  const f = await createBookmark({ parentId: state.root.id, title });
  state.settings.lastFolder = f.id;
  await saveSettings({ lastFolder: f.id });
}
