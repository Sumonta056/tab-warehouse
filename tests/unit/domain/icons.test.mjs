import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { googleIcon, letterIcon, webIconUrls } from '../../../extension/domain/icons.js';

describe('Home helpers', () => {
  test('googleIcon maps Google apps by host and Docs by path', () => {
    assert.match(googleIcon('https://mail.google.com/mail/u/0/#inbox'), /gmail_2020q4_48dp\.png$/);
    assert.match(googleIcon('https://drive.google.com/drive/u/0/my-drive'), /drive_/);
    assert.match(googleIcon('https://calendar.google.com/'), /calendar_/);
    assert.match(googleIcon('https://keep.google.com/u/0/#home'), /keep_/);
    assert.match(googleIcon('https://meet.google.com/abc'), /meet_/);
    assert.match(googleIcon('https://docs.google.com/spreadsheets/d/1'), /sheets_/);
    assert.match(googleIcon('https://docs.google.com/presentation/d/1'), /slides_/);
    assert.match(googleIcon('https://docs.google.com/forms/d/1'), /forms_/);
    assert.match(googleIcon('https://docs.google.com/document/d/1'), /docs_/);
    assert.match(googleIcon('https://docs.google.com/'), /docs_/);
  });
});

describe('Home helpers', () => {
  test('googleIcon is null for everything else', () => {
    assert.equal(googleIcon('https://www.google.com/'), null);
    assert.equal(googleIcon('https://gemini.google.com/app'), null);
    assert.equal(googleIcon('https://github.com'), null);
    assert.equal(googleIcon('bad'), null);
  });
});

describe('no built-in company or personal data', () => {
  test('letterIcon has no company special cases', () => {
    assert.equal(letterIcon({ url: 'https://shop.example.com/x', title: 'Shop API' }), 'Sh');
    assert.equal(letterIcon({ url: 'https://www.example.org/', title: 'News' }), 'Ne');
    assert.equal(letterIcon({ url: 'https://github.com/a', title: 'Repo' }), 'gh');
  });
});

describe('tileIconSrcs', () => {
  beforeEach(() => {
    globalThis.chrome = { runtime: { getURL: (p) => `chrome-extension://x${p}` } };
  });
  const web = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  test('local, IP and non-web links never go to the web icon service', async () => {
    assert.deepEqual(webIconUrls('http://localhost:3000/'), []);
    assert.deepEqual(webIconUrls('http://192.168.1.4/x'), []);
    assert.deepEqual(webIconUrls('chrome://extensions'), []);
    assert.deepEqual(webIconUrls('not a url'), []);
    assert.deepEqual(webIconUrls('https://daily.dev/'), [web('daily.dev')]);
  });
});
