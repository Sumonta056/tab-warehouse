import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { quickSave, quickSaveBadge, quickSaveTarget } from '../../../extension/domain/quick-save.js';

describe('quick save', () => {
  const tree = () => ({
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'My Links',
            children: [
              { id: '30', title: 'Shop API', children: [{ id: '31', title: 'Shop', url: 'https://shop.example.com/api/x' }] },
              { id: '40', title: 'Empty', children: [] },
              { id: '60', title: 'Loose', url: 'https://loose.example.com/' },
            ],
          },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [{ id: '70', title: 'Home', children: [{ id: '71', title: 'Ex', url: 'https://example.com/' }] }] },
    ],
  });
  const settings = { rootName: 'My Links', lastSaveFolder: null };

  test('quickSaveTarget: the last save folder while it exists, else the root', () => {
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '40' }, tree()), '40');
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '999' }, tree()), '10');
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '60' }, tree()), '10');
    assert.equal(quickSaveTarget({ ...settings, lastSaveFolder: '70' }, tree()), '10');
    assert.equal(quickSaveTarget(settings, tree()), '10');
  });
});

describe('quick save', () => {
  const tree = () => ({
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'My Links',
            children: [
              { id: '30', title: 'Shop API', children: [{ id: '31', title: 'Shop', url: 'https://shop.example.com/api/x' }] },
              { id: '40', title: 'Empty', children: [] },
              { id: '60', title: 'Loose', url: 'https://loose.example.com/' },
            ],
          },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [{ id: '70', title: 'Home', children: [{ id: '71', title: 'Ex', url: 'https://example.com/' }] }] },
    ],
  });
  const settings = { rootName: 'My Links', lastSaveFolder: null };

  test('quickSave: saves a new page into the target folder with the tab title', () => {
    assert.deepEqual(quickSave({ ...settings, lastSaveFolder: '40' }, tree(), { title: 'New', url: 'https://new.example.com/a' }), {
      kind: 'save',
      parentId: '40',
      folder: 'Empty',
      title: 'New',
      url: 'https://new.example.com/a',
    });
    assert.equal(quickSave(settings, tree(), { title: '', url: 'file:///x.html' }).title, 'file:///x.html');
  });
});

describe('quick save', () => {
  const tree = () => ({
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'My Links',
            children: [
              { id: '30', title: 'Shop API', children: [{ id: '31', title: 'Shop', url: 'https://shop.example.com/api/x' }] },
              { id: '40', title: 'Empty', children: [] },
              { id: '60', title: 'Loose', url: 'https://loose.example.com/' },
            ],
          },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [{ id: '70', title: 'Home', children: [{ id: '71', title: 'Ex', url: 'https://example.com/' }] }] },
    ],
  });
  const settings = { rootName: 'My Links', lastSaveFolder: null };

  test('quickSave: an address that is already saved is a duplicate', () => {
    const r = quickSave(settings, tree(), { title: 'Shop', url: 'https://shop.example.com/api/x#top' });
    assert.equal(r.kind, 'dup');
    assert.deepEqual(
      r.hits.map((b) => b.id),
      ['31'],
    );
  });
});

describe('quick save', () => {
  const tree = () => ({
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'My Links',
            children: [
              { id: '30', title: 'Shop API', children: [{ id: '31', title: 'Shop', url: 'https://shop.example.com/api/x' }] },
              { id: '40', title: 'Empty', children: [] },
              { id: '60', title: 'Loose', url: 'https://loose.example.com/' },
            ],
          },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [{ id: '70', title: 'Home', children: [{ id: '71', title: 'Ex', url: 'https://example.com/' }] }] },
    ],
  });
  const settings = { rootName: 'My Links', lastSaveFolder: null };

  test('quickSave: no tab or a page that is not http(s)/file is skipped', () => {
    assert.deepEqual(quickSave(settings, tree(), undefined), { kind: 'skip' });
    assert.deepEqual(quickSave(settings, tree(), { url: 'chrome://extensions/' }), { kind: 'skip' });
    assert.deepEqual(quickSave(settings, tree(), { url: '' }), { kind: 'skip' });
  });
});

describe('quick save', () => {
  const tree = () => ({
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        title: 'Bookmarks bar',
        children: [
          {
            id: '10',
            title: 'My Links',
            children: [
              { id: '30', title: 'Shop API', children: [{ id: '31', title: 'Shop', url: 'https://shop.example.com/api/x' }] },
              { id: '40', title: 'Empty', children: [] },
              { id: '60', title: 'Loose', url: 'https://loose.example.com/' },
            ],
          },
        ],
      },
      { id: '2', title: 'Other bookmarks', children: [{ id: '70', title: 'Home', children: [{ id: '71', title: 'Ex', url: 'https://example.com/' }] }] },
    ],
  });
  const settings = { rootName: 'My Links', lastSaveFolder: null };

  test('quickSaveBadge: ✓ green, ! orange with the path, – grey', () => {
    assert.deepEqual(quickSaveBadge({ kind: 'save', folder: 'Empty' }), { text: '✓', color: '#1e8e3e', title: 'Saved to Empty' });
    assert.deepEqual(quickSaveBadge({ kind: 'dup', hits: [{ path: 'A › B' }] }), { text: '!', color: '#e8710a', title: 'Already in A › B' });
    assert.equal(quickSaveBadge({ kind: 'skip' }).text, '–');
    assert.equal(quickSaveBadge({ kind: 'error', message: 'x' }).title, 'Could not save: x');
  });
});
