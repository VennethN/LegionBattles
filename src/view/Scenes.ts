// The painted scenes: the ground of a battle and the map of a world's
// stages. Each is one picture the size of the screen, far too big to keep
// three or six of at once on a phone, so one of a kind is held at a time:
// asking for another lets the last go.

import Phaser from 'phaser';
import { H, RES, W } from './config';

/**
 * The picture at assets/<folder>/<name>.svg, on the screen under everything
 * else of the scene: all of the screen, or the rectangle given. It comes
 * when it has loaded, and `shown` is called with it then.
 */
export function scenePicture(
  scene: Phaser.Scene,
  folder: 'board' | 'maps' | 'tiles',
  name: string,
  depth = 0,
  rect: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: W, h: H },
  shown?: (image: Phaser.GameObjects.Image) => void,
): void {
  const key = `scene:${folder}:${name}`;
  const show = (): void => {
    // The scene may have gone, or come back as another land, while the picture loaded.
    if (!scene.sys.isActive() && !scene.sys.isVisible()) return;
    if (!scene.textures.exists(key)) return;
    const image = scene.add.image(rect.x, rect.y, key).setOrigin(0, 0).setDisplaySize(rect.w, rect.h).setDepth(depth);
    shown?.(image);
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

/**
 * Asks the browser for a painted scene's file ahead of the scene that will
 * show it, so that it is at hand when that scene asks: a land's ground,
 * while the result of the last battle of the land before it is read. Nothing
 * is made of it here.
 */
export function warmPicture(folder: 'board' | 'maps' | 'tiles', name: string): void {
  if (typeof fetch !== 'function') return;
  void fetch(`assets/${folder}/${name}.svg`).catch(() => undefined);
}
