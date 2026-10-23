import { base } from '../fixtures.js';

const area = 'address bar';

export default [
  {
    area,
    name: 'address bar: ?q= opens the new tab with the global search for that text',
    page: 'newtab',
    search: '?q=shop%20prod',
    fixture: () => base(),
    async run(t) {
      t.eq(t.$('#q').value, 'shop prod', 'search box has the text');
      t.eq(t.$('.head h2')?.textContent, 'Search', 'search results shown');
      t.ok(!t.$('#home'), 'Home not shown');
      t.ok(t.row('31'), 'the PROD link is in the results');
    },
  },
  {
    area,
    name: 'address bar: without ?q= the new tab opens Home as before',
    page: 'newtab',
    fixture: () => base(),
    async run(t) {
      t.ok(t.$('#home'), 'Home shown');
      t.eq(t.$('#q').value, '', 'search box empty');
    },
  },
];
