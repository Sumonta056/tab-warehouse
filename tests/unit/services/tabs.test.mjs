import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import {
  openTab,
  updateTab,
  currentTabId,
  activeTab,
  listTabs,
  onTabsChanged,
  activeTabs,
  getTab,
  onTabActivated,
  onTabLoaded,
} from '../../../extension/services/tabs.js';

describe('tabs service', () => {
  test('openTab and updateTab pass the properties through', async () => {
    const ch = fakeChrome();
    await openTab({ url: 'https://a.com/', active: false });
    await updateTab({ url: 'https://b.com/' });
    await updateTab({ url: 'https://c.com/' }, 5);
    assert.deepEqual(ch.calls, [
      ['tabs.create', { url: 'https://a.com/', active: false }],
      ['tabs.update', { url: 'https://b.com/' }],
      ['tabs.update', 5, { url: 'https://c.com/' }],
    ]);
  });

  test('activeTab asks for the active tab of the current window', async () => {
    const ch = fakeChrome({ tabs: [{ id: 4, url: 'https://a.com/' }] });
    assert.deepEqual(await activeTab(), { id: 4, url: 'https://a.com/' });
    assert.deepEqual(ch.calls, [['tabs.query', { active: true, currentWindow: true }]]);
    fakeChrome({ tabs: [] });
    assert.equal(await activeTab(), undefined);
  });

  test('currentTabId is the page tab id, or undefined outside a tab', async () => {
    fakeChrome({ current: { id: 12 } });
    assert.equal(await currentTabId(), 12);
    fakeChrome({ current: undefined });
    assert.equal(await currentTabId(), undefined);
    const ch = fakeChrome();
    delete ch.tabs.getCurrent;
    assert.equal(await currentTabId(), undefined);
  });

  test('listTabs asks for every tab', async () => {
    const ch = fakeChrome({ tabs: [{ id: 1, url: 'https://a.com/' }] });
    assert.deepEqual(await listTabs(), [{ id: 1, url: 'https://a.com/' }]);
    assert.deepEqual(ch.calls, [['tabs.query', {}]]);
  });

  test('onTabsChanged fires on a new or closed tab and on a URL change only', () => {
    const ch = fakeChrome();
    let n = 0;
    onTabsChanged(() => n++);
    ch.tabs.onCreated.fire({ id: 1 });
    ch.tabs.onRemoved.fire(1, {});
    ch.tabs.onUpdated.fire(2, { status: 'loading' });
    assert.equal(n, 2);
    ch.tabs.onUpdated.fire(2, { url: 'https://b.com/' });
    assert.equal(n, 3);
  });

  test('activeTabs asks for the active tab of every window', async () => {
    const ch = fakeChrome({ tabs: [{ id: 1 }, { id: 2 }] });
    assert.deepEqual(await activeTabs(), [{ id: 1 }, { id: 2 }]);
    assert.deepEqual(ch.calls, [['tabs.query', { active: true }]]);
  });

  test('getTab returns the tab and rejects for a closed one', async () => {
    fakeChrome({ tabs: [{ id: 3, url: 'https://a.com/' }] });
    assert.deepEqual(await getTab(3), { id: 3, url: 'https://a.com/' });
    await assert.rejects(getTab(9));
  });

  test('onTabActivated passes the tab id', () => {
    const ch = fakeChrome();
    const seen = [];
    onTabActivated((id) => seen.push(id));
    ch.tabs.onActivated.fire({ tabId: 5, windowId: 1 });
    assert.deepEqual(seen, [5]);
  });

  test('onTabLoaded fires on a URL change or a finished load, with the tab', () => {
    const ch = fakeChrome();
    const seen = [];
    onTabLoaded((tab) => seen.push(tab.id));
    ch.tabs.onUpdated.fire(2, { status: 'loading' }, { id: 2 });
    ch.tabs.onUpdated.fire(2, { url: 'https://b.com/' }, { id: 2 });
    ch.tabs.onUpdated.fire(3, { status: 'complete' }, { id: 3 });
    assert.deepEqual(seen, [2, 3]);
  });
});
