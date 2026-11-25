// How much of the light a player has asked for. It is kept beside the
// save, under a name of its own, and not in it: the save's shape belongs to
// the rules, and this is only about how the game is drawn on this machine.

export type LightMode = 'full' | 'low' | 'off';

const KEY = 'legion-holdout-light';
const MODES: readonly LightMode[] = ['full', 'low', 'off'];

let now: LightMode | null = null;
/** True once the player has chosen for themselves: from then on the game leaves the choice alone. */
let chosen = false;

export function lightMode(): LightMode {
  if (now) return now;
  let kept: string | null = null;
  try {
    kept = localStorage.getItem(KEY);
  } catch {
    // No storage: the light is as it comes.
  }
  now = MODES.includes(kept as LightMode) ? (kept as LightMode) : 'full';
  return now;
}

/** `byPlayer` says the player pressed for it, and it was not the game taking the light down by itself. */
export function setLightMode(mode: LightMode, byPlayer = false): void {
  now = mode;
  if (byPlayer) chosen = true;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Not kept, then.
  }
}

/** The next choice round: full, low, off, and full again. */
export function nextLightMode(mode: LightMode): LightMode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
}

export const LIGHT_NAMES: Record<LightMode, string> = { full: 'FULL', low: 'LOW', off: 'OFF' };

/** The game found frames slow and takes the light down a step, unless the player has chosen. It says whether it did. */
export function stepLightDown(): boolean {
  const mode = lightMode();
  if (chosen || mode === 'off') return false;
  setLightMode(mode === 'full' ? 'low' : 'off');
  return true;
}
