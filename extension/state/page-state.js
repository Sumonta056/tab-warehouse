export const state = {
  settings: null,
  tree: null,
  root: null,
  secs: [],
  current: null,
  query: '',
  navSearch: false,
  filterQ: '',
  priF: 'all',
  linkMeta: {},
  editingId: null,
  drag: null,
  beforeSettings: null,
  saveQueue: Promise.resolve(),
};

export function setState(patch) {
  Object.assign(state, patch);
}

export function openView() {
  return state.query ? null : state.current;
}

export function clearQuery(input) {
  input.value = '';
  state.query = '';
}
