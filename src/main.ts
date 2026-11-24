import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import Phaser from 'phaser';
import { OUTLINE } from './art/kit/palette';
import { bank } from './audio/bank';
import { music } from './audio/music';
import { sfx } from './audio/sfx';
import { ads } from './platform/ads';
import { onAccount, startPortal } from './platform/portal';
import { fit, view } from './view/config';
import { AssetsScene } from './view/scenes/AssetsScene';
import { BootScene } from './view/scenes/BootScene';
import { GameScene } from './view/scenes/GameScene';
import { ListScene } from './view/scenes/ListScene';
import { ModalScene } from './view/scenes/ModalScene';
import { battle, commit, reloadSave, returned, save, takeEarned } from './view/session';

/**
 * Starts the game. A portal is looked for first, because where there is one
 * the save is in its keeping (platform/portal.ts): on CrazyGames it is with
 * the player's account. Anywhere else that takes no time at all.
 */
async function start(): Promise<void> {
  await startPortal();
  void ads().init();

  // A browser makes no sound until the page has been touched. Every touch asks again, as a phone may put the audio back to sleep.
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
    window.addEventListener(type, () => sfx.unlock(), { capture: true, passive: true });
  }
  // In a frame on a portal's page the game must not move that page: the wheel, the arrow keys and the space bar
  // would scroll it under the player, and a right click would put the browser's menu over the fight.
  window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') e.preventDefault();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // The canvas is the window, whatever shape that is, and is made again when the window changes.
  fit(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: view.width,
    height: view.height,
    backgroundColor: OUTLINE,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / view.density },
    input: { activePointers: 3 },
    // One texture to a batch, on every device: all the art of the fight is on one sheet, and it is what phones get anyway.
    render: { antialias: true, antialiasGL: view.density <= 1, roundPixels: false, maxTextures: 1, powerPreference: 'high-performance' },
    scene: [BootScene, AssetsScene, GameScene, ListScene, ModalScene],
  });

  let pending = 0;
  const refit = (): void => {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => {
      const before = `${view.width}x${view.height}`;
      fit(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
      if (`${view.width}x${view.height}` === before) return;
      game.scale.setZoom(1 / view.density);
      game.scale.resize(view.width, view.height);
      // Whatever is on the screen is laid out again for its new shape. The save and the fight are not the screen's, and go on.
      if (game.scene.isActive('Boot')) return;
      game.scene.stop('Modal');
      game.scene.getScene('Game').scene.restart();
    }, 120);
  };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);

  game.events.on('step', () => music.update());
  // A game in a tab nobody is looking at makes no noise, and what it does there is counted as time away.
  document.addEventListener('visibilitychange', () => {
    sfx.sleep(document.hidden);
    if (document.hidden) {
      commit();
      return;
    }
    returned();
    // Long enough away to have earned something worth saying: the card for it comes up over the fight.
    const earned = takeEarned();
    if (earned && game.scene.isActive('Game')) game.scene.getScene('Game').scene.launch('Modal', { kind: 'away', earned });
  });
  window.addEventListener('pagehide', () => commit());

  // For the browser console and for the scripts that walk the game.
  const w = window as unknown as Record<string, unknown>;
  w.game = game;
  w.sfx = sfx;
  w.music = music;
  w.bank = bank;
  w.save = save;
  w.battle = battle;
  w.view = view;

  // Signed in on the portal in the middle of a visit: the save kept there is the account's now.
  onAccount(() => {
    reloadSave();
    if (game.scene.isActive('Boot')) return;
    game.scene.stop('Modal');
    game.scene.getScene('Game').scene.restart();
  });
}

void start();
