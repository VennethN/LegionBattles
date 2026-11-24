// The one place that touches where the save is kept. That is the browser's
// own storage, unless a portal has given the game somewhere else
// (platform/portal.ts): CrazyGames keeps a player's save with their
// account. A portal may also run the game in a frame where storage is
// blocked; then the game still plays and simply forgets when the page is
// closed.

import { repair, type SaveData } from './state';

export const SAVE_KEY = 'legion-idle-save';

/** As much of the browser's storage as the save needs. A portal's own storage has the same three calls. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let given: Store | null = null;

/** Keeps the save somewhere other than the browser's own storage from here on. */
export function setStore(store: Store | null): void {
  given = store;
}

function store(): Store {
  return given ?? window.localStorage;
}

export function loadSave(seed: number): { save: SaveData; fresh: boolean } {
  try {
    const text = store().getItem(SAVE_KEY);
    if (text) return { save: repair(JSON.parse(text), seed), fresh: false };
  } catch {
    // Blocked, full or not JSON: start again.
  }
  return { save: repair(null, seed), fresh: true };
}

export function storeSave(save: SaveData): void {
  try {
    store().setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Nothing to do: the game goes on unsaved.
  }
}

export function wipeSave(): void {
  try {
    store().removeItem(SAVE_KEY);
  } catch {
    // As above.
  }
}
