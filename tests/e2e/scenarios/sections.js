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
];
