import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dupKey, findDuplicates, findSaved } from '../../../extension/domain/duplicates.js';
import { L } from '../fixtures.mjs';

describe('duplicates', () => {
  const ids = (xs) => xs.map((x) => x.id);

  test('dupKey: a trailing slash and host case do not matter; query and hash do', () => {
    assert.equal(dupKey('https://A.example.com/x/'), dupKey('https://a.example.com/x'));
    assert.equal(dupKey('http://localhost:3000/'), dupKey('http://localhost:3000'));
    assert.notEqual(dupKey('https://a.com/x?id=1'), dupKey('https://a.com/x?id=2'));
    assert.notEqual(dupKey('https://a.com/x#top'), dupKey('https://a.com/x'));
    assert.notEqual(dupKey('http://a.com/x'), dupKey('https://a.com/x'));
    assert.equal(dupKey('not a url'), 'not a url');
  });
  test('dupKey loose: drops the hash and tracking parameters, keeps the others', () => {
    const plain = dupKey('https://a.com/x?q=a%20b', true);
    assert.equal(dupKey('https://a.com/x?q=a%20b&utm_source=slack&gclid=1&fbclid=2#intro', true), plain);
    assert.equal(dupKey('https://a.com/x?utm_medium=mail', true), dupKey('https://a.com/x', true));
    assert.notEqual(dupKey('https://a.com/x?q=other', true), plain);
    assert.notEqual(dupKey('https://a.com/x?utm_source=1'), dupKey('https://a.com/x'));
  });
  test('findDuplicates: only addresses saved twice or more, oldest first', () => {
    const links = [
      { ...L('1', 'A', 'https://a.com/x'), dateAdded: 30 },
      { ...L('2', 'B', 'https://b.com/'), dateAdded: 10 },
      { ...L('3', 'A again', 'https://a.com/x/'), dateAdded: 20 },
      { ...L('4', 'A tracked', 'https://a.com/x?utm_source=1'), dateAdded: 5 },
    ];
    const g = findDuplicates(links);
    assert.equal(g.length, 1);
    assert.deepEqual(ids(g[0].links), ['3', '1']);
    const loose = findDuplicates(links, true);
    assert.deepEqual(ids(loose[0].links), ['4', '3', '1']);
    assert.deepEqual(ids(links), ['1', '2', '3', '4']);
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

  test('findSaved: an exact address matches, with its folder path', () => {
    const hits = findSaved(tree(), 'https://shop.example.com/api/x');
    assert.deepEqual(
      hits.map((b) => [b.id, b.path]),
      [['31', 'Bookmarks bar › My Links › Shop API']],
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

  test('findSaved: tracking parameters, #part and a trailing slash still match', () => {
    assert.deepEqual(
      findSaved(tree(), 'https://shop.example.com/api/x/?utm_source=mail&gclid=1#top').map((b) => b.id),
      ['31'],
    );
    assert.deepEqual(
      findSaved(tree(), 'https://example.com').map((b) => b.id),
      ['71'],
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

  test('findSaved: another page or another query does not match', () => {
    assert.deepEqual(findSaved(tree(), 'https://shop.example.com/api/y'), []);
    assert.deepEqual(findSaved(tree(), 'https://shop.example.com/api/x?id=2'), []);
  });
});
