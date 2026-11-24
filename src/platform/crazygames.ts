// CrazyGames, through its HTML5 SDK (v3): docs.crazygames.com/sdk.
//
// What the game takes from it, by the owner's word of 24 November 2026
// ("Let's use the crazygame's sdk / For retrieving player data"):
//
//   The save. It is kept in the SDK's data module, which has localStorage's
//   own four calls. For a guest the SDK keeps it in the browser; for a
//   player signed in to CrazyGames it is kept on their account and follows
//   them from one device to the next. The portal asks that a game using it
//   rely on it wholly, so on CrazyGames nothing else is read once it holds
//   a save.
//   Who is playing: their name on the portal, or nobody for a guest.
//   Its mute. The portal has a sound switch of its own, and its word comes
//   before the game's own setting.
//
// And what the portal asks of every game: to be told when loading starts
// and stops and when play starts and stops, and now and then that
// something is worth cheering.
//
// The SDK works only on CrazyGames' own pages and on localhost. Anywhere
// else it says it is "disabled" and every call throws, so nothing here
// trusts a call to come back: each is tried, and the game goes on without.

import type { Ads } from './ads';
import type { Store } from '../game/storage';

export interface CrazyUser {
  username: string;
  profilePictureUrl?: string;
}

/** As much of window.CrazyGames.SDK as the game uses, as its documentation gives it. */
export interface CrazySdk {
  init(): Promise<void>;
  /** "local" on localhost, "crazygames" on the portal, "disabled" anywhere else. */
  environment?: string;
  data: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
  };
  user: {
    getUser(): Promise<CrazyUser | null>;
    addAuthListener?(listener: (user: CrazyUser | null) => void): void;
  };
  game: {
    gameplayStart(): unknown;
    gameplayStop(): unknown;
    loadingStart(): unknown;
    loadingStop(): unknown;
    happytime(): unknown;
    settings?: { muteAudio?: boolean };
    addSettingsChangeListener?(listener: (settings: { muteAudio?: boolean }) => void): void;
  };
  ad: {
    requestAd(type: 'midgame' | 'rewarded', callbacks: { adStarted?: () => void; adFinished?: () => void; adError?: (error: unknown) => void }): unknown;
  };
}

export const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

/** Runs a call to the SDK that may throw, or come back as a promise that fails, and lets neither stop the game. */
function quietly(call: () => unknown): void {
  try {
    const r = call();
    if (r && typeof (r as Promise<unknown>).catch === 'function') (r as Promise<unknown>).catch(() => undefined);
  } catch {
    // The portal is not listening: the game goes on.
  }
}

/** Resolves with what a promise gives, or with `late` if it has not come in `ms`. */
function within<T>(p: Promise<T>, ms: number, late: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(late), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(late);
      },
    );
  });
}

/** Adds the SDK's script to the page. False if it did not come: blocked, offline, or too slow. */
function loadScript(doc: Document, ms: number): Promise<boolean> {
  return within(
    new Promise<boolean>((resolve) => {
      const tag = doc.createElement('script');
      tag.src = SDK_URL;
      tag.onload = () => resolve(true);
      tag.onerror = () => resolve(false);
      doc.head.appendChild(tag);
    }),
    ms,
    false,
  );
}

/**
 * Fetches the SDK and wakes it. Null if it did not come in time, would not
 * start, or says it is disabled here: then the game is on its own, as it is
 * everywhere else. It never waits longer than `ms` for either step, so a
 * portal that is slow does not keep the game from starting.
 */
export async function loadCrazySdk(win: Window, ms = 5000): Promise<CrazySdk | null> {
  const there = (): CrazySdk | undefined => (win as unknown as { CrazyGames?: { SDK?: CrazySdk } }).CrazyGames?.SDK;
  if (!there() && !(await loadScript(win.document, ms))) return null;
  const sdk = there();
  if (!sdk) return null;
  const started = await within(sdk.init().then(() => true), ms, false);
  if (!started || sdk.environment === 'disabled') return null;
  return sdk;
}

/**
 * The save's place on CrazyGames: the SDK's data module, with the browser's
 * own storage behind it. The module can refuse (it has to be switched on
 * for the game in the portal's submission form, and it holds a megabyte):
 * once it has, the browser's storage is used for the rest of the visit, so
 * that a setting missed on the portal costs the cloud and not the save.
 */
export class CrazyStore implements Store {
  private broken = false;

  constructor(private readonly sdk: CrazySdk, private readonly local: Store | null) {}

  getItem(key: string): string | null {
    if (!this.broken) {
      try {
        return this.sdk.data.getItem(key);
      } catch {
        this.broken = true;
      }
    }
    return this.local?.getItem(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (!this.broken) {
      try {
        this.sdk.data.setItem(key, value);
        return;
      } catch {
        this.broken = true;
      }
    }
    this.local?.setItem(key, value);
  }

  removeItem(key: string): void {
    if (!this.broken) {
      try {
        this.sdk.data.removeItem(key);
        return;
      } catch {
        this.broken = true;
      }
    }
    this.local?.removeItem(key);
  }

  /**
   * Brings over a save made before the game used the data module: if the
   * module holds none under this key and the browser does, the browser's is
   * copied in. The portal asks for this of a game that is already out.
   */
  adopt(key: string): void {
    if (!this.local || this.getItem(key) !== null || this.broken) return;
    let old: string | null = null;
    try {
      old = this.local.getItem(key);
    } catch {
      // Blocked: nothing to bring.
    }
    if (old) this.setItem(key, old);
  }
}

/** What the game is told to do when the portal says something. */
export interface CrazyHooks {
  /** The portal's sound switch: true to be silent, whatever the game's own setting says. */
  mute(on: boolean): void;
  /** The player signed in, and the save in the data module may now be their account's. */
  signedIn(user: CrazyUser | null): void;
}

/** The game's calls to a portal (ads.ts), sent to CrazyGames. */
export class CrazyGamesPortal implements Ads {
  /** Who is playing, once it is known: null for a guest. */
  user: CrazyUser | null = null;

  constructor(private readonly sdk: CrazySdk, private readonly hooks: CrazyHooks) {
    // Its sound switch, now and whenever it is thrown.
    hooks.mute(!!sdk.game.settings?.muteAudio);
    quietly(() => sdk.game.addSettingsChangeListener?.((settings) => hooks.mute(!!settings?.muteAudio)));
    // Who is playing. Signing out reloads the page, so only signing in is heard here.
    quietly(() =>
      sdk.user.getUser().then((user) => {
        this.user = user ?? null;
      }),
    );
    quietly(() =>
      sdk.user.addAuthListener?.((user) => {
        this.user = user ?? null;
        hooks.signedIn(this.user);
      }),
    );
    quietly(() => sdk.game.loadingStart());
  }

  async init(): Promise<void> {}

  /** A break between battles. The game is silent while the ad plays. */
  interstitial(): Promise<void> {
    return this.ad('midgame').then(() => undefined);
  }

  rewardedAd(): Promise<boolean> {
    return this.ad('rewarded');
  }

  private ad(type: 'midgame' | 'rewarded'): Promise<boolean> {
    return new Promise((resolve) => {
      const done = (shown: boolean): void => {
        this.hooks.mute(!!this.sdk.game.settings?.muteAudio);
        resolve(shown);
      };
      try {
        this.sdk.ad.requestAd(type, {
          adStarted: () => this.hooks.mute(true),
          adFinished: () => done(true),
          adError: () => done(false),
        });
      } catch {
        done(false);
      }
    });
  }

  gameplayStart(): void {
    quietly(() => this.sdk.game.gameplayStart());
  }

  gameplayStop(): void {
    quietly(() => this.sdk.game.gameplayStop());
  }

  loadingDone(): void {
    quietly(() => this.sdk.game.loadingStop());
  }

  happy(): void {
    quietly(() => this.sdk.game.happytime());
  }
}
