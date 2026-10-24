import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { omniboxSuggestions, omniboxTarget, xmlEscape } from '../../../extension/domain/omnibox.js';
import { sections } from '../../../extension/domain/tree.js';
import { L, F } from '../fixtures.mjs';

describe('omnibox', () => {
  const tree = F('r', 'R', [
    F('a', 'Shop', [
      L('1', 'Orders admin', 'https://shop.example.com/admin/orders'),
      L('2', 'Order <b> & "quotes"', 'https://test.shop.example.com/x?a=1&b=2'),
      L('3', 'Checkout', 'https://shop.example.com/orders/cart'),
    ]),
  ]);
  const secs = sections(tree, []);
  const rules = [
    { pattern: 'test.shop', env: 'TEST' },
    { pattern: 'shop.example', env: 'PROD' },
  ];

  test('xmlEscape escapes the 5 XML characters', () => {
    assert.equal(xmlEscape(`<a href="x">Tom's & co</a>`), '&lt;a href=&quot;x&quot;&gt;Tom&apos;s &amp; co&lt;/a&gt;');
  });
  test('suggestions: title matches first, escaped, matches marked, URL as content', () => {
    const s = omniboxSuggestions(secs, 'order', {}, rules);
    assert.deepEqual(
      s.map((x) => x.content),
      ['https://shop.example.com/admin/orders', 'https://test.shop.example.com/x?a=1&b=2', 'https://shop.example.com/orders/cart'],
    );
    assert.equal(
      s[1].description,
      '<match>Order</match> &lt;b&gt; &amp; &quot;quotes&quot; <dim>TEST · Shop</dim> <url>test.shop.example.com/x?a=1&amp;b=2</url>',
    );
    assert.equal(s[2].description, 'Checkout <dim>PROD · Shop</dim> <url>shop.example.com/<match>order</match>s/cart</url>');
  });
  test('suggestions: a label word filters; empty text and max', () => {
    assert.deepEqual(
      omniboxSuggestions(secs, 'test', {}, rules).map((x) => x.content),
      ['https://test.shop.example.com/x?a=1&b=2'],
    );
    assert.deepEqual(omniboxSuggestions(secs, '   ', {}, rules), []);
    assert.equal(omniboxSuggestions(secs, 'shop', {}, rules, 2).length, 2);
  });
  test('target: a picked suggestion opens its URL; typed text opens the warehouse search', () => {
    assert.equal(omniboxTarget('https://a.com/x', 'chrome-extension://id/newtab.html'), 'https://a.com/x');
    assert.equal(omniboxTarget(' prod orders ', 'chrome-extension://id/newtab.html'), 'chrome-extension://id/newtab.html?q=prod%20orders');
    assert.equal(omniboxTarget('a&b', 'n.html'), 'n.html?q=a%26b');
  });
});
