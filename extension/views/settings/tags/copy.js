import { EXAMPLE_RULES, EXAMPLE_MAP } from '../../../constants/tags.js';
import { envText, parseEnvText, importSummary } from '../../../domain/env-text.js';
import { h } from '../../../ui/dom.js';

export function copyCard(s) {
  const c = s.c;
  const ta = h('textarea', {
    id: 'envText',
    rows: 6,
    spellcheck: 'false',
    placeholder: 'Paste text that you copied from this section, then click Import.',
    'aria-label': 'Text to copy or import',
  });
  const copy = async () => {
    ta.value = envText(s.rules, s.map, s.tags);
    ta.select();
    try {
      await Promise.race([navigator.clipboard.writeText(ta.value), new Promise((_, no) => setTimeout(no, 1000))]);
      c.toast('Copied. You can paste it anywhere.');
    } catch {
      c.toast('Press ⌘C (Ctrl+C) to copy the selected text.');
    }
  };
  const doImport = async () => {
    const p = parseEnvText(
      ta.value,
      s.tags.map((t) => t.name),
    );
    if (!p.rules.length && !p.hostMap.length && !p.tags.length) {
      c.toast('Nothing to import. Paste text that you copied from this section.');
      return;
    }
    const old = { envRules: s.rules, hostMap: s.map, customTags: s.tags };
    s.rules = p.rules;
    s.map = p.hostMap;
    s.tags = [...s.tags, ...p.tags];
    await c.save({ envRules: s.rules, hostMap: s.map, customTags: s.tags });
    s.draw();
    c.toast(importSummary(p, s.rules, s.map), {
      label: 'Undo',
      run: async () => {
        s.rules = old.envRules;
        s.map = old.hostMap;
        s.tags = old.customTags;
        await c.save(old);
        s.draw();
      },
    });
  };
  return h(
    'div',
    { class: 'set-card env-copy' },
    h('h3', {}, 'Copy or paste these settings'),
    h(
      'p',
      { class: 'sub' },
      'Copy both lists as text to keep a backup or to give them to a teammate. To load them, paste the text and click Import. Import replaces both lists, and you can undo it.',
    ),
    ta,
    h(
      'div',
      { class: 'set-row env-actions' },
      h('button', { type: 'button', class: 'btn sm', id: 'envCopy', onClick: copy }, 'Copy to clipboard'),
      h('button', { type: 'button', class: 'btn primary sm', id: 'envImport', onClick: doImport }, 'Import'),
    ),
    h('details', {}, h('summary', {}, 'What does the text look like?'), h('pre', {}, envText(EXAMPLE_RULES.slice(0, 2), EXAMPLE_MAP))),
  );
}
