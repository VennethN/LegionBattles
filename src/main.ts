import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import Phaser from 'phaser';
import { GRASS } from './art/kit/palette';
import { bank } from './audio/bank';
import { music } from './audio/music';
import { sfx } from './audio/sfx';
import { ads } from './platform/ads';
import { onAccount, startPortal } from './platform/portal';
import { applyResolution, screenOf, startGraphics, watchFrameRate } from './view/app';
import { addDays } from './view/clock';
import { H, RES, W } from './view/config';
import { BattleScene } from './view/scenes/BattleScene';
import { BootScene } from './view/scenes/BootScene';
import { HallScene } from './view/scenes/HallScene';
import { IndexScene } from './view/scenes/IndexScene';
import { PlayerScene } from './view/scenes/PlayerScene';
import { MainScene } from './view/scenes/MainScene';
import { ShopScene } from './view/scenes/ShopScene';
import { TeamScene } from './view/scenes/TeamScene';
import { VentureScene } from './view/scenes/VentureScene';
import { MapScene } from './view/scenes/MapScene';
import { RewardsScene } from './view/scenes/RewardsScene';
import { SettingsScene } from './view/scenes/SettingsScene';
import { countPlaytime, reloadSave, save } from './view/session';

/**
 * Starts the game. A portal is looked for first, because where there is one
 * the save is in its keeping (platform/portal.ts): on CrazyGames it is with
 * the player's account. Anywhere else that takes no time at all.
 */
async function start(): Promise<void> {
  await startPortal();
  void ads().init();


  // A browser makes no sound until the page has been touched. Every touch asks
  // again, as a phone may put the audio back to sleep.
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
    window.addEventListener(type, () => sfx.unlock(), { capture: true, passive: true });
  }

  // In a frame on a portal's page the game must not move that page: the wheel, the arrow keys and the space bar
  // would scroll it under the player, and a right click would put the browser's menu over the board. CrazyGames
  // lists these among the fixes it asks every HTML5 game for.
  window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') e.preventDefault();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // The graphics setting says what the canvas is drawn at, from its first frame.
  startGraphics(save().settings.graphics);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W * RES,
    height: H * RES,
    backgroundColor: GRASS.dark,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    // One texture to a batch, on every device. All the art is on one sheet
    // (view/Sheet.ts), so this costs nothing, and it is what phones get anyway.
    // With more, a software GL (the headless browser the screenshots are taken
    // in) draws half of some sprites.
    //
    // Textures are smoothed (antialias), but the canvas itself is multisampled
    // only at the layout's own size: on a dense screen the canvas is already
    // drawn at up to twice that, and sampling every pixel of it four times
    // over is the dearest thing a weak graphics chip can be asked for. The
    // faster of two graphics chips is asked for where there are two.
    render: { antialias: true, antialiasGL: RES <= 1, roundPixels: false, maxTextures: 1, powerPreference: 'high-performance' },
    scene: [BootScene, MainScene, BattleScene, TeamScene, IndexScene, ShopScene, MapScene, HallScene, VentureScene, PlayerScene, RewardsScene, SettingsScene],
  });

  watchFrameRate(game);
  // Time played is counted whatever screen is up, and the music is written down a little ahead of the clock.
  game.events.on('step', (_time: number, delta: number) => {
    countPlaytime(delta);
    music.update();
  });
  // A game in a tab nobody is looking at makes no noise.
  document.addEventListener('visibilitychange', () => sfx.sleep(document.hidden));

  // For the browser console and for the screenshot script.
  (window as unknown as { game: Phaser.Game; sfx: typeof sfx }).game = game;
  (window as unknown as { sfx: typeof sfx }).sfx = sfx;
  (window as unknown as { music: typeof music }).music = music;
  (window as unknown as { bank: typeof bank }).bank = bank;
  (window as unknown as { setRes: (res: number) => void }).setRes = (res) => applyResolution(game, res);
  (window as unknown as { addDays: (n: number) => number }).addDays = addDays;
  (window as unknown as { screenOf: (x: number, y: number) => { x: number; y: number } }).screenOf = (x, y) => screenOf(game, x, y);

  // Signed in on the portal in the middle of a visit: the save kept there is the account's now. Whatever is
  // open is shut and the main screen is made again from it. While the game is still loading there is nothing to make again.
  onAccount(() => {
    reloadSave();
    const open = game.scene.getScenes(true).map((sc) => sc.scene.key);
    if (open.includes('Boot') || open.length === 0) return;
    for (const key of open) game.scene.stop(key);
    game.scene.start('Main');
  });
}

void start();
