import { exportData, netscapeHtml, backupName } from '../domain/transfer.js';
import { loadLinkMeta, loadHomeStore } from '../services/storage.js';
import { getChildren } from '../services/bookmarks.js';

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
  const [meta, { icons, bg }, kids] = await Promise.all([
    loadLinkMeta(),
    loadHomeStore(),
    settings.home?.folderId ? getChildren(settings.home.folderId).catch(() => []) : [],
  ]);
  const data = exportData(root, secs, settings, meta, { homeLinks: kids.filter((k) => k.url), homeIcons: icons, homeBg: bg });
  download(backupName('json'), JSON.stringify(data, null, 2), 'application/json');
}

export function exportHtml(root, secs) {
  download(backupName('html'), netscapeHtml(root, secs), 'text/html');
}
