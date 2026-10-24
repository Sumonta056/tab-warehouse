import { findById } from '../domain/tree.js';
import { homeFolderParent } from '../domain/home.js';
import { createBookmark, getChildren } from './bookmarks.js';
import { saveSettings } from './storage.js';

export async function ensureHomeFolder(tree, settings) {
  const home = settings.home;
  if (home.folderId && findById(tree, home.folderId)) return { settings, created: false };
  const parentId = homeFolderParent(tree).id;
  const kids = await getChildren(parentId);
  const existing = kids.find((c) => !c.url && c.title === 'Home');
  const folder = existing || (await createBookmark({ parentId, title: 'Home' }));
  settings = await saveSettings({ home: { ...home, folderId: folder.id } });
  return { settings, created: !existing };
}
