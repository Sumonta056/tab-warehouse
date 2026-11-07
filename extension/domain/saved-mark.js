import { findSaved } from './duplicates.js';
import { savedPath } from './popup.js';
import { SAVED_MARK_COLOR, SAVED_MARK_TEXT, SAVED_MARK_PAGE } from '../constants/commands.js';

export function savedMark(tree, url, folders = []) {
  if (!url || !SAVED_MARK_PAGE.test(url)) return { saved: false, path: '' };
  const hits = findSaved(tree, url);
  if (!hits.length) return { saved: false, path: '' };
  return { saved: true, path: savedPath(folders, hits[0]) };
}

export function savedMarkBadge(mark) {
  if (!mark.saved) return null;
  return { text: SAVED_MARK_TEXT, color: SAVED_MARK_COLOR, title: `Saved in ${mark.path}` };
}
