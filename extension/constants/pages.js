import { TODAY_NAME } from './due.js';

export const HOME = { id: 'home', title: 'Home', home: true, links: [], parts: [], all: [] };
export const SETTINGS = { id: 'settings', title: 'Settings', settings: true, links: [], parts: [], all: [] };
export const BOARD = { id: 'board', title: 'Board', board: true, links: [], parts: [], all: [] };
export const SCHEDULE = { id: 'schedule', title: TODAY_NAME, schedule: true, links: [], parts: [], all: [] };
export const PAGES = [HOME, BOARD, SCHEDULE];

export const SETTINGS_TABS = [
  ['appearance', 'Appearance'],
  ['home', 'Home page'],
  ['bookmarks', 'Bookmarks'],
  ['dupes', 'Duplicates'],
  ['env', 'Tags'],
  ['backup', 'Backup'],
  ['keys', 'Shortcuts'],
];
