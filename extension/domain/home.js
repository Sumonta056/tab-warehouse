import { findById } from './tree.js';

export function homeLinks(tree, settings) {
  const folder = findById(tree, settings.home.folderId);
  return { folder, links: (folder?.children || []).filter((c) => c.url) };
}

export function homeFolderParent(tree) {
  return tree.children?.[1] || tree.children?.[0] || tree;
}

export function editableIconUrl(value) {
  return value?.startsWith('data:') ? '' : value || '';
}
