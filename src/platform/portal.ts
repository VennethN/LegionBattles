// Which portal the game is on, and what it is given there.
//
// The game fetches nothing from the network on its own: the build that
// goes to GitHub Pages, or to a plain folder, never asks for a portal's
// SDK. It asks only when it is told it is on that portal:
//
//   built for it: npm run build:crazygames (VITE_PORTAL=crazygames), which
//     is the build to upload there;
//   run on one of its pages, by the page's own address;
//   asked to in the address, ?portal=crazygames, for trying it on
//     localhost, where the SDK runs in a local mode of its own.
//
// startPortal() is awaited before the save is read, because on a portal
// the save lives in the portal's keeping.

import { sfx } from '../audio/sfx';
import { SAVE_KEY, setStore, type Store } from '../game/storage';
import { setAds } from './ads';
import { CrazyGamesPortal, CrazyStore, loadCrazySdk, type CrazyUser } from './crazygames';

/** The portal this copy was built for, if it was built for one. */
function builtFor(): string {
  return ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_PORTAL ?? '').toLowerCase();
}

/** True when the game should ask for the CrazyGames SDK: built for it, on its pages, or asked to in the address. */
export function wantsCrazyGames(win: { location: { hostname: string; search: string } }, built = builtFor()): boolean {
  if (built === 'crazygames') return true;
  if (new URLSearchParams(win.location.search).get('portal') === 'crazygames') return true;
  return /(^|\.)crazygames\.com$/i.test(win.location.hostname);
}

let player: (() => CrazyUser | null) | null = null;
let account: (() => void) | null = null;

/** The player's name on the portal, or '' for a guest and anywhere there is no portal. */
export function playerName(): string {
  return player?.()?.username ?? '';
}

/** Says what to do when the player signs in on the portal in the middle of a visit: the save may now be their account's. */
export function onAccount(changed: () => void): void {
  account = changed;
}

/** The browser's own storage, or null where a frame is not let near it. */
function browserStore(win: Window): Store | null {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

/**
 * Finds the portal, if there is one, and hands the game over to it: the
 * save's place, the sound switch, the calls the portal wants. Resolves when
 * the save can be read. It never fails and never waits long: with no
 * portal, or one that does not answer, the game is as it is everywhere.
 */
export async function startPortal(win: Window = window): Promise<'crazygames' | 'none'> {
  if (!wantsCrazyGames(win)) return 'none';
  const sdk = await loadCrazySdk(win);
  if (!sdk) return 'none';
  const store = new CrazyStore(sdk, browserStore(win));
  store.adopt(SAVE_KEY);
  setStore(store);
  const portal = new CrazyGamesPortal(sdk, {
    mute: (on) => sfx.hush(on),
    signedIn: () => account?.(),
  });
  player = () => portal.user;
  setAds(portal);
  return 'crazygames';
}
