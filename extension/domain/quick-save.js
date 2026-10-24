import { findSaved } from './duplicates.js';
import { findById, resolveRoot } from './tree.js';

export function quickSaveTarget(settings, tree) {
  const root = resolveRoot(tree, settings);
  const last = settings.lastSaveFolder && findById(root, settings.lastSaveFolder);
  return last && !last.url ? last.id : root.id;
}

export function quickSave(settings, tree, tab) {
  if (!tab?.url || !/^(https?|file):/i.test(tab.url)) return { kind: 'skip' };
  const hits = findSaved(tree, tab.url);
  if (hits.length) return { kind: 'dup', hits };
  const parentId = quickSaveTarget(settings, tree);
  const folder = findById(tree, parentId);
  return { kind: 'save', parentId, folder: folder.title || 'Bookmarks', title: tab.title || tab.url, url: tab.url };
}

export function quickSaveBadge(r) {
  if (r.kind === 'save') return { text: '✓', color: '#1e8e3e', title: `Saved to ${r.folder}` };
  if (r.kind === 'dup') return { text: '!', color: '#e8710a', title: `Already in ${r.hits[0].path}` };
  if (r.kind === 'error') return { text: '–', color: '#5f6368', title: `Could not save: ${r.message}` };
  return { text: '–', color: '#5f6368', title: 'This page cannot be saved' };
}
