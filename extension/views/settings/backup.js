import { exportJson, exportHtml } from '../../ui/export.js';
import { importFile } from '../../services/import.js';
import { h } from '../../ui/dom.js';
import { card } from './controls.js';
import { importText } from '../../domain/transfer.js';

export function backup(c) {
  const file = h('input', { type: 'file', id: 'importFile', accept: '.json,.html,.htm', class: 'sr', 'aria-label': 'Import file' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try {
      const r = await importFile(f, c.root, c.settings);
      await c.reload();
      c.toast(importText(r));
    } catch (err) {
      c.toast(`Import failed: ${err.message}`);
    }
    file.value = '';
  });
  return h(
    'div',
    { class: 'set-grid one' },
    h(
      'div',
      { class: 'set-col' },
      card(
        'Export',
        "JSON keeps everything: links, notes, due dates, sidebar order, categories, colors, tags, Home links, icons and background, the look, text sizes and pinned folders. HTML is Chrome's own bookmark format.",
        h(
          'div',
          { class: 'set-row' },
          h('button', { type: 'button', class: 'btn sm', id: 'exportJson', onClick: () => exportJson(c.root, c.secs, c.settings) }, 'Export JSON'),
          h('button', { type: 'button', class: 'btn sm', id: 'exportHtml', onClick: () => exportHtml(c.root, c.secs) }, 'Export HTML'),
        ),
      ),
      card(
        'Import',
        'Import merges. URLs that already exist are skipped.',
        h('button', { type: 'button', class: 'btn sm', id: 'importBtn', onClick: () => file.click() }, 'Import…'),
        file,
      ),
    ),
  );
}
