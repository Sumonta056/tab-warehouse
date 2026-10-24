import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SIDE_LOOK } from '../../../extension/constants/defaults.js';
import { THEMES } from '../../../extension/constants/themes.js';
import { sideLookVars, themeVars } from '../../../extension/domain/theme.js';

describe('themes', () => {
  test('preset sets all four accent tokens; unknown or empty falls back to blue', () => {
    assert.deepEqual(themeVars('green'), { '--accent': '#6fd99a', '--accent-bg': '#143122', '--accent-text': '#cdf5dc', '--accent-ink': '#06200f' });
    assert.deepEqual(themeVars('nope'), themeVars('blue'));
    assert.deepEqual(themeVars(undefined), themeVars('blue'));
    assert.equal(Object.keys(THEMES).length, 7);
  });
});

describe('themes', () => {
  test('custom hex derives tokens; ink is dark on light colors and white on dark colors', () => {
    const v = themeVars('#ff00aa');
    assert.equal(v['--accent'], '#ff00aa');
    assert.match(v['--accent-bg'], /color-mix/);
    assert.equal(themeVars('#ffff66')['--accent-ink'], '#111');
    assert.equal(themeVars('#202060')['--accent-ink'], '#fff');
    assert.deepEqual(themeVars('#ff00a'), themeVars('blue'));
  });
});

describe('sidebar look', () => {
  test('solid mode (or image mode without an image) is the plain color', () => {
    const solid = { '--side-color': '#1b1b1b', '--side-dark': '1', '--side-blur': '0px', '--side-img': 'none' };
    assert.deepEqual(sideLookVars(DEFAULT_SIDE_LOOK, 'data:x'), solid);
    assert.deepEqual(sideLookVars({ ...DEFAULT_SIDE_LOOK, mode: 'image' }, ''), solid);
  });
});

describe('sidebar look', () => {
  test('image mode uses the image, darkness and blur', () => {
    assert.deepEqual(sideLookVars({ mode: 'image', color: '#102030', dark: 55, blur: 8 }, 'data:x'), {
      '--side-color': '#102030',
      '--side-dark': '0.55',
      '--side-blur': '8px',
      '--side-img': 'url("data:x")',
    });
  });
});
