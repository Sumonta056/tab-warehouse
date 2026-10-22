export const L = (id, title, url) => ({ id, title, url });
export const F = (id, title, children = []) => ({ id, title, children });

export const SAMPLE_ENV_RULES = [
  { pattern: 'localhost', env: 'LOCAL' },
  { pattern: '127.0.0.1', env: 'LOCAL' },
  { pattern: 'stage', env: 'STAGE' },
  { pattern: 'sandbox', env: 'TEST' },
  { pattern: 'test', env: 'TEST' },
  { pattern: '-dev', env: 'TEST' },
  { pattern: 'dev.', env: 'TEST' },
  { pattern: 'shop.example.com', env: 'PROD' },
  { pattern: 'api.example.com', env: 'PROD' },
  { pattern: 'www.example.com', env: 'PROD' },
  { pattern: 'console.aws.amazon.com', env: 'PROD' },
  { pattern: 'prod', env: 'PROD' },
];
export const SAMPLE_HOST_MAP = [
  { PROD: 'shop.example.com', TEST: 'shop-test.example.com', STAGE: 'shop-stage.example.com', LOCAL: 'localhost:8080' },
  { PROD: 'api.example.com', TEST: 'api-test.example.com', STAGE: '', LOCAL: 'localhost:8080' },
  { PROD: 'www.example.com', TEST: 'test.example.com', STAGE: '', LOCAL: '' },
];

export function base({ home = true, settings = {}, extraRoot = [], tasks = null, other = null, activeTab = null, homeIcons = {} } = {}) {
  const tree = F('0', '', [
    F('1', 'Bookmarks bar', [
      F('10', 'My Links', [
        tasks ||
          F('20', 'Sprint board', [
            L('21', 'Read title TASK-160', 'https://tasks.example.com/t/TASK-160'),
            L('22', 'Keyboard TASK-150', 'https://tasks.example.com/t/TASK-150'),
            F('23', 'Blocked', [L('24', 'Old TASK-100', 'https://tasks.example.com/t/TASK-100')]),
          ]),
        F('30', 'Shop API', [
          L('31', 'Shop PROD', 'https://shop.example.com/api/x'),
          L('32', 'Shop TEST', 'https://shop-test.example.com/api/x'),
          L('33', 'Shop STAGE', 'https://shop-stage.example.com/api/x'),
          L('34', 'Shop local', 'http://localhost:8080/api/x'),
        ]),
        F('40', 'GITHUB - PIN', [L('41', 'repo', 'https://github.com/a/b')]),
        F('50', 'Empty', []),
        ...extraRoot,
        L('60', 'Loose', 'https://loose.example.com/'),
      ]),
    ]),
    F(
      '2',
      'Other bookmarks',
      other ||
        (home
          ? [
              F('70', 'Home', [
                L('71', 'GitHub', 'https://github.com/'),
                L('72', 'Drive', 'https://drive.google.com/drive/u/0/my-drive'),
                L('73', 'Example', 'https://example.com/'),
              ]),
            ]
          : []),
    ),
  ]);
  const s = { showFavicons: false, rootName: 'My Links', envRules: SAMPLE_ENV_RULES, hostMap: SAMPLE_HOST_MAP, ...settings };
  if (home && !other) s.home = { folderId: '70', seeded: true, ...(settings.home || {}) };
  return { tree, store: { settings: s, homeIcons }, nextId: 1000, activeTab };
}
