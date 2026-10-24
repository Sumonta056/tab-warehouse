import { ENVS } from './envs.js';

export const TAG_COLORS = ['teal', 'pink', 'yellow', 'red', 'cyan', 'grey'];

export const TAG_RESERVED = [...ENVS, 'DEV', 'GH', 'NONE', ...TAG_COLORS.map((c) => c.toUpperCase())];

export const TAG_PLAIN_MAX = 40;

export const SITES_HEAD = /^#\s*Same site in each version:\s*([^(]*)/;

export const EXAMPLE_RULES = [
  { pattern: 'localhost', env: 'LOCAL' },
  { pattern: 'staging.', env: 'STAGE' },
  { pattern: 'test.', env: 'TEST' },
  { pattern: 'shop.example.com', env: 'PROD' },
];

export const EXAMPLE_MAP = [{ PROD: 'shop.example.com', TEST: 'test.shop.example.com', STAGE: 'staging.shop.example.com', LOCAL: 'localhost:3000' }];

export const TRY_SAMPLES = [
  'https://shop.example.com/cart',
  'https://test.shop.example.com/cart',
  'https://staging.shop.example.com/cart',
  'http://localhost:3000/cart',
  'https://news.example.org',
];
