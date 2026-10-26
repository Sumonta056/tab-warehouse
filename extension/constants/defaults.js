import { SIDE_WIDTH } from './limits.js';

export const DEFAULT_HOME = {
  folderId: null,
  color: '#185a63',
  imgOpacity: 100,
  dark: 65,
  blur: 2,
  clockSize: 170,
  h24: false,
  seconds: true,
  date: true,
  labels: true,
  newTab: false,
  tileSize: 56,
  perRow: 12,
  tilesGap: 80,
};

export const DEFAULT_SIDE_LOOK = { mode: 'solid', color: '#1b1b1b', dark: 70, blur: 12 };

export const DEFAULT_BOARD = { group: 'cat' };

export const DEFAULT_SETTINGS = {
  rootId: null,
  rootName: '',
  userName: '',
  fontSide: 100,
  fontPage: 100,
  fontBoard: 100,
  order: [],
  lastFolder: null,
  lastSaveFolder: null,
  categories: [],
  folderCat: {},
  partColors: {},
  folderColors: {},
  partIcons: {},
  folderIcons: {},
  folders: {},
  envRules: [],
  hostMap: [],
  customTags: [],
  showFavicons: true,
  theme: 'blue',
  sideLook: DEFAULT_SIDE_LOOK,
  home: DEFAULT_HOME,
  board: DEFAULT_BOARD,
  sideWidth: SIDE_WIDTH.initial,
};
