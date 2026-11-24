// The one place that touches the browser's storage. A portal may run the
// game in a frame where storage is blocked; then the game still plays and
// simply forgets when the page is closed.

import { repair, type SaveData } from './state';

const KEY = 'legion-battles-save';

export function loadSave(seed: number): { save: SaveData; fresh: boolean } {
  try {
    const text = window.localStorage.getItem(KEY);
    if (text) return { save: repair(JSON.parse(text), seed), fresh: false };
  } catch {
    // Blocked, full or not JSON: start again.
  }
  return { save: repair(null, seed), fresh: true };
}

export function storeSave(save: SaveData): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Nothing to do: the game goes on unsaved.
  }
}

export function wipeSave(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // As above.
  }
}
