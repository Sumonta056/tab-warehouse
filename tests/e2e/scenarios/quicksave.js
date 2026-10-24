import { base, F, L } from '../fixtures.js';

const area = 'quick save';
const fresh = { id: 7, title: 'Fresh page', url: 'https://fresh.example.com/a' };
const loose = { id: 7, title: 'Shop PROD', url: 'https://shop.example.com/api/x/?utm_source=mail#top' };

async function command(t, name = 'quick-save') {
  await t.background();
  await t.w.__command(name);
  await t.settle();
}
const added = (t, id) => (t.node(id)?.children || []).filter((c) => c.url && Number(c.id) >= 1000);

export default [
  {
    area,
    name: 'quick save: the shortcut saves the tab into the last save folder and shows a green ✓',
    page: 'popup',
    fixture: () => base({ activeTab: fresh, settings: { lastSaveFolder: '40' } }),
    async run(t) {
      await command(t);
      t.eq(
        added(t, '40').map((c) => [c.title, c.url]),
        [['Fresh page', fresh.url]],
        'saved into GITHUB - PIN',
      );
      t.eq(t.H.badges?.[7], { color: '#1e8e3e', text: '✓', title: 'Saved to GITHUB - PIN' }, 'green badge on that tab');
      t.eq(t.settings().lastSaveFolder, '40', 'last save folder unchanged');
      t.ok(!t.H.popupOpened, 'popup not opened');
      await t.sleep(2700);
      t.eq(t.H.badges?.[7]?.text, '', 'badge cleared after 2.5 s');
      t.eq(t.H.badges?.[7]?.title, 'Save current tab to Tab Warehouse', 'default title back');
    },
  },
  {
    area,
    name: 'quick save: a deleted last save folder falls back to the root',
    page: 'popup',
    fixture: () => base({ activeTab: { ...fresh, title: '' }, settings: { lastSaveFolder: '999' } }),
    async run(t) {
      await command(t);
      t.eq(
        added(t, '10').map((c) => [c.title, c.url]),
        [[fresh.url, fresh.url]],
        'saved under the root, the URL as title',
      );
      t.eq(t.H.badges?.[7]?.title, 'Saved to My Links', 'badge title names the root');
    },
  },
  {
    area,
    name: 'quick save: an address already saved opens the popup and saves nothing',
    page: 'popup',
    fixture: () => base({ activeTab: loose }),
    async run(t) {
      await command(t);
      t.eq(t.H.popupOpened, 1, 'popup opened');
      t.eq(t.kids('30'), ['31', '32', '33', '34'], 'nothing saved');
      t.ok(!t.H.badges?.[7], 'no badge');
    },
  },
  {
    area,
    name: 'quick save: when the popup cannot open, an orange ! names where it is',
    page: 'popup',
    fixture: () => ({ ...base({ activeTab: loose }) }),
    async run(t) {
      t.H.openPopupFails = true;
      await command(t);
      t.eq(t.kids('30'), ['31', '32', '33', '34'], 'nothing saved');
      t.eq(t.H.badges?.[7], { color: '#e8710a', text: '!', title: 'Already in Bookmarks bar › My Links › Shop API' }, 'orange badge');
    },
  },
  {
    area,
    name: 'quick save: a chrome:// page is not saved and shows a grey –',
    page: 'popup',
    fixture: () => base({ activeTab: { id: 7, title: 'Extensions', url: 'chrome://extensions/' } }),
    async run(t) {
      await command(t);
      t.eq(added(t, '10'), [], 'nothing saved');
      t.eq(t.H.badges?.[7]?.text, '–', 'grey dash');
      t.eq(t.H.badges?.[7]?.color, '#5f6368', 'grey');
    },
  },
  {
    area,
    name: 'quick save: other commands do nothing',
    page: 'popup',
    fixture: () => base({ activeTab: fresh }),
    async run(t) {
      await command(t, '_execute_action');
      t.eq(added(t, '10'), [], 'nothing saved');
      t.ok(!t.H.badges, 'no badge');
    },
  },
  {
    area,
    name: 'popup: a saved copy with tracking parameters shows the warning, its address and Save again',
    page: 'popup',
    fixture: () => base({ activeTab: loose }),
    async run(t) {
      const box = t.$('#exists .dup-warn');
      t.ok(box, 'warning box shown');
      t.eq(
        t.$$('#exists .exists .path').map((p) => p.textContent),
        ['Already saved in My Links › Shop API'],
        'path',
      );
      const addr = t.$('#exists .exists .addr');
      t.eq(addr?.textContent, 'https://shop.example.com/api/x', 'own address shown');
      t.eq(addr?.title, 'https://shop.example.com/api/x', 'full address as tooltip');
      t.ok(t.$('#save').textContent.includes('Save again to My Links'), 'Save again label');
      t.key(t.$('#q'), 'Enter');
      await t.settle();
      t.eq(
        added(t, '10').map((c) => c.url),
        [loose.url],
        'Enter still saves',
      );
    },
  },
  {
    area,
    name: 'popup: an exact copy hides the address; Remove brings Save back',
    page: 'popup',
    fixture: () => base({ activeTab: { id: 7, title: 'Shop PROD', url: 'https://shop.example.com/api/x' } }),
    async run(t) {
      t.ok(t.$('#exists .dup-warn'), 'warning box shown');
      t.ok(!t.$('#exists .addr'), 'no address line for the same address');
      t.ok(t.$('#save').textContent.includes('Save again to'), 'Save again label');
      t.click(t.$('#exists .exists button'));
      await t.settle();
      t.ok(!t.$('#exists .dup-warn'), 'warning gone');
      t.ok(t.$('#save').textContent.includes('Save to My Links') && !t.$('#save').textContent.includes('again'), 'plain Save label');
    },
  },
  {
    area,
    name: 'popup: a new address has no warning and a plain Save label',
    page: 'popup',
    fixture: () => base({ activeTab: fresh }),
    async run(t) {
      t.ok(!t.$('#exists .dup-warn'), 'no warning');
      t.ok(!t.$('#save').textContent.includes('again'), 'plain Save label');
    },
  },
  {
    area,
    name: 'popup: three copies and many folders still fit, Save visible',
    page: 'popup',
    fixture: () =>
      base({
        activeTab: loose,
        extraRoot: [
          F('80', 'Copies', [
            L('81', 'Copy a', 'https://shop.example.com/api/x?utm_campaign=a'),
            L('82', 'Copy b', 'https://shop.example.com/api/x#b'),
            L('83', 'Copy c', 'https://shop.example.com/api/x/'),
          ]),
          ...Array.from({ length: 30 }, (_, i) => F(String(900 + i), `Folder ${i + 1}`)),
        ],
      }),
    async run(t) {
      t.eq(t.$$('#exists .exists').length, 3, 'at most 3 copies');
      const body = t.d.body.getBoundingClientRect();
      const save = t.$('#save').getBoundingClientRect();
      t.ok(body.height <= 600, `popup fits Chrome's 600 px (${Math.round(body.height)})`);
      t.ok(save.bottom <= body.bottom && save.top >= 0, 'Save visible without scrolling');
      t.ok(
        t.$$('#exists .btn').every((b) => b.getBoundingClientRect().height >= 28),
        'Remove ≥ 28 px',
      );
    },
  },
];
