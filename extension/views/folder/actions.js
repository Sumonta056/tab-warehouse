import { gcalUrl } from '../../domain/due.js';
import { displayUrl } from '../../domain/url.js';
import { openTab } from '../../services/tabs.js';
import { toast } from '../../ui/toast.js';
import { deleteLinks, patchLinkMeta } from '../../state/links.js';
import { renderBody } from './body.js';

export async function removeLinks(bms, msg) {
  const undo = await deleteLinks(bms);
  toast(msg, { label: 'Undo', run: undo });
}

export function deleteLink(bm) {
  return removeLinks([bm], `Deleted “${bm.title || displayUrl(bm.url)}”`);
}

export async function setPri(ctx, id, pri) {
  await patchLinkMeta(id, { pri });
  renderBody(ctx);
}

export async function setDue(ctx, id, due) {
  await patchLinkMeta(id, { due });
  renderBody(ctx);
}

export function openCalendar(bm, meta) {
  openTab({ url: gcalUrl({ title: bm.title, url: bm.url, note: meta?.note, due: meta?.due }) });
}
