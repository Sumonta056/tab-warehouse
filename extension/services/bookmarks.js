const EVENTS = ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered'];

export async function getTree() {
  const [root] = await chrome.bookmarks.getTree();
  return root;
}

export async function getSubTree(id) {
  const [node] = await chrome.bookmarks.getSubTree(id);
  return node;
}

export function getChildren(id) {
  return chrome.bookmarks.getChildren(id);
}

export function createBookmark(props) {
  return chrome.bookmarks.create(props);
}

export function updateBookmark(id, changes) {
  return chrome.bookmarks.update(id, changes);
}

export function moveBookmark(id, dest) {
  return chrome.bookmarks.move(id, dest);
}

export function removeBookmark(id) {
  return chrome.bookmarks.remove(id);
}

export function removeBookmarkTree(id) {
  return chrome.bookmarks.removeTree(id);
}

export function onBookmarksChanged(fn) {
  for (const ev of EVENTS) chrome.bookmarks[ev].addListener(fn);
}
