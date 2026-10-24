import { exportData, netscapeHtml, backupName } from '../domain/transfer.js';
import { loadLinkMeta } from '../services/storage.js';

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportJson(root, secs, settings) {
  const meta = await loadLinkMeta();
  download(backupName('json'), JSON.stringify(exportData(root, secs, settings, meta), null, 2), 'application/json');
}

export function exportHtml(root, secs) {
  download(backupName('html'), netscapeHtml(root, secs), 'text/html');
}
