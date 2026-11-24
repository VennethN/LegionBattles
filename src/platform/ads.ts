// Where a portal's SDK will plug in. The game calls these and nothing else,
// so adding CrazyGames or Poki later is one new class and one call to
// setAds. For now every call does nothing and succeeds.

export interface Ads {
  /** Called once, before the first scene. */
  init(): Promise<void>;
  /** A break between battles. Resolves when the game may go on. */
  interstitial(): Promise<void>;
  /** An ad the player chose to watch. Resolves true if the reward is earned. */
  rewardedAd(): Promise<boolean>;
  /** The portals ask to be told when play starts and stops. */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Loading has finished. */
  loadingDone(): void;
  /** Something worth cheering has happened: a boss has fallen for the first time. Rare, by the portals' own asking. */
  happy(): void;
}

export class NoAds implements Ads {
  async init(): Promise<void> {}
  async interstitial(): Promise<void> {}
  async rewardedAd(): Promise<boolean> {
    return true;
  }
  gameplayStart(): void {}
  gameplayStop(): void {}
  loadingDone(): void {}
  happy(): void {}
}

let current: Ads = new NoAds();

export function ads(): Ads {
  return current;
}

export function setAds(next: Ads): void {
  current = next;
}
