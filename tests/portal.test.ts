import { afterEach, describe, expect, it } from 'vitest';
import { Sfx } from '../src/audio/sfx';
import { SAVE_KEY, loadSave, setStore, storeSave, wipeSave, type Store } from '../src/game/storage';
import { startingSave } from '../src/game/rules';
import { NoAds, ads, setAds } from '../src/platform/ads';
import { CrazyGamesPortal, CrazyStore, loadCrazySdk, type CrazySdk, type CrazyUser } from '../src/platform/crazygames';
import { playerName, startPortal, wantsCrazyGames } from '../src/platform/portal';
import { fakeAudio } from './audio';

/** A place to keep things that has the browser storage's own calls. */
function memory(start: Record<string, string> = {}): Store & { held: Record<string, string> } {
  const held = { ...start };
  return {
    held,
    getItem: (k) => (k in held ? held[k] : null),
    setItem: (k, v) => {
      held[k] = String(v);
    },
    removeItem: (k) => {
      delete held[k];
    },
  };
}

interface FakeSdk extends CrazySdk {
  /** Everything the game told it, in order. */
  told: string[];
  kept: Record<string, string>;
  /** What the portal can do to the game. */
  signIn(user: CrazyUser): void;
  setMute(on: boolean): void;
  ads: Array<{ type: string; callbacks: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void } }>;
}

/** A stand-in for window.CrazyGames.SDK, with the calls its documentation gives. */
function fakeSdk(o: { environment?: string; user?: CrazyUser | null; mute?: boolean; data?: Record<string, string>; dataOff?: boolean; init?: () => Promise<void> } = {}): FakeSdk {
  const told: string[] = [];
  const kept = { ...(o.data ?? {}) };
  const auth: Array<(u: CrazyUser | null) => void> = [];
  const settings: Array<(s: { muteAudio?: boolean }) => void> = [];
  const off = (): never => {
    // What the portal throws when the data module was not switched on for the game.
    throw { code: 'dataModuleDisabled', message: 'the data module is disabled' };
  };
  const sdk: FakeSdk = {
    told,
    kept,
    ads: [],
    environment: o.environment ?? 'crazygames',
    init: o.init ?? (async () => { told.push('init'); }),
    data: {
      getItem: (k) => (o.dataOff ? off() : k in kept ? kept[k] : null),
      setItem: (k, v) => { if (o.dataOff) off(); kept[k] = String(v); },
      removeItem: (k) => { if (o.dataOff) off(); delete kept[k]; },
      clear: () => { for (const k of Object.keys(kept)) delete kept[k]; },
    },
    user: {
      getUser: async () => o.user ?? null,
      addAuthListener: (l) => { auth.push(l); },
    },
    game: {
      gameplayStart: () => { told.push('gameplayStart'); },
      gameplayStop: () => { told.push('gameplayStop'); },
      loadingStart: () => { told.push('loadingStart'); },
      loadingStop: () => { told.push('loadingStop'); },
      happytime: () => { told.push('happytime'); },
      settings: { muteAudio: !!o.mute },
      addSettingsChangeListener: (l) => { settings.push(l); },
    },
    ad: {
      requestAd: (type, callbacks) => { sdk.ads.push({ type, callbacks }); },
    },
    signIn: (user) => { for (const l of auth) l(user); },
    setMute: (on) => {
      sdk.game.settings = { muteAudio: on };
      for (const l of settings) l({ muteAudio: on });
    },
  };
  return sdk;
}

/** A page with the SDK already on it, at an address. */
function page(sdk: CrazySdk | null, hostname: string, search = '', local: Store | null = memory()): Window {
  return { location: { hostname, search }, CrazyGames: sdk ? { SDK: sdk } : undefined, localStorage: local, document: {} } as unknown as Window;
}

const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  setStore(null);
  setAds(new NoAds());
});

describe('which portal the game is on', () => {
  it('asks for the CrazyGames SDK only when built for it, on its pages, or told to in the address', () => {
    const at = (hostname: string, search = ''): { location: { hostname: string; search: string } } => ({ location: { hostname, search } });
    expect(wantsCrazyGames(at('www.crazygames.com'), '')).toBe(true);
    expect(wantsCrazyGames(at('legion-battles.game-files.crazygames.com'), '')).toBe(true);
    expect(wantsCrazyGames(at('crazygames.com'), '')).toBe(true);
    expect(wantsCrazyGames(at('localhost', '?portal=crazygames'), '')).toBe(true);
    expect(wantsCrazyGames(at('someone.github.io'), 'crazygames')).toBe(true);
    // Anywhere else nothing is fetched: not on GitHub Pages, not on a page that only sounds like the portal.
    expect(wantsCrazyGames(at('someone.github.io'), '')).toBe(false);
    expect(wantsCrazyGames(at('localhost'), '')).toBe(false);
    expect(wantsCrazyGames(at('notcrazygames.com'), '')).toBe(false);
    expect(wantsCrazyGames(at('crazygames.com.evil.example'), '')).toBe(false);
    expect(wantsCrazyGames(at('localhost', '?portal=poki'), '')).toBe(false);
  });

  it('with no portal the game is left exactly as it was', async () => {
    const before = ads();
    const sdk = fakeSdk();
    expect(await startPortal(page(sdk, 'someone.github.io'))).toBe('none');
    expect(sdk.told).toEqual([]);
    expect(ads()).toBe(before);
    expect(playerName()).toBe('');
  });
});

describe('the CrazyGames SDK', () => {
  it('is woken before anything is asked of it, and is not used where it says it is disabled', async () => {
    const sdk = fakeSdk();
    expect(await loadCrazySdk(page(sdk, 'www.crazygames.com'))).toBe(sdk);
    expect(sdk.told).toEqual(['init']);
    // On a page that is not the portal's, every call would throw: the game does without.
    expect(await loadCrazySdk(page(fakeSdk({ environment: 'disabled' }), 'example.com'))).toBeNull();
    // Its local mode, on localhost, is used: it is how the game is tried before it is uploaded.
    expect(await loadCrazySdk(page(fakeSdk({ environment: 'local' }), 'localhost'))).not.toBeNull();
  });

  it('never keeps the game waiting: an SDK that does not answer, or fails, is done without', async () => {
    const never = fakeSdk({ init: () => new Promise<void>(() => undefined) });
    const t0 = Date.now();
    expect(await loadCrazySdk(page(never, 'www.crazygames.com'), 40)).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
    const broken = fakeSdk({ init: () => Promise.reject(new Error('no')) });
    expect(await loadCrazySdk(page(broken, 'www.crazygames.com'), 40)).toBeNull();
  });
});

describe('the save on CrazyGames', () => {
  it('is kept in the data module, and read back from it', async () => {
    const sdk = fakeSdk();
    const local = memory();
    expect(await startPortal(page(sdk, 'www.crazygames.com', '', local))).toBe('crazygames');
    const save = startingSave(7);
    save.coins = 4321;
    storeSave(save);
    expect(Object.keys(sdk.kept)).toEqual([SAVE_KEY]);
    // Nothing of it is written to the browser's own storage: the portal asks that the module be relied on wholly.
    expect(local.held).toEqual({});
    const back = loadSave(1);
    expect(back.fresh).toBe(false);
    expect(back.save.coins).toBe(4321);
    wipeSave();
    expect(sdk.kept).toEqual({});
    expect(loadSave(1).fresh).toBe(true);
  });

  it('a save from before the game used the module is brought into it once, and one already there is not written over', () => {
    const old = JSON.stringify({ ...startingSave(3), coins: 999 });
    const fresh = fakeSdk();
    new CrazyStore(fresh, memory({ [SAVE_KEY]: old })).adopt(SAVE_KEY);
    expect(fresh.kept[SAVE_KEY]).toBe(old);
    // A player whose account already holds a save keeps that one.
    const theirs = fakeSdk({ data: { [SAVE_KEY]: 'the account\'s' } });
    new CrazyStore(theirs, memory({ [SAVE_KEY]: old })).adopt(SAVE_KEY);
    expect(theirs.kept[SAVE_KEY]).toBe('the account\'s');
    // And with nothing to bring, nothing is written.
    const none = fakeSdk();
    new CrazyStore(none, memory()).adopt(SAVE_KEY);
    expect(none.kept).toEqual({});
  });

  it('a module that refuses costs the cloud and not the save: the browser keeps it instead', () => {
    const sdk = fakeSdk({ dataOff: true });
    const local = memory();
    const store = new CrazyStore(sdk, local);
    expect(store.getItem(SAVE_KEY)).toBeNull();
    expect(() => store.setItem(SAVE_KEY, 'kept')).not.toThrow();
    expect(local.held[SAVE_KEY]).toBe('kept');
    expect(store.getItem(SAVE_KEY)).toBe('kept');
    store.removeItem(SAVE_KEY);
    expect(local.held).toEqual({});
    // With no storage at all behind it, it still does not throw.
    const bare = new CrazyStore(fakeSdk({ dataOff: true }), null);
    expect(() => bare.setItem('a', 'b')).not.toThrow();
    expect(bare.getItem('a')).toBeNull();
  });
});

describe('what the portal is told, and what it tells', () => {
  it('hears of loading and of play, and of a boss that falls', async () => {
    const sdk = fakeSdk();
    await startPortal(page(sdk, 'www.crazygames.com'));
    expect(sdk.told).toEqual(['init', 'loadingStart']);
    ads().loadingDone();
    ads().gameplayStart();
    ads().gameplayStop();
    ads().happy();
    expect(sdk.told.slice(2)).toEqual(['loadingStop', 'gameplayStart', 'gameplayStop', 'happytime']);
  });

  it('a portal that throws at every call does not stop the game', () => {
    const sdk = fakeSdk();
    const boom = (): never => { throw new Error('sdkDisabled'); };
    sdk.game.gameplayStart = boom;
    sdk.game.gameplayStop = () => Promise.reject(new Error('later'));
    sdk.game.loadingStart = boom;
    sdk.game.loadingStop = boom;
    sdk.game.happytime = boom;
    sdk.user.getUser = boom;
    sdk.ad.requestAd = boom;
    let portal!: CrazyGamesPortal;
    expect(() => { portal = new CrazyGamesPortal(sdk, { mute: () => undefined, signedIn: () => undefined }); }).not.toThrow();
    expect(() => { portal.gameplayStart(); portal.gameplayStop(); portal.loadingDone(); portal.happy(); }).not.toThrow();
    return expect(portal.rewardedAd()).resolves.toBe(false);
  });

  it('says who is playing, and when they sign in the save is read again', async () => {
    const sdk = fakeSdk({ user: { username: 'SingingCheese.TLNU' } });
    const heard: Array<string | null> = [];
    const portal = new CrazyGamesPortal(sdk, { mute: () => undefined, signedIn: (u) => heard.push(u?.username ?? null) });
    await settle();
    expect(portal.user?.username).toBe('SingingCheese.TLNU');
    // A guest is nobody.
    const guest = new CrazyGamesPortal(fakeSdk(), { mute: () => undefined, signedIn: () => undefined });
    await settle();
    expect(guest.user).toBeNull();
    sdk.signIn({ username: 'Another.One' });
    expect(heard).toEqual(['Another.One']);
    expect(portal.user?.username).toBe('Another.One');
  });

  it('its sound switch is obeyed from the start and whenever it is thrown', () => {
    const muted: boolean[] = [];
    const sdk = fakeSdk({ mute: true });
    new CrazyGamesPortal(sdk, { mute: (on) => muted.push(on), signedIn: () => undefined });
    expect(muted).toEqual([true]);
    sdk.setMute(false);
    sdk.setMute(true);
    expect(muted).toEqual([true, false, true]);
  });

  it('an ad silences the game while it plays, and says whether it was watched', async () => {
    const muted: boolean[] = [];
    const sdk = fakeSdk();
    const portal = new CrazyGamesPortal(sdk, { mute: (on) => muted.push(on), signedIn: () => undefined });
    muted.length = 0;
    const watched = portal.rewardedAd();
    expect(sdk.ads[0].type).toBe('rewarded');
    sdk.ads[0].callbacks.adStarted?.();
    expect(muted).toEqual([true]);
    sdk.ads[0].callbacks.adFinished?.();
    expect(await watched).toBe(true);
    expect(muted).toEqual([true, false]);
    const skipped = portal.interstitial();
    expect(sdk.ads[1].type).toBe('midgame');
    sdk.ads[1].callbacks.adError?.({ code: 'unfilled' });
    await expect(skipped).resolves.toBeUndefined();
  });
});

describe('the portal\'s mute and the game\'s own sound', () => {
  it('hushed, nothing is made, whatever the player has set; and their setting is as they left it', () => {
    const f = fakeAudio();
    const s = new Sfx(() => f.ctx);
    s.unlock();
    s.setVolumes(0.8, 0.5);
    s.hush(true);
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
    // The music has nowhere to play either.
    expect(s.out).toBeNull();
    expect(s.enabled).toBe(true);
    // The player turning sound on in the game's own settings does not bring it back.
    s.enabled = true;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
    s.hush(false);
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBeGreaterThan(0);
    expect(s.out).not.toBeNull();
    // And unhushed, the player's own switch is still theirs.
    s.enabled = false;
    f.clock.t += 1;
    const before = f.made.osc + f.made.noise;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(before);
  });
});
