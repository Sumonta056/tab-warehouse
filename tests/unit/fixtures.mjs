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
  { pattern: 'www.example.org', env: 'PROD' },
  { pattern: 'console.aws.amazon.com', env: 'PROD' },
  { pattern: 'prod', env: 'PROD' },
];

export const SAMPLE_HOST_MAP = [
  { PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: 'stage.shop.example.com', LOCAL: 'localhost:8080' },
  { PROD: 'api.example.com', TEST: 'api-test.example.com', STAGE: '', LOCAL: 'localhost:8080' },
  { PROD: 'www.example.org', TEST: 'test.example.org', STAGE: '', LOCAL: '' },
];

export const L = (id, title, url, extra = {}) => ({ id, title, url, ...extra });

export const F = (id, title, children = [], extra = {}) => ({ id, title, children, ...extra });
