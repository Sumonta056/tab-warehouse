import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fakeChrome } from '../fake-chrome.mjs';
import { setBadge, clearBadge, openPopup, openPopupWith } from '../../../extension/services/action.js';

describe('action service', () => {
  test('setBadge sets color, text and title for one tab', () => {
    const ch = fakeChrome();
    setBadge(7, { text: '✓', color: '#0a0', title: 'Saved to Work' });
    assert.deepEqual(ch.calls, [
      ['badgeColor', { tabId: 7, color: '#0a0' }],
      ['badgeText', { tabId: 7, text: '✓' }],
      ['title', { tabId: 7, title: 'Saved to Work' }],
    ]);
  });

  test('without a tab id the badge is global', () => {
    const ch = fakeChrome();
    setBadge(null, { text: '!', color: 'red', title: 't' });
    assert.ok(ch.calls.every(([, o]) => !('tabId' in o)));
  });

  test('clearBadge empties the text and brings back the manifest title', () => {
    const ch = fakeChrome({ manifest: { action: { default_title: 'Save to Tab Warehouse' } } });
    clearBadge(3);
    assert.deepEqual(ch.calls, [
      ['badgeText', { tabId: 3, text: '' }],
      ['title', { tabId: 3, title: 'Save to Tab Warehouse' }],
    ]);
  });

  test('a rejected badge call never throws', async () => {
    const ch = fakeChrome({ manifest: { action: { default_title: 'Save' } } });
    ch.action.setBadgeText = () => Promise.reject(new Error('tab closed'));
    assert.doesNotThrow(() => setBadge(1, { text: 'x', color: 'red', title: 't' }));
    assert.doesNotThrow(() => clearBadge(1));
    await new Promise((r) => setTimeout(r, 0));
  });

  test('openPopup opens the action popup', async () => {
    const ch = fakeChrome();
    await openPopup();
    assert.deepEqual(ch.calls, [['openPopup']]);
  });

  test('openPopupWith sets the popup for the tab, opens it, then sets it back', async () => {
    const ch = fakeChrome();
    await openPopupWith(5, 'palette.html', 'popup.html');
    assert.deepEqual(ch.calls, [['setPopup', { tabId: 5, popup: 'palette.html' }], ['openPopup'], ['setPopup', { tabId: 5, popup: 'popup.html' }]]);
  });

  test('openPopupWith sets the popup back when opening fails, and throws', async () => {
    const ch = fakeChrome();
    ch.action.openPopup = async () => {
      ch.calls.push(['openPopup']);
      throw new Error('no window');
    };
    await assert.rejects(openPopupWith(5, 'palette.html', 'popup.html'), /no window/);
    assert.deepEqual(ch.calls.at(-1), ['setPopup', { tabId: 5, popup: 'popup.html' }]);
    ch.action.setPopup = async () => {
      throw new Error('tab closed');
    };
    await assert.rejects(openPopupWith(5, 'palette.html', 'popup.html'), /tab closed/);
  });

  test('popup opens never overlap: each one waits until the popup is set back', async () => {
    const ch = fakeChrome();
    let release;
    ch.action.openPopup = () =>
      new Promise((r) => {
        ch.calls.push(['openPopup']);
        release = r;
      });
    const a = openPopupWith(5, 'palette.html', 'popup.html');
    const b = openPopupWith(null, 'palette.html', 'popup.html');
    const c = openPopup();
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(ch.calls, [['setPopup', { tabId: 5, popup: 'palette.html' }], ['openPopup']]);
    release();
    await a;
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(ch.calls.slice(2), [['setPopup', { tabId: 5, popup: 'popup.html' }], ['setPopup', { popup: 'palette.html' }], ['openPopup']]);
    release();
    await b;
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(ch.calls.slice(5), [['setPopup', { popup: 'popup.html' }], ['openPopup']]);
    release();
    await c;
  });
});
