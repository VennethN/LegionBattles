// The player's save while the game runs. Scenes read it, change it through
// the rules in src/game, and call commit() to write it down.

import { sfx } from '../audio/sfx';
import { PLAYTIME_GAP } from '../data/rewards';
import { addPlaytime } from '../game/rewards';
import { startingSave, tidyTeam } from '../game/rules';
import { VOLUME_STEPS, type SaveData } from '../game/state';
import { loadSave, storeSave, wipeSave } from '../game/storage';
import { today } from './clock';

let current: SaveData | null = null;

function seed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export function save(): SaveData {
  if (!current) {
    const loaded = loadSave(seed());
    current = loaded.fresh || loaded.save.cards.length === 0 ? startingSave(seed()) : loaded.save;
    tidyTeam(current);
    applySound(current);
  }
  return current;
}

/** Puts the save's sound settings on the mix: on or off, and how loud the effects and the music are. */
export function applySound(s: SaveData): void {
  sfx.enabled = s.sound;
  sfx.setVolumes(s.settings.effects / VOLUME_STEPS, s.settings.music / VOLUME_STEPS);
}

export function commit(): void {
  if (current) storeSave(current);
}

let pending = 0;
let unsaved = 0;

/**
 * Counts time played, for the playtime rewards. The game calls it every
 * frame with the frame's length. A frame that took seconds was a hidden tab
 * or a sleeping phone, and is not play. It is written down every twenty
 * seconds, and with everything else whenever anything else is.
 */
export function countPlaytime(deltaMs: number): void {
  if (deltaMs <= 0 || deltaMs > PLAYTIME_GAP * 1000) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  pending += deltaMs;
  if (pending < 1000) return;
  const seconds = Math.floor(pending / 1000);
  pending -= seconds * 1000;
  addPlaytime(save(), seconds, today());
  unsaved += seconds;
  if (unsaved >= 20) {
    unsaved = 0;
    commit();
  }
}

/** Turns the sound on or off, and remembers it. Returns how it now is. */
export function toggleSound(): boolean {
  const s = save();
  s.sound = !s.sound;
  sfx.enabled = s.sound;
  commit();
  return s.sound;
}

/** Starts the game over. For the debug overlay and the tests. */
export function reset(): SaveData {
  wipeSave();
  current = startingSave(seed());
  applySound(current);
  commit();
  return current;
}
