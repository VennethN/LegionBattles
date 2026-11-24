import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import Phaser from 'phaser';
import { GRASS } from './art/kit/palette';
import { sfx } from './audio/sfx';
import { ads } from './platform/ads';
import { applyResolution, watchFrameRate } from './view/app';
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

void ads().init();

// A browser makes no sound until the page has been touched. Every touch asks
// again, as a phone may put the audio back to sleep.
for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
  window.addEventListener(type, () => sfx.unlock(), { capture: true, passive: true });
}

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
  scene: [BootScene, MainScene, BattleScene, TeamScene, IndexScene, ShopScene, MapScene, HallScene, VentureScene, PlayerScene],
});

watchFrameRate(game);

// For the browser console and for the screenshot script.
(window as unknown as { game: Phaser.Game; sfx: typeof sfx }).game = game;
(window as unknown as { sfx: typeof sfx }).sfx = sfx;
(window as unknown as { setRes: (res: number) => void }).setRes = (res) => applyResolution(game, res);
