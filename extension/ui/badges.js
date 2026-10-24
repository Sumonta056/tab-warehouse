import { isGithub } from '../domain/url.js';
import { h } from './dom.js';

export function tagBadge(name, customTags = []) {
  const t = customTags.find((x) => x.name === name);
  return h('span', { class: `badge ${t ? 'tag' : name}`, dataset: t ? { tag: t.color } : null }, name);
}

export function linkBadge(env, url, customTags = []) {
  if (env) return tagBadge(env, customTags);
  return isGithub(url) ? h('span', { class: 'badge GH' }, 'GH') : null;
}
