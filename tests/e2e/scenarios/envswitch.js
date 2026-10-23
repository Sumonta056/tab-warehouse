import { base } from '../fixtures.js';

const area = 'env switch';
const at = (url, title = 'Shop') => base({ activeTab: { title, url, index: 3 } });
const rows = (t) => t.$$('#switch .env-go').map((b) => [b.dataset.env, b.querySelector('.u').textContent, b.querySelector('.n').textContent]);

export default [
  {
    area,
    name: 'env switch: the popup lists the same page in the other versions from the site row',
    page: 'popup',
    fixture: () => at('https://shop.example.com/api/x?id=7'),
    async run(t) {
      t.ok(!t.$('#switch').hidden, 'section shown');
      t.eq(t.$('#switch .lbl').textContent, 'Open this page in', 'label');
      t.eq(
        rows(t),
        [
          ['TEST', 'https://shop-test.example.com/api/x?id=7', 'Test'],
          ['STAGE', 'https://shop-stage.example.com/api/x?id=7', 'Staging'],
          ['LOCAL', 'http://localhost:8080/api/x?id=7', 'Your computer'],
        ],
        'rows',
      );
      t.eq(t.$('#switch .env-go').title, 'https://shop-test.example.com/api/x?id=7', 'full URL as tooltip');
    },
  },
  {
    area,
    name: 'env switch: click opens the version next to this tab and closes the popup',
    page: 'popup',
    fixture: () => at('https://shop.example.com/api/x'),
    async run(t) {
      t.click(t.$('#switch .env-go[data-env="STAGE"]'));
      await t.settle();
      t.eq(t.tabs.at(-1), { url: 'https://shop-stage.example.com/api/x', index: 4, active: true }, 'opened next to this tab');
      t.ok(t.H.closed, 'popup closed');
    },
  },
  {
    area,
    name: 'env switch: Shift+click opens it in the background and keeps the popup open',
    page: 'popup',
    fixture: () => at('https://shop.example.com/api/x'),
    async run(t) {
      t.$('#switch .env-go[data-env="TEST"]').dispatchEvent(new t.w.MouseEvent('click', { bubbles: true, shiftKey: true }));
      await t.settle();
      t.eq(t.tabs.at(-1), { url: 'https://shop-test.example.com/api/x', index: 4, active: false }, 'background tab');
      t.ok(!t.H.closed, 'popup stays open');
      t.eq(t.$('#status').textContent, 'Opened in a background tab', 'status');
    },
  },
  {
    area,
    name: 'env switch: empty boxes in the site row are skipped',
    page: 'popup',
    fixture: () => at('https://www.example.com/news'),
    async run(t) {
      t.eq(rows(t), [['TEST', 'https://test.example.com/news', 'Test']], 'only TEST');
    },
  },
  {
    area,
    name: 'env switch: a labelled page without a site row shows a hint; a plain page shows nothing',
    page: 'popup',
    fixture: () => at('https://deploy.prod.example.com/applications/x', 'Argo app PROD'),
    async run(t) {
      t.ok(!t.$('#switch').hidden, 'hint shown');
      t.eq(t.$('#switch .switch-hint')?.textContent, 'To open this page in your other versions, add this site in Settings › Environments.', 'hint');
      t.eq(rows(t), [], 'no rows');
      t.H.activeTab = { title: 'Example', url: 'https://example.com/', index: 0 };
      await t.reload();
      t.ok(t.$('#switch').hidden, 'nothing for a plain page');
    },
  },
];
