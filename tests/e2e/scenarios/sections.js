import { base, F, L } from '../fixtures.js';

const area = 'sections';
const twoSections = () =>
  base({
    tasks: F('20', 'Sprint tasks', [
      L('21', 'Read title #160', 'https://tracker.example.com/issues/160'),
      L('22', 'Keyboard #150', 'https://tracker.example.com/issues/150'),
      F('23', 'Blocked', [L('24', 'Old #100', 'https://tracker.example.com/issues/100')]),
      F('25', 'In progress', []),
    ]),
  });
const nested = (settings = {}) =>
  base({
    settings,
    tasks: F('20', 'Sprint tasks', [
      L('21', 'Read title #160', 'https://tracker.example.com/issues/160'),
      F('23', 'Blocked', [
        L('24', 'Old #100', 'https://tracker.example.com/issues/100'),
        F('26', 'Vendor', [
          L('27', 'Vendor #9', 'https://tracker.example.com/issues/9'),
          F('28', 'Waiting', [L('29', 'Reply #3', 'https://tracker.example.com/issues/3')]),
        ]),
      ]),
      F('25', 'In progress', []),
    ]),
  });
const headers = (t) =>
  t.$$('#page .grp.part .part-toggle').map((b) =>
    [...b.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join(''),
  );

export default [
  {
    area,
    name: 'subfolders render as section headers; No section comes last',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.eq(
        t.$$('#page .grp.part .part-toggle').map((b) => b.textContent),
        ['Blocked', 'No section'],
        'headers',
      );
      t.eq(t.rowIds(), ['24', '21', '22'], 'rows grouped by section');
      t.eq(t.$('.head .cnt').textContent, '3 links', 'head count includes sections');
    },
  },
  {
    area,
    name: 'folder without subfolders keeps the plain list (no headers)',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Shop API');
      t.eq(t.$$('#page .grp.part').length, 0, 'no section headers');
    },
  },
  {
    area,
    name: 'collapse a section hides its rows and is saved per folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.part-toggle'));
      await t.settle();
      t.eq(t.settings().folders['20'].closed['23'], true, 'saved');
      t.ok(!t.row('24'), 'row hidden');
      t.eq(t.part('Blocked').querySelector('.part-toggle').getAttribute('aria-expanded'), 'false', 'aria-expanded');
    },
  },
  {
    area,
    name: 'New section creates a real Chrome subfolder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.answer('In progress');
      t.click(t.$('.newPart'));
      await t.settle();
      t.ok(
        t.node('20').children.some((c) => c.title === 'In progress' && !c.url),
        'subfolder created',
      );
      t.ok(t.part('In progress'), 'header shown');
    },
  },
  {
    area,
    name: 'drop a link on a section header moves it into that subfolder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.drag(t.row('21'), t.part('Blocked'));
      await t.settle();
      t.eq(t.node('21').parentId, '23', 'moved into Blocked');
      t.drag(t.row('24'), t.part('No section'));
      await t.settle();
      t.eq(t.node('24').parentId, '20', 'moved to No section');
    },
  },
  {
    area,
    name: 'drop between rows of another section (Manual sort)',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.drag(t.row('22'), t.row('24'), 'before');
      await t.settle();
      t.eq(t.kids('23'), ['22', '24'], 'inserted before #100');
    },
  },
  {
    area,
    name: 'link menu lists Move to <section> except the current one',
    page: 'newtab',
    fixture: twoSections,
    async run(t) {
      await t.folder('Sprint tasks');
      t.context(t.row('24'));
      const labels = t.menuLabels();
      t.ok(labels.includes('Move to In progress') && labels.includes('Move to No section') && !labels.includes('Move to Blocked'), labels.join(', '));
      t.menu('Move to In progress');
      await t.settle();
      t.eq(t.node('24').parentId, '25', 'moved');
    },
  },
  {
    area,
    name: 'section color is saved in settings and shown on the header',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.more'));
      t.click(t.$('.menu .sw[data-color="red"]'));
      await t.settle();
      t.eq(t.settings().partColors['23'], 'red', 'saved');
      t.eq(t.part('Blocked').dataset.color, 'red', 'header colored');
      t.ok(t.part('Blocked').querySelector('.dot'), 'dot shown');
      t.click(t.part('Blocked').querySelector('.more'));
      t.click(t.$('.menu .sw.none'));
      await t.settle();
      t.ok(!t.settings().partColors['23'], 'default color clears it');
    },
  },
  {
    area,
    name: 'section custom color is saved as a hex and shown through --c',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.more'));
      const inp = t.$('.menu .sw.custom');
      inp.value = '#12abcd';
      inp.dispatchEvent(new t.w.Event('change', { bubbles: true }));
      await t.settle();
      t.eq(t.settings().partColors['23'], '#12abcd', 'saved');
      t.eq(t.part('Blocked').dataset.color, 'custom', 'marked custom');
      t.eq(t.part('Blocked').style.getPropertyValue('--c'), '#12abcd', 'color variable set');
      t.eq(t.w.getComputedStyle(t.part('Blocked')).color, 'rgb(18, 171, 205)', 'header shows the color');
    },
  },
  {
    area,
    name: 'section icon shows on the folder-page header and the Board section header',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.more'));
      t.click(t.$('.menu .ico[aria-label="Icon 🐞"]'));
      await t.settle();
      t.eq(t.settings().partIcons['23'], '🐞', 'saved');
      t.eq(t.part('Blocked').querySelector('.mark-icon')?.textContent, '🐞', 'header icon');
      t.click(t.$('#boardBtn'));
      await t.settle();
      t.eq(t.$('.bsec[data-part="23"] .mark-icon')?.textContent, '🐞', 'Board section icon');
    },
  },
  {
    area,
    name: 'a bad stored section color is ignored',
    page: 'newtab',
    fixture: () => base({ settings: { partColors: { 23: 'red; background: url(x)' } } }),
    async run(t) {
      await t.folder('Sprint tasks');
      t.ok(!t.part('Blocked').dataset.color, 'no color');
      t.ok(!t.part('Blocked').getAttribute('style'), 'no style');
    },
  },
  {
    area,
    name: 'rename section updates the Chrome folder title',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.answer('Stuck');
      t.click(t.part('Blocked').querySelector('.more'));
      t.menu('Rename section');
      await t.settle();
      t.eq(t.node('23').title, 'Stuck', 'renamed');
    },
  },
  {
    area,
    name: 'Move down / Move up reorder sections in Chrome',
    page: 'newtab',
    fixture: twoSections,
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.more'));
      t.menu('Move down');
      await t.settle();
      t.eq(
        t.kids('20').filter((id) => ['23', '25'].includes(id)),
        ['25', '23'],
        'moved down',
      );
      t.click(t.part('Blocked').querySelector('.more'));
      t.menu('Move up');
      await t.settle();
      t.eq(
        t.kids('20').filter((id) => ['23', '25'].includes(id)),
        ['23', '25'],
        'moved up',
      );
    },
  },
  {
    area,
    name: 'drag a section header to reorder sections',
    page: 'newtab',
    fixture: twoSections,
    async run(t) {
      await t.folder('Sprint tasks');
      t.drag(t.part('In progress'), t.part('Blocked'), 'before');
      await t.settle();
      t.eq(
        t.kids('20').filter((id) => ['23', '25'].includes(id)),
        ['25', '23'],
        'In progress first',
      );
      t.eq(
        t.$$('#page .grp.part .part-toggle').map((b) => b.textContent),
        ['In progress', 'Blocked', 'No section'],
        'headers follow',
      );
    },
  },
  {
    area,
    name: 'delete section moves its links to No section, then removes the folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.more'));
      t.menu('Delete section…');
      await t.settle();
      t.ok(!t.node('23'), 'folder removed');
      t.eq(t.node('24')?.parentId, '20', 'link kept in the parent folder');
    },
  },
  {
    area,
    name: 'filter searches all sections and hides sections without matches',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.type(t.$('.toolbar input[type="search"]'), '#100');
      await t.settle();
      t.eq(
        t.$$('#page .grp.part .part-toggle').map((b) => b.textContent),
        ['Blocked'],
        'only matching section',
      );
      t.eq(t.rowIds(), ['24'], 'one row');
    },
  },
  {
    area,
    name: 'Tag matrix includes links inside sections',
    page: 'newtab',
    fixture: () =>
      base({
        tasks: F('20', 'Sprint tasks', [
          F('23', 'Blocked', [L('24', 'Shop PROD', 'https://shop.example.com/api/y'), L('26', 'Shop TEST', 'https://test.shop.example.com/api/y')]),
        ]),
      }),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.$$('.seg button').find((b) => b.textContent === 'Tag matrix'));
      await t.settle();
      t.eq(t.$$('.matrix tbody tr').length, 1, 'matrix row from section links');
    },
  },
  {
    area,
    name: 'a link 3 levels deep counts in the sidebar and is found by search',
    page: 'newtab',
    fixture: () =>
      base({
        tasks: F('20', 'Sprint tasks', [
          L('21', 'Read title #160', 'https://tracker.example.com/issues/160'),
          F('23', 'Blocked', [F('26', 'Vendor', [L('27', 'Vendor #9', 'https://tracker.example.com/issues/9')])]),
        ]),
      }),
    async run(t) {
      t.eq(t.nav('Sprint tasks').querySelector('.n').textContent, '2', 'sidebar count');
      t.type(t.$('#q'), 'vendor');
      await t.settle();
      t.eq(t.rowIds(), ['27'], 'one hit');
      t.eq(t.row('27').querySelector('.crumb')?.textContent, 'Sprint tasks › Blocked › Vendor', 'crumb');
    },
  },
  {
    area,
    name: 'nested Sections render under their parent with an indent',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.eq(headers(t), ['Blocked', 'Vendor', 'Waiting', 'In progress', 'No section'], 'headers');
      t.eq(
        t.$$('#page .grp.part').map((g) => g.dataset.depth),
        ['0', '1', '2', '0', '0'],
        'depths',
      );
      t.eq(t.rowIds(), ['24', '27', '29', '21'], 'rows');
      t.eq(t.row('29').dataset.depth, '2', 'row depth follows its Section');
      t.eq(t.part('Blocked').children[2].textContent, '3', 'Blocked counts its child Sections');
      const pad = (title) => parseFloat(getComputedStyle(t.part(title)).marginLeft);
      t.ok(pad('Vendor') > pad('Blocked') && pad('Waiting') > pad('Vendor'), 'indent grows per level');
    },
  },
  {
    area,
    name: 'collapse a parent Section hides its child Sections',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Blocked').querySelector('.part-toggle'));
      await t.settle();
      t.ok(!t.part('Vendor') && !t.part('Waiting'), 'child Sections hidden');
      t.ok(!t.row('24') && !t.row('27') && !t.row('29'), 'rows hidden');
      t.click(t.part('Blocked').querySelector('.part-toggle'));
      await t.settle();
      t.ok(t.part('Vendor'), 'Vendor back');
    },
  },
  {
    area,
    name: 'drop a link on a deep Section header moves it there',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.drag(t.row('21'), t.part('Waiting'));
      await t.settle();
      t.eq(t.node('21').parentId, '28', 'moved into Waiting');
    },
  },
  {
    area,
    name: 'drag a Section header into another parent',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.drag(t.part('In progress'), t.part('Vendor'), 'before');
      await t.settle();
      t.eq(t.node('25').parentId, '23', 'moved under Blocked');
      t.eq(
        t.kids('23').filter((id) => ['25', '26'].includes(id)),
        ['25', '26'],
        'before Vendor',
      );
    },
  },
  {
    area,
    name: 'a Section cannot be dropped into its own child Section',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      const src = t.part('Blocked');
      const tgt = t.part('Waiting');
      const dt = new t.w.DataTransfer();
      const r = tgt.getBoundingClientRect();
      const fire = (el, type) =>
        el.dispatchEvent(new t.w.DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 10, clientY: r.top + 2 }));
      fire(src, 'dragstart');
      fire(tgt, 'dragenter');
      const accepted = !fire(tgt, 'dragover');
      t.ok(!accepted, 'dragover refused');
      t.ok(!tgt.classList.contains('drop-before') && !tgt.classList.contains('drop-after'), 'no drop mark');
      fire(tgt, 'drop');
      fire(src, 'dragend');
      t.ok(!t.drag(t.part('Blocked'), t.part('Blocked'), 'before'), 'refused on itself');
      await t.settle();
      t.eq(t.node('23').parentId, '20', 'Blocked stays');
    },
  },
  {
    area,
    name: 'New section inside makes a child Section',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.answer('Later');
      t.click(t.part('Vendor').querySelector('.more'));
      t.menu('New section inside');
      await t.settle();
      t.ok(
        t.node('26').children.some((c) => c.title === 'Later' && !c.url),
        'child folder created',
      );
      t.eq(t.part('Later')?.dataset.depth, '2', 'header under Vendor');
    },
  },
  {
    area,
    name: 'delete a Section moves its links and child Sections into its parent',
    page: 'newtab',
    fixture: () => nested({ partColors: { 28: 'red' } }),
    async run(t) {
      await t.folder('Sprint tasks');
      let asked = '';
      t.w.confirm = (msg) => ((asked = msg), true);
      t.click(t.part('Vendor').querySelector('.more'));
      t.menu('Delete section…');
      await t.settle();
      t.eq(asked, 'Delete section "Vendor"? Its 1 link and 1 section move to Blocked.', 'confirm text');
      t.ok(!t.node('26'), 'Vendor removed');
      t.eq(t.node('27').parentId, '23', 'link in Blocked');
      t.eq(t.node('28').parentId, '23', 'Waiting in Blocked');
      t.eq(t.part('Waiting')?.dataset.color, 'red', 'Waiting keeps its color');
    },
  },
  {
    area,
    name: 'Move up / Move down use the siblings of the Section',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.click(t.part('Waiting').querySelector('.more'));
      let labels = t.menuLabels();
      t.ok(!labels.includes('Move up') && !labels.includes('Move down'), `Waiting: ${labels.join(', ')}`);
      t.click(t.part('Blocked').querySelector('.more'));
      labels = t.menuLabels();
      t.ok(!labels.includes('Move up') && labels.includes('Move down'), `Blocked: ${labels.join(', ')}`);
    },
  },
  {
    area,
    name: 'link menu lists every Section by its path',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.context(t.row('21'));
      const labels = t.menuLabels();
      t.ok(labels.includes('Move to Blocked › Vendor › Waiting'), labels.join(', '));
    },
  },
  {
    area,
    name: 'filter shows the parents of a deep match',
    page: 'newtab',
    fixture: () => nested(),
    async run(t) {
      await t.folder('Sprint tasks');
      t.type(t.$('.toolbar input[type="search"]'), 'reply');
      await t.settle();
      t.eq(headers(t), ['Blocked', 'Vendor', 'Waiting'], 'headers');
      t.eq(t.rowIds(), ['29'], 'rows');
    },
  },
];
