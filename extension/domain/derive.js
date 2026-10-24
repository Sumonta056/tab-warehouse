import { ENVS } from '../constants/envs.js';
import { hostOf } from './url.js';

export function deriveUrl(url, targetEnv, hostMap, tags = ENVS) {
  const host = hostOf(url);
  for (const row of hostMap) {
    const fromEnv = tags.find((e) => (row[e] || '').toLowerCase() === host);
    if (!fromEnv || fromEnv === targetEnv) continue;
    const toHost = row[targetEnv];
    if (!toHost) return null;
    try {
      const u = new URL(url);
      u.host = toHost;
      if (toHost.startsWith('localhost')) u.protocol = 'http:';
      return u.toString();
    } catch {
      return null;
    }
  }
  return null;
}

export function switchTargets(url, hostMap, tags = ENVS) {
  const host = hostOf(url);
  const row = host && hostMap.find((r) => tags.some((e) => (r[e] || '').toLowerCase() === host));
  if (!row) return null;
  const from = tags.find((e) => (row[e] || '').toLowerCase() === host);
  return {
    from,
    to: tags
      .filter((e) => e !== from && row[e])
      .map((env) => ({ env, url: deriveUrl(url, env, hostMap, tags) }))
      .filter((x) => x.url),
  };
}
