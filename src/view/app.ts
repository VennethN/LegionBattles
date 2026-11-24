// What every scene shares: the manifest of the art, and the camera set-up.

import type Phaser from 'phaser';
import type { Manifest } from '../art/manifest';
import { H, RES, RES_ADAPTS, W, setRes } from './config';

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

/** Draws the game at another resolution from now on: the canvas is resized and every camera zooms to match. */
export function applyResolution(game: Phaser.Game, res: number): void {
  setRes(res);
  game.scale.setGameSize(W * res, H * res);
  for (const scene of game.scene.getScenes(false)) {
    const cam = scene.cameras?.main;
    if (!cam) continue;
    cam.setSize(W * res, H * res);
    setupCamera(scene);
  }
}

/**
 * Watches how long frames take, and lowers the resolution a step when most
 * of them are slow: twice in a row over two seconds each, so that a hitch
 * while art loads does not count. It never raises it again: a machine that
 * was slow once is not asked twice. A resolution asked for in the address
 * is left alone.
 */
export function watchFrameRate(game: Phaser.Game): void {
  if (!RES_ADAPTS) return;
  const WINDOW = 120;
  let frames = 0;
  let slow = 0;
  let strikes = 0;
  game.events.on('step', (_time: number, delta: number) => {
    // A tab that was hidden comes back with one huge frame: that is not slowness.
    if (delta > 250 || document.hidden) return;
    frames++;
    // Slower than 45 frames a second.
    if (delta > 22) slow++;
    if (frames < WINDOW) return;
    strikes = slow > WINDOW * 0.6 ? strikes + 1 : 0;
    frames = 0;
    slow = 0;
    if (strikes >= 2 && RES > 1) {
      strikes = 0;
      applyResolution(game, Math.max(1, RES - 0.5));
    }
  });
}
