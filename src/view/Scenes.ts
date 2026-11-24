// The painted scenes: the ground of a battle and the map of a world's
// stages. Each is one picture the size of the screen, far too big to keep
// three or six of at once on a phone, so one of a kind is held at a time:
// asking for another lets the last go.

import Phaser from 'phaser';
import { H, RES, W } from './config';

/** The picture at assets/<folder>/<name>.svg, on the screen under everything else of the scene. It comes when it has loaded. */
export function scenePicture(scene: Phaser.Scene, folder: 'board' | 'maps', name: string, depth = 0): void {
  const key = `scene:${folder}:${name}`;
  const show = (): void => {
    // The scene may have gone, or come back as another land, while the picture loaded.
    if (!scene.sys.isActive() && !scene.sys.isVisible()) return;
    if (!scene.textures.exists(key)) return;
    scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(W, H).setDepth(depth);
  };
  if (scene.textures.exists(key)) {
    show();
    return;
  }
  // The other pictures of this kind are let go. Nothing shows them now: one scene has a board, and one a map.
  for (const other of scene.textures.getTextureKeys()) {
    if (other.startsWith(`scene:${folder}:`) && other !== key) scene.textures.remove(other);
  }
  scene.load.svg(key, `assets/${folder}/${name}.svg`, { scale: Math.max(1, RES) });
  scene.load.once(`filecomplete-svg-${key}`, show);
  scene.load.start();
}
