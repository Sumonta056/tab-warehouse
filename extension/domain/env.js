import { ENVS } from '../constants/envs.js';
import { hostOf } from './url.js';

const ENV_WORDS = ENVS.map((e) => [e, new RegExp(`\\b${e}\\b`)]);

export function explainEnv(bm, rules) {
  const host = hostOf(bm.url);
  const rule = rules.findIndex((r) => r.pattern && host.includes(r.pattern.toLowerCase()));
  if (rule >= 0) return { env: rules[rule].env, rule };
  const t = (bm.title || '').toUpperCase();
  for (const [e, re] of ENV_WORDS) if (re.test(t)) return { env: e, rule: -1, word: e };
  if (/\bDEV\b/.test(t)) return { env: 'TEST', rule: -1, word: 'DEV' };
  return { env: '', rule: -1 };
}

export function detectEnv(bm, rules) {
  return explainEnv(bm, rules).env;
}

export function envGroups(links, rules, tags) {
  const by = {};
  for (const bm of links) (by[detectEnv(bm, rules) || 'NONE'] ||= []).push(bm);
  return [...tags, 'NONE'].filter((e) => by[e]).map((env) => ({ env, links: by[env] }));
}

export function explainWhy(x, rules) {
  if (x.rule >= 0) return `Rule ${x.rule + 1} matched: the address contains “${rules[x.rule].pattern}”.`;
  return rules.length ? 'No rule matches this address.' : 'There are no rules yet.';
}
