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
import { ArenaScene } from './view/scenes/ArenaScene';
import { AssetsScene } from './view/scenes/AssetsScene';
import { BootScene } from './view/scenes/BootScene';
import { CampScene } from './view/scenes/CampScene';
import { HudScene } from './view/scenes/HudScene';
import { ResultScene } from './view/scenes/ResultScene';
import { TitleScene } from './view/scenes/TitleScene';
import { commit, reloadSave, save, stage, theRun, theWorld } from './view/session';

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
  // would scroll it under the player, and a right click would put the browser's menu over the field.
  window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') e.preventDefault();
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
    // One texture to a batch, on every device: all the art of the field is on one sheet, and it is what phones get anyway.
    render: { antialias: true, antialiasGL: view.density <= 1, roundPixels: false, maxTextures: 2, powerPreference: 'high-performance' },
    scene: [BootScene, AssetsScene, TitleScene, ArenaScene, HudScene, CampScene, ResultScene],
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
      // Whatever is on the screen is laid out again for its new shape. The run and the wave are not the screen's, and go on.
      if (game.scene.isActive('Boot')) return;
      const m = game.scene;
      if (m.isActive('Title')) m.getScene('Title').scene.restart();
      else if (m.isActive('Arena') || m.isPaused('Arena')) {
        const over = m.isActive('Camp') ? 'Camp' : m.isActive('Result') ? 'Result' : '';
        m.stop('Hud');
        if (over) m.stop(over);
        m.getScene('Arena').scene.restart({ keep: true, over });
      }
    }, 120);
  };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);

  game.events.on('step', () => music.update());
  // A game in a tab nobody is looking at makes no noise.
  document.addEventListener('visibilitychange', () => {
    sfx.sleep(document.hidden);
    if (document.hidden) commit();
  });
  window.addEventListener('pagehide', () => commit());

  // For the browser console and for the scripts that walk the game.
  const w = window as unknown as Record<string, unknown>;
  w.game = game;
  w.sfx = sfx;
  w.music = music;
  w.bank = bank;
  w.save = save;
  w.run = theRun;
  w.world = theWorld;
  w.view = view;
  w.stage = stage;

  // Signed in on the portal in the middle of a visit: the save kept there is the account's now.
  onAccount(() => {
    reloadSave();
    if (game.scene.isActive('Boot')) return;
    for (const key of ['Hud', 'Camp', 'Result', 'Arena']) game.scene.stop(key);
    game.scene.start('Title');
  });
}

void start();
