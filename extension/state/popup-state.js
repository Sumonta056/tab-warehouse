import { targetUrl } from '../domain/popup.js';

export const popup = {
  settings: null,
  root: null,
  tab: null,
  titleEl: null,
  targetEl: null,
  badgeEl: null,
  noteEl: null,
  dueEl: null,
  pri: null,
  folders: [],
  items: [],
  cursor: 0,
  selId: null,
  mode: 'page',
  query: '',
  titleEdited: false,
  busy: false,
  dup: false,
};

export function target() {
  return targetUrl(popup.mode, popup.tab);
}
