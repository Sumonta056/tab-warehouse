import { PRIS, PRI_NAMES } from '../../constants/priority.js';
import { detectEnv } from '../../domain/env.js';
import { otherVersions } from '../../domain/derive.js';
import { catOf, orderToTop, sectionTargets } from '../../domain/folders.js';
import { tagNames } from '../../domain/tags.js';
import { moveBookmark, removeBookmarkTree } from '../../services/bookmarks.js';
import { openTab } from '../../services/tabs.js';
import { showMenu } from '../../ui/menu.js';
import { toast } from '../../ui/toast.js';
import { state } from '../../state/page-state.js';
import { cleanIcon } from '../../domain/marks.js';
import { saveMark, saveOrder, moveToCategory } from '../../state/folders.js';
import { deleteLink, openCalendar, setDue, setPri } from './actions.js';
import { startEdit } from './edit.js';
import { renameFolder } from './page.js';
import { newPart } from './parts.js';

export function linkMenu(ctx, e, bm, row) {
  const { settings, linkMeta } = state;
  const env = detectEnv(bm, settings.envRules);
  const derived = otherVersions(bm.url, env, settings.hostMap, tagNames(settings));
  const targets = state.query ? [] : sectionTargets(state.current, bm);
  const meta = linkMeta[bm.id];
  showMenu(e, [
    { label: 'Open in new tab', icon: 'external', run: () => openTab({ url: bm.url }) },
    { label: 'Copy URL', icon: 'copy', run: () => navigator.clipboard.writeText(bm.url).then(() => toast('URL copied')) },
    { label: 'Edit title / URL', icon: 'pencil', run: () => startEdit(ctx, bm, row) },
    { label: meta?.note ? 'Edit note' : 'Add note', icon: 'note', run: () => startEdit(ctx, bm, row, 'note') },
    { label: meta?.due ? 'Change due date' : 'Set due date', icon: 'calendar', run: () => startEdit(ctx, bm, row, 'due') },
    ...(meta?.due
      ? [
          { label: 'Add to Google Calendar', icon: 'calendar', run: () => openCalendar(bm, state.linkMeta[bm.id]) },
          { label: 'Clear due date', run: () => setDue(ctx, bm.id, '') },
        ]
      : []),
    '-',
    ...[...PRIS, null]
      .filter((x) => x !== (meta?.pri || null))
      .map((x) => ({ label: x ? `Mark as ${PRI_NAMES[x]}` : 'Clear priority', run: () => setPri(ctx, bm.id, x) })),
    ...(derived.length ? ['-', ...derived.map((d) => ({ label: `Open on ${d.env}`, icon: 'external', run: () => openTab({ url: d.url }) }))] : []),
    ...(targets.length ? ['-', ...targets.map((g) => ({ label: `Move to ${g.title}`, run: () => moveBookmark(bm.id, { parentId: g.node.id }) }))] : []),
    '-',
    { label: 'Delete', icon: 'x', danger: true, run: () => deleteLink(bm) },
  ]);
}

export function folderMenu(ctx, e, s) {
  const { settings } = state;
  const mark = async (key, value, clean) => {
    await saveMark(key, s.id, value, clean);
    ctx.renderNav();
    if (state.current?.id === s.id || state.current?.board) ctx.renderPage();
  };
  const toCategory = async (target) => {
    await moveToCategory(s, target);
    ctx.renderNav();
  };
  showMenu(e, [
    { label: `Open all (${s.all.length})`, icon: 'external', run: () => s.all.forEach((l) => openTab({ url: l.url, active: false })) },
    {
      label: 'Copy all URLs',
      icon: 'copy',
      run: () => navigator.clipboard.writeText(s.all.map((l) => l.url).join('\n')).then(() => toast(`${s.all.length} URLs copied`)),
    },
    ...(s.virtual
      ? []
      : [
          '-',
          { swatches: true, value: settings.folderColors[s.id] || null, pick: (color) => mark('folderColors', color) },
          { icons: true, value: settings.folderIcons[s.id] || null, pick: (icon) => mark('folderIcons', icon, cleanIcon) },
          '-',
          {
            label: 'Rename folder',
            icon: 'pencil',
            run: () => {
              if (state.current?.id !== s.id) {
                ctx.select(s);
              }
              setTimeout(() => {
                const h2 = document.querySelector('#page .head h2');
                if (h2) renameFolder(ctx, s, h2);
              });
            },
          },
          { label: 'New section', icon: 'plus', run: () => newPart(s) },
          {
            label: 'Move to top',
            run: async () => {
              await saveOrder(orderToTop(state.secs, s.id));
              ctx.renderNav();
            },
          },
          ...(settings.categories.length
            ? [
                '-',
                ...settings.categories.filter((c) => c.id !== catOf(settings, s.id)).map((c) => ({ label: `Move to ${c.name}`, run: () => toCategory(c.id) })),
                ...(catOf(settings, s.id) ? [{ label: 'Remove from category', run: () => toCategory(null) }] : []),
              ]
            : []),
          '-',
          {
            label: 'Delete folder…',
            icon: 'x',
            danger: true,
            run: async () => {
              if (confirm(`Delete "${s.title}" and its ${s.all.length} links?`)) {
                await removeBookmarkTree(s.id);
                toast('Folder deleted');
              }
            },
          },
        ]),
  ]);
}
