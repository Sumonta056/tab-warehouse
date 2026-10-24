import { DEFAULT_BOARD, DEFAULT_HOME, DEFAULT_SETTINGS, DEFAULT_SIDE_LOOK } from '../constants/defaults.js';

export function brandName(settings) {
  const name = (settings?.userName || '').trim();
  return name ? `${name}'s Warehouse` : 'Tab Warehouse';
}

export function withDefaults(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    home: { ...DEFAULT_HOME, ...(settings?.home || {}) },
    sideLook: { ...DEFAULT_SIDE_LOOK, ...(settings?.sideLook || {}) },
    board: { ...DEFAULT_BOARD, ...(settings?.board || {}) },
  };
}
