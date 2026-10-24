import { ENV_HINTS } from '../../../constants/envs.js';
import { TRY_SAMPLES } from '../../../constants/tags.js';
import { deriveUrl, findSiteRow } from '../../../domain/derive.js';
import { explainEnv, explainWhy } from '../../../domain/env.js';
import { hostOf, normalizeUrl } from '../../../domain/url.js';
import { h } from '../../../ui/dom.js';

let envTryUrl = TRY_SAMPLES[1];

export function introCard(s) {
  const input = h('input', { type: 'text', id: 'envTry', value: envTryUrl, spellcheck: 'false', 'aria-label': 'A link to try' });
  const out = h('div', { class: 'env-out', 'aria-live': 'polite' });
  s.updateTry = () => {
    const url = normalizeUrl(envTryUrl);
    const x = explainEnv({ url, title: '' }, s.rules);
    const why = explainWhy(x, s.rules);
    const host = hostOf(url);
    const row = findSiteRow(s.map, host, s.names());
    const others = row
      ? s
          .names()
          .filter((e) => (row[e] || '').toLowerCase() !== host)
          .map((e) =>
            h(
              'div',
              { class: `env-other ${row[e] ? '' : 'miss'}` },
              s.envBadge(e),
              row[e] ? h('span', { class: 'u' }, deriveUrl(url, e, [row], s.names()) || '') : 'Not set in step 2',
            ),
          )
      : [h('div', { class: 'env-other miss' }, s.map.length ? 'This site is not in step 2 yet.' : 'Fill in step 2 to see links to the other versions.')];
    out.replaceChildren(
      h('div', { class: 'env-result' }, s.envBadge(x.env), h('div', { class: 't' }, h('div', { class: 'u' }, url || '—'), h('div', { class: 'why' }, why))),
      h('p', { class: 'set-label' }, 'Same page in the other versions'),
      h('div', { class: 'env-others' }, ...others),
    );
  };
  input.addEventListener('input', () => {
    envTryUrl = input.value;
    s.updateTry();
  });
  s.updateTry();
  return h(
    'div',
    { class: 'set-card env-intro' },
    h(
      'div',
      {},
      h('h3', {}, 'What is this?'),
      h(
        'p',
        {},
        'Many websites have more than one version of the same site: the live site that customers use, and copies for testing. This section helps you tell them apart.',
      ),
      h('p', {}, h('b', {}, '1. Tags by address. '), 'Each link gets a colored tag, so you can see at a glance which version it opens.'),
      h(
        'p',
        {},
        h('b', {}, '2. Same site in each version. '),
        'When the extension knows the addresses of all versions, it can open the same page in another version with one click.',
      ),
      h('div', { class: 'env-legend' }, ...s.names().flatMap((e) => [s.envBadge(e), h('span', {}, `${s.plain(e)} — ${ENV_HINTS[e] || 'your tag'}`)])),
      h('p', { class: 'sub' }, 'Do not use more than one version of a site? You can leave this section empty.'),
    ),
    h(
      'div',
      { class: 'env-try' },
      h('p', { class: 'set-label' }, 'Try it'),
      input,
      h(
        'div',
        { class: 'env-samples' },
        ...TRY_SAMPLES.map((u) =>
          h(
            'button',
            {
              type: 'button',
              class: 'chip',
              onClick: () => {
                envTryUrl = u;
                input.value = u;
                s.updateTry();
              },
            },
            u.replace(/^https?:\/\//, ''),
          ),
        ),
      ),
      out,
    ),
  );
}
