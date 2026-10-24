import { reorderCategories } from '../../domain/folders.js';
import { h, svgIcon } from '../../ui/dom.js';
import { clearMarks, headerDrag, markInto, unmarkOnLeave } from '../../ui/dnd.js';
import { showMenu } from '../../ui/menu.js';
import { toast } from '../../ui/toast.js';
import { state, openView } from '../../state/page-state.js';
import { saveCats, moveToCategory } from '../../state/folders.js';

async function save(ctx, patch) {
  await saveCats(patch);
  ctx.renderNav();
}

export function catHeader(ctx, { cat, items }) {
  const hasOn = cat?.closed && items.some((s) => s.id === openView()?.id);
  const label = [h('span', { class: 't' }, cat ? cat.name : 'No category'), h('span', { class: 'n' }, `(${items.length})`)];
  const el = h(
    'div',
    {
      class: `cat ${cat?.closed ? 'closed' : ''} ${hasOn ? 'has-on' : ''}`,
      dataset: cat?.color ? { color: cat.color } : null,
      draggable: !!cat,
      title: cat ? 'Drag to reorder categories' : null,
    },
    cat
      ? h(
          'button',
          { class: 'cat-toggle', 'aria-expanded': String(!cat.closed), title: cat.closed ? 'Expand' : 'Collapse', onClick: () => toggleCat(ctx, cat.id) },
          svgIcon('chevron'),
          ...label,
        )
      : h('span', { class: 'cat-label' }, ...label),
    cat &&
      h(
        'button',
        {
          class: 'more',
          'aria-label': `Category menu for ${cat.name}`,
          title: 'More',
          onClick: (e) => {
            e.stopPropagation();
            catMenu(ctx, e, cat);
          },
        },
        svgIcon('more'),
      ),
  );
  if (cat) {
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      catMenu(ctx, e, cat);
    });
    headerDrag(el, state, 'cat', cat.id, (from, after) => {
      const cats = reorderCategories(state.settings.categories, from, cat.id, after);
      if (!cats) return;
      return save(ctx, { categories: cats });
    });
  }
  el.addEventListener('dragover', (e) => {
    if (state.drag?.kind !== 'folder') return;
    markInto(el, e);
  });
  unmarkOnLeave(el, 'drop-into');
  el.addEventListener('drop', async (e) => {
    if (state.drag?.kind !== 'folder') return;
    e.preventDefault();
    clearMarks();
    const s = state.secs.find((x) => x.id === state.drag.id);
    if (!s) return;
    await moveToCategory(s, cat?.id || null);
    ctx.renderNav();
    toast(`Moved to ${cat ? cat.name : 'No category'}`);
  });
  return el;
}

function toggleCat(ctx, id) {
  save(ctx, { categories: state.settings.categories.map((c) => (c.id === id ? { ...c, closed: !c.closed } : c)) });
}

export async function newCategory(ctx) {
  const name = prompt('Category name')?.trim();
  if (!name) return;
  await save(ctx, { categories: [...state.settings.categories, { id: `c${Date.now()}`, name, closed: false }] });
}

function catMenu(ctx, e, ref) {
  const cats = state.settings.categories.map((c) => ({ ...c }));
  const i = cats.findIndex((c) => c.id === ref.id);
  const cat = cats[i];
  if (!cat) return;
  const move = (d) => {
    cats.splice(i, 1);
    cats.splice(i + d, 0, cat);
    save(ctx, { categories: cats });
  };
  showMenu(e, [
    {
      swatches: true,
      value: cat.color || null,
      pick: (color) => {
        cat.color = color;
        save(ctx, { categories: cats });
      },
    },
    '-',
    {
      label: 'Rename category',
      icon: 'pencil',
      run: () => {
        const name = prompt('Category name', cat.name)?.trim();
        if (name) {
          cat.name = name;
          save(ctx, { categories: cats });
        }
      },
    },
    ...(i > 0 ? [{ label: 'Move up', run: () => move(-1) }] : []),
    ...(i < cats.length - 1 ? [{ label: 'Move down', run: () => move(1) }] : []),
    '-',
    {
      label: 'Delete category…',
      icon: 'x',
      danger: true,
      run: () => {
        if (!confirm(`Delete category "${cat.name}"? Its folders move to No category. No bookmarks are deleted.`)) return;
        const folderCat = Object.fromEntries(Object.entries(state.settings.folderCat).filter(([, c]) => c !== cat.id));
        save(ctx, { categories: cats.filter((c) => c !== cat), folderCat });
        toast(`Category "${cat.name}" deleted`);
      },
    },
  ]);
}
