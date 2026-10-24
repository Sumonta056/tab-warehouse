export function hostOf(url) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '';
  }
}

export function pathKey(url) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return '';
  }
}

export function displayUrl(url) {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function isGithub(url) {
  return hostOf(url) === 'github.com';
}

export function sameAsUrl(title, url) {
  const a = (title || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  return !a || a === displayUrl(url) || a === url;
}

export function normalizeUrl(input) {
  const v = (input || '').trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}
