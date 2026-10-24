import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { commandLabel, shortcutKeys, isMac } from '../../../extension/domain/shortcuts.js';

describe('shortcuts', () => {
  test('shortcutKeys splits Windows and Linux keys on +', () => {
    assert.deepEqual(shortcutKeys('Ctrl+Shift+K'), ['Ctrl', 'Shift', 'K']);
    assert.deepEqual(shortcutKeys('Alt+Shift+Down'), ['Alt', 'Shift', 'Down']);
  });
  test('shortcutKeys splits Mac modifier symbols and keeps the key whole', () => {
    assert.deepEqual(shortcutKeys('⇧⌘B'), ['⇧', '⌘', 'B']);
    assert.deepEqual(shortcutKeys('⌥⇧Space'), ['⌥', '⇧', 'Space']);
    assert.deepEqual(shortcutKeys('F5'), ['F5']);
  });
  test('an empty shortcut has no keys', () => {
    assert.deepEqual(shortcutKeys(''), []);
    assert.deepEqual(shortcutKeys(undefined), []);
  });
  test('commandLabel names the known commands and falls back to the description', () => {
    assert.equal(commandLabel({ name: '_execute_action', description: '' }), 'Open the save popup');
    assert.equal(commandLabel({ name: 'quick-save', description: 'Save current tab without the popup' }), 'Quick save (no popup)');
    assert.equal(commandLabel({ name: 'palette', description: 'x' }), 'Open the command palette (on Tab Warehouse)');
    assert.equal(commandLabel({ name: 'other', description: 'Do a thing' }), 'Do a thing');
    assert.equal(commandLabel({ name: 'other' }), 'other');
  });
});

describe('isMac', () => {
  test('reads the platform string', () => {
    assert.equal(isMac('MacIntel'), true);
    assert.equal(isMac('macOS'), true);
    assert.equal(isMac('Win32'), false);
    assert.equal(isMac(''), false);
    assert.equal(isMac(undefined), false);
  });
});
