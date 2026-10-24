import { base, F, L } from '../fixtures.js';

const area = 'board';
const withCats = (board) =>
  base({
    settings: {
      categories: [
        { id: 'c1', name: 'Daily working', closed: true },
        { id: 'c2', name: 'Tools', closed: false },
      ],
      folderCat: { 20: 'c1', 30: 'c1' },
      order: ['20', '30', '40', '50'],
      ...(board ? { board } : {}),
    },
  });

const openBoard = async (t) => {
  t.click(t.$('#boardBtn'));
  await t.settle();
};
const col = (t, id) => t.$(`#page .bcol[data-id="${id}"]`);
const colIds = (t) => t.$$('#page .bcol').map((c) => c.dataset.id);
const card = (t, id) => t.$(`#page .bcard[data-id="${id}"]`);
const cardIds = (t, id) => t.$$('.bcard', col(t, id)).map((c) => c.dataset.id);
const lanes = (t) => t.$$('#page .blane-h').map((l) => l.textContent);

export default [
  {
    area,
    name: 'board: cards keep their full height, never overlap, and show at most 2 title lines and 1 URL line',
    page: 'newtab',
    fixture: () =>
      base({
        extraRoot: [
          F(
            '80',
            'Long',
            Array.from({ length: 14 }, (_, i) =>
              L(
                `8${String(i).padStart(2, '0')}`,
                `claude-code-best-practices/guides/case-studies.md at main · MuhammadUsmanGhani number ${i}`,
                `https://github.com/someone/claude-code-best-practices/blob/main/guides/case-studies/very/long/path/${i}.md?learningPath=applied-ai`,
              ),
            ),
          ),
        ],
      }),
    async run(t) {
      await openBoard(t);
      const cards = t.$$('.bcard', col(t, '80'));
      t.eq(cards.length, 14, 'all cards');
      t.ok(col(t, '80').querySelector('.bcards').scrollHeight > col(t, '80').querySelector('.bcards').clientHeight, 'column scrolls');
      const bad = cards.filter((c) => c.scrollHeight > c.clientHeight + 1);
      t.eq(bad.length, 0, 'no card content spills out of its card');
      const overlaps = cards.slice(1).filter((c, i) => c.getBoundingClientRect().top < cards[i].getBoundingClientRect().bottom);
      t.eq(overlaps.length, 0, 'cards do not overlap');
      const c = cards[0];
      const lh = (el) => parseFloat(getComputedStyle(el).lineHeight);
      t.ok(c.querySelector('.bcard-ttl').getBoundingClientRect().height <= lh(c.querySelector('.bcard-ttl')) * 2 + 1, 'title at most 2 lines');
      t.ok(c.querySelector('.bcard-url').getBoundingClientRect().height <= lh(c.querySelector('.bcard-url')) + 1, 'URL on 1 line');
      t.ok(c.getAttribute('title').endsWith('learningPath=applied-ai'), 'full URL in the tooltip');
    },
  },
  {
    area,
    name: 'board: the Board button opens the Board, is marked on and the Home button floats',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      const btn = t.$('#boardBtn');
      t.eq(btn.getAttribute('aria-label'), 'Board', 'accessible name');
      t.ok(btn.getBoundingClientRect().height >= 28 && btn.getBoundingClientRect().width >= 36, 'at least 28 px tall');
      t.eq(btn.previousElementSibling?.id, 'homeBtn', 'right after the Home button');
      t.ok(!btn.classList.contains('on'), 'off on Home');
      await openBoard(t);
      t.eq(t.$('.head h2')?.textContent, 'Board', 'Board heading');
      t.ok(t.$('#page').classList.contains('board-mode'), 'page in board mode');
      t.ok(btn.classList.contains('on'), 'marked on');
      t.eq(btn.getAttribute('aria-current'), 'page', 'aria-current');
      t.ok(!t.$('#homeBtn').classList.contains('on'), 'Home not marked');
      t.ok(!t.$('#homeFab').hidden, 'floating Home button visible');
      t.type(t.$('#q'), 'shop');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Search', 'search results replace the Board');
      await openBoard(t);
      t.eq(t.$('#q').value, '', 'search cleared');
      t.eq(t.$('.head h2')?.textContent, 'Board', 'Board after search');
    },
  },
  {
    area,
    name: 'board: Home and Settings switch away; Settings Done and Escape return to the Board',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.ok(t.$('#settingsView'), 'settings open');
      t.ok(!t.$('#boardBtn').classList.contains('on'), 'board button off in Settings');
      t.click(t.$('.set-done'));
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Board', 'Done returns to the Board');
      t.click(t.$('#settingsBtn'));
      await t.settle();
      t.key(t.$('.set-tab.on'), 'Escape');
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Board', 'Escape returns to the Board');
      t.click(t.$('#homeBtn'));
      await t.settle();
      t.ok(t.$('#home'), 'Home opens');
      t.ok(!t.$('#boardBtn').classList.contains('on'), 'board button off on Home');
    },
  },
  {
    area,
    name: 'board: columns follow the sidebar order, Unsorted last; cards show icon, full URL and env badge',
    page: 'newtab',
    fixture: () => base({ settings: { order: ['40', '20'] } }),
    async run(t) {
      await openBoard(t);
      t.eq(colIds(t), ['40', '20', '30', '50', 'unsorted:10'], 'column order');
      t.eq(
        t.navTitles(),
        colIds(t).map((id) => col(t, id).querySelector('.bcol-name').textContent),
        'same order as the sidebar',
      );
      t.eq(lanes(t), [], 'no lane headers without categories');
      t.ok(!t.$('#page .board-group'), 'no grouping switch without categories');
      t.ok(col(t, 'unsorted:10').querySelector('.bcol-h').getAttribute('draggable') !== 'true', 'Unsorted not draggable');
      t.eq(col(t, '40').querySelector('.bcol-h').getAttribute('draggable'), 'true', 'folder columns draggable');
      t.eq(col(t, '20').querySelector('.bcol-n').textContent, '3', 'count includes sections');
      const c = card(t, '31');
      t.ok(c.querySelector('.ico'), 'icon');
      t.eq(c.querySelector('.bcard-ttl').textContent, 'Shop PROD', 'title');
      t.eq(c.querySelector('.bcard-url').textContent, 'shop.example.com/api/x', 'URL');
      t.eq(c.querySelector('.badge')?.textContent, 'PROD', 'env badge');
      t.eq([c.getAttribute('target'), c.getAttribute('rel')], ['_blank', 'noopener'], 'opens in a new tab');
      t.eq(card(t, '41').querySelector('.badge')?.textContent, 'GH', 'GitHub badge');
      t.eq(t.$('#page .bempty', col(t, '50'))?.textContent, 'No links yet. Drop one here.', 'empty column hint');
      t.eq(Math.round(col(t, '40').getBoundingClientRect().width), 320, 'columns are 320 px wide');
    },
  },
  {
    area,
    name: 'board: category lanes (collapsed ones too), then One row; the choice is saved',
    page: 'newtab',
    fixture: () => withCats(),
    async run(t) {
      await openBoard(t);
      t.eq(lanes(t), ['Daily working (2)', 'No category (3)'], 'lanes: empty category skipped, collapsed one shown');
      t.eq(colIds(t), ['20', '30', '40', '50', 'unsorted:10'], 'columns in lane order, Unsorted last');
      t.eq(t.$('.board-group .on')?.textContent, 'By category', 'By category is on');
      t.click(t.$('.board-group button[data-group="flat"]'));
      await t.settle();
      t.eq(t.settings().board?.group, 'flat', 'saved');
      t.eq(lanes(t), [], 'no lane headers in One row');
      t.eq(t.$$('#page .blane').length, 1, 'one row');
      t.eq(colIds(t), ['20', '30', '40', '50', 'unsorted:10'], 'all columns in one row');
      await t.reload();
      await openBoard(t);
      t.eq(t.$('.board-group .on')?.textContent, 'One row', 'still One row after reload');
      t.click(t.$('.board-group button[data-group="cat"]'));
      await t.settle();
      t.eq(t.settings().board?.group, 'cat', 'back to By category');
      t.eq(lanes(t).length, 2, 'lanes again');
    },
  },
  {
    area,
    name: 'board: drop a card on a column moves it to the end of that folder; on a sidebar folder too',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.drag(card(t, '31'), col(t, '40'));
      await t.settle();
      t.eq(t.kids('40'), ['41', '31'], 'moved to the end of GITHUB - PIN');
      t.eq(cardIds(t, '40'), ['41', '31'], 'board re-rendered');
      t.eq(t.$('.head h2')?.textContent, 'Board', 'still on the Board');
      t.drag(card(t, '32'), col(t, 'unsorted:10'));
      await t.settle();
      t.eq(t.node('32').parentId, '10', 'dropped on Unsorted goes to the root');
      t.drag(card(t, '33'), t.nav('Empty'));
      await t.settle();
      t.eq(t.kids('50'), ['33'], 'dropped on a sidebar folder');
      t.ok(!t.drag(card(t, '41'), col(t, '40')), 'own column is not a drop target');
    },
  },
  {
    area,
    name: 'board: sections show as headers in the column; dropping on one moves the link into it',
    page: 'newtab',
    fixture: () => base({ settings: { partColors: { 23: 'blue' } } }),
    async run(t) {
      await openBoard(t);
      const heads = t.$$('.bsec', col(t, '20'));
      t.eq(
        heads.map((x) => x.querySelector('.t').textContent),
        ['Blocked', 'No section'],
        'section headers, No section last',
      );
      t.eq(heads[0].dataset.color, 'blue', 'section color');
      t.ok(heads[0].querySelector('.dot'), 'color dot');
      t.eq(cardIds(t, '30'), ['31', '32', '33', '34'], 'plain list without sections');
      t.ok(!t.drag(card(t, '24'), t.$('.bsec[data-part="23"]')), 'own section header refuses the drop');
      await t.settle();
      t.eq(t.node('24').parentId, '23', 'still in Blocked');
      t.drag(card(t, '21'), t.$('.bsec[data-part="23"]'));
      await t.settle();
      t.eq(t.kids('23'), ['24', '21'], 'moved into Blocked');
      t.drag(card(t, '24'), t.$('.bsec[data-part="none:20"]'));
      await t.settle();
      t.eq(t.node('24').parentId, '20', 'No section moves it to the folder itself');
      t.drag(card(t, '31'), t.$('.bsec[data-part="23"]'));
      await t.settle();
      t.eq(t.node('31').parentId, '23', 'from another column into a section');
    },
  },
  {
    area,
    name: 'board: drag a card onto a card reorders in Manual sort',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.drag(card(t, '34'), card(t, '31'), 'before');
      await t.settle();
      t.eq(t.kids('30'), ['34', '31', '32', '33'], 'before the target');
      t.drag(card(t, '34'), card(t, '32'), 'after');
      await t.settle();
      t.eq(t.kids('30'), ['31', '32', '34', '33'], 'after the target');
      t.drag(card(t, '41'), card(t, '31'), 'after');
      await t.settle();
      t.eq(t.kids('30'), ['31', '41', '32', '34', '33'], 'from another folder at that position');
    },
  },
  {
    area,
    name: 'board: cards use the folder sort; Name sort blocks card reorder',
    page: 'newtab',
    fixture: () => base({ settings: { folders: { 30: { sort: 'name' } } } }),
    async run(t) {
      await openBoard(t);
      t.eq(cardIds(t, '30'), ['34', '31', '33', '32'], 'sorted by name');
      const accepted = t.drag(card(t, '34'), card(t, '32'), 'after');
      await t.settle();
      t.ok(!accepted, 'drop refused');
      t.eq(t.kids('30'), ['31', '32', '33', '34'], 'Chrome order unchanged');
    },
  },
  {
    area,
    name: 'board: drag a column header reorders the sidebar, not Chrome; adopts the category',
    page: 'newtab',
    fixture: () => withCats(),
    async run(t) {
      await openBoard(t);
      const tree = t.kids('10');
      t.drag(col(t, '40').querySelector('.bcol-h'), col(t, '20'), 'before');
      await t.settle();
      t.eq(t.settings().order, ['40', '20', '30', '50'], 'order saved');
      t.eq(t.settings().folderCat['40'], 'c1', 'category adopted');
      t.eq(t.kids('10'), tree, 'bookmark tree untouched');
      t.eq(colIds(t), ['40', '20', '30', '50', 'unsorted:10'], 'board re-rendered');
      t.ok(!t.drag(col(t, '50').querySelector('.bcol-h'), col(t, 'unsorted:10')), 'Unsorted is not a folder drop target');
      t.ok(!t.drag(col(t, 'unsorted:10').querySelector('.bcol-h'), col(t, '20')), 'Unsorted cannot be dragged');
      t.eq(t.settings().order, ['40', '20', '30', '50'], 'order unchanged');
    },
  },
  {
    area,
    name: 'board: column name opens the folder; ⋯ opens the folder menu',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.click(col(t, '30').querySelector('.more'));
      await t.menuShown();
      t.ok(t.menuLabels().includes('Open all (4)'), 'folder menu');
      t.click(col(t, '30').querySelector('.bcol-name'));
      await t.settle();
      t.eq(t.$('.head h2')?.textContent, 'Shop API', 'folder page');
    },
  },
  {
    area,
    name: 'board: delete a card, then Undo restores it at the same index',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      const del = card(t, '32').querySelector('.bcard-del');
      t.eq(del.getAttribute('aria-label'), 'Delete link', 'label');
      t.ok(del.getBoundingClientRect().height >= 28, 'at least 28 px');
      t.click(del);
      await t.settle();
      t.ok(!t.node('32'), 'deleted');
      t.ok(!card(t, '32'), 'card gone');
      t.ok(t.toast()?.textContent.includes('Shop TEST'), 'undo toast');
      t.click(t.$('.toast button'));
      await t.settle();
      const back = t.node('30').children[1];
      t.eq([back.title, back.url], ['Shop TEST', 'https://test.shop.example.com/api/x'], 'restored at index 1');
      t.ok(card(t, back.id), 'card back');
    },
  },
  {
    area,
    name: 'board: Add link adds https:// and a host name; empty URL adds nothing; Escape cancels',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.click(col(t, '50').querySelector('.bcol-add'));
      const form = col(t, '50').querySelector('.bcol-form');
      t.ok(form, 'form open');
      t.eq(t.d.activeElement, form.querySelector('input[type=url]'), 'URL box focused');
      form.requestSubmit();
      await t.settle();
      t.eq(t.kids('50'), [], 'nothing added without a URL');
      t.type(form.querySelector('input[type=url]'), 'www.example.org/x');
      form.requestSubmit();
      await t.settle();
      const n = t.node('50').children[0];
      t.eq([n?.url, n?.title], ['https://www.example.org/x', 'example.org'], 'added with https:// and host name');
      t.ok(!t.$('.bcol-form'), 'form closed');
      t.click(col(t, 'unsorted:10').querySelector('.bcol-add'));
      t.type(t.$('.bcol-form input[type=url]'), 'loose2.example.com');
      t.type(t.$('.bcol-form input[type=text]'), 'Second loose');
      t.$('.bcol-form').requestSubmit();
      await t.settle();
      t.eq(t.node('10').children.at(-1).title, 'Second loose', 'Unsorted adds to the root');
      t.click(col(t, '40').querySelector('.bcol-add'));
      t.key(t.$('.bcol-form input'), 'Escape');
      await t.settle();
      t.ok(!t.$('.bcol-form'), 'Escape closes the form');
      t.eq(t.kids('40'), ['41'], 'nothing added');
    },
  },
  {
    area,
    name: 'board: filter hides cards, shows "Nothing matches." and keeps focus in the box',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      const box = t.$('#page .toolbar input[type=search]');
      t.type(box, 'shop test');
      await t.settle();
      t.eq(
        t.$$('#page .bcard').map((c) => c.dataset.id),
        ['32'],
        'only the match',
      );
      t.eq(t.$('.bempty', col(t, '40'))?.textContent, 'Nothing matches.', 'empty column message');
      t.eq(t.d.activeElement, box, 'focus kept');
      t.ok(t.$('#page .toolbar input[type=search]') === box, 'toolbar not re-rendered');
      t.ok(card(t, '32').querySelector('mark'), 'match highlighted');
      t.key(box, 'Escape');
      await t.settle();
      t.eq(t.$$('#page .bcard').length, 9, 'Escape clears the filter');
    },
  },
  {
    area,
    name: 'board: the Home folder is never a column, also after a column drag when the root holds it',
    page: 'newtab',
    fixture: () =>
      base({
        other: [
          F('70', 'Home', [L('71', 'GitHub', 'https://github.com/')]),
          F('80', 'Alpha', [L('81', 'a', 'https://a.example.com/')]),
          F('90', 'Beta', [L('91', 'b', 'https://b.example.com/')]),
        ],
        settings: { rootId: '2', home: { folderId: '70', seeded: true } },
      }),
    async run(t) {
      await openBoard(t);
      t.eq(colIds(t), ['80', '90'], 'no Home column at first');
      t.drag(col(t, '90').querySelector('.bcol-h'), col(t, '80'), 'before');
      await t.settle();
      t.eq(t.settings().order, ['90', '80'], 'order saved');
      t.eq(colIds(t), ['90', '80'], 'no Home column after the drag');
      t.ok(!t.nav('Home'), 'no Home folder in the sidebar after the drag');
    },
  },
  {
    area,
    name: 'board: dropping a column on an uncategorised column removes its category',
    page: 'newtab',
    fixture: () => withCats(),
    async run(t) {
      await openBoard(t);
      t.drag(col(t, '20').querySelector('.bcol-h'), col(t, '40'), 'before');
      await t.settle();
      t.eq(t.settings().folderCat['20'], undefined, 'category removed');
      t.eq(t.settings().folderCat['30'], 'c1', 'other folder keeps its category');
      t.eq(lanes(t), ['Daily working (1)', 'No category (4)'], 'lanes updated');
    },
  },
  {
    area,
    name: 'board: drop a card on the Home button moves it into the Home folder',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.ok(t.drag(card(t, '41'), t.$('#homeBtn')), 'Home button accepts the card');
      await t.settle();
      t.eq(t.node('41').parentId, '70', 'moved to the Home folder');
      t.eq(t.$('.head h2')?.textContent, 'Board', 'still on the Board');
      t.ok(!card(t, '41'), 'card gone from the Board');
    },
  },
  {
    area,
    name: 'board: Unsorted column exists only while the root has loose links',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.ok(col(t, 'unsorted:10'), 'Unsorted with a loose link');
      t.click(card(t, '60').querySelector('.bcard-del'));
      await t.settle();
      t.ok(!col(t, 'unsorted:10'), 'no Unsorted without loose links');
      t.eq(colIds(t), ['20', '30', '40', '50'], 'only folders');
    },
  },
  {
    area,
    name: 'board: right-click on a column header opens the folder menu',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.context(col(t, '30').querySelector('.bcol-h'));
      await t.menuShown();
      t.ok(t.menuLabels().includes('Open all (4)'), 'folder menu');
    },
  },
  {
    area,
    name: 'board: a card hides the URL only when it equals the title',
    page: 'newtab',
    fixture: () =>
      base({
        extraRoot: [F('55', 'Same', [L('56', 'https://same.example.com/', 'https://same.example.com/'), L('57', '', 'https://untitled.example.com/p')])],
      }),
    async run(t) {
      await openBoard(t);
      t.eq(card(t, '56').querySelector('.bcard-url').textContent, '', 'URL hidden when equal to the title');
      t.ok(card(t, '56').querySelector('.bcard-url').getBoundingClientRect().height === 0, 'not shown');
      t.eq(card(t, '57').querySelector('.bcard-ttl').textContent, 'untitled.example.com/p', 'no title shows the URL as title');
      t.ok(card(t, '31').querySelector('.bcard-url').getBoundingClientRect().height > 0, 'different URL is shown');
    },
  },
  {
    area,
    name: 'board: an empty section header stays as a drop target',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.drag(card(t, '24'), t.$('.bsec[data-part="none:20"]'));
      await t.settle();
      t.eq(t.kids('23'), [], 'Blocked is empty');
      const head = t.$('.bsec[data-part="23"]');
      t.ok(head, 'empty section header still shown');
      t.eq(head.querySelector('.n').textContent, '0', 'count 0');
      t.ok(t.drag(card(t, '21'), head), 'accepts a drop');
      await t.settle();
      t.eq(t.kids('23'), ['21'], 'moved into the empty section');
    },
  },
  {
    area,
    name: 'board: Add link Cancel adds nothing; opening the Board resets the filter',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      await openBoard(t);
      t.click(col(t, '50').querySelector('.bcol-add'));
      t.type(t.$('.bcol-form input[type=url]'), 'cancel.example.com');
      t.click(t.$$('.bcol-form button').find((b) => b.textContent === 'Cancel'));
      await t.settle();
      t.ok(!t.$('.bcol-form'), 'form closed');
      t.eq(t.kids('50'), [], 'nothing added');
      t.type(t.$('#page .toolbar input[type=search]'), 'shop test');
      await t.settle();
      t.eq(t.$$('#page .bcard').length, 1, 'filtered');
      t.click(t.$('#homeBtn'));
      await t.settle();
      await openBoard(t);
      t.eq(t.$('#page .toolbar input[type=search]').value, '', 'filter box empty');
      t.eq(t.$$('#page .bcard').length, 9, 'all cards back');
    },
  },
];
