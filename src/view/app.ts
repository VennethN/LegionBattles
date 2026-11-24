// What every scene shares: the manifest of the art, and the camera set-up.

import type Phaser from 'phaser';
import type { Manifest } from '../art/manifest';
import { H, RES, W } from './config';

let manifest: Manifest | null = null;

export function setManifest(m: Manifest): void {
  manifest = m;
}

export function getManifest(): Manifest {
  if (!manifest) throw new Error('the art manifest has not loaded');
  return manifest;
}

/** Every scene is laid out on 1280 by 720; the camera zooms that up to the canvas. */
export function setupCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(RES);
  cam.centerOn(W / 2, H / 2);
}
