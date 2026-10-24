export async function getTree() {
  const [root] = await chrome.bookmarks.getTree();
  return root;
}
