// What every screen shares: the manifest of the art, the camera set-up, and
// the colors of the tiers.

import type Phaser from 'phaser';
import type { Manifest } from '../art/manifest';
import { ARCANE, FIRE, FROST, LINEN, type Material } from '../art/kit/palette';
import { view } from './config';

let manifest: Manifest | null = null;

export function setManifest(m: Manifest): void {
  manifest = m;
}

export function getManifest(): Manifest {
  if (!manifest) throw new Error('the art manifest has not loaded');
  return manifest;
}

/** A screen is laid out in the view's units; its camera zooms them up to the canvas. */
export function setupCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setViewport(0, 0, view.width, view.height);
  cam.setZoom(view.zoom);
  cam.centerOn(view.w / 2, view.h / 2);
}

/** The color of each tier, plainest first: linen, then the blue of ice, the violet of the arcane, the orange of fire. */
export const TIER_MATS: readonly Material[] = [
  LINEN,
  { fill: FROST.fill, shade: FROST.shade },
  { fill: ARCANE.fill, shade: ARCANE.shade },
  { fill: FIRE.fill, shade: FIRE.shade },
];

/** The name of the scene whose loader brings pictures in while the game runs. It is never put away. */
export const ASSETS = 'Assets';

/**
 * A screen comes in: up a little and out of nothing, in a sixth of a second. Nothing pops. Called once, as a
 * screen is first made, not each time it draws itself again.
 */
export function comeIn(scene: Phaser.Scene, what?: Phaser.GameObjects.Container): void {
  if (what) {
    const y = what.y;
    what.setAlpha(0).setY(y + 14);
    scene.tweens.add({ targets: what, alpha: 1, y, duration: 180, ease: 'Cubic.easeOut' });
    return;
  }
  const cam = scene.cameras.main;
  cam.setAlpha(0);
  scene.tweens.add({ targets: cam, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });
}
