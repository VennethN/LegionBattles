// What every scene shares: the manifest of the art, the camera set-up, and
// how the screen is cut into the fight and the lists.

import type Phaser from 'phaser';
import type { Manifest } from '../art/manifest';
import { view } from './config';

let manifest: Manifest | null = null;

export function setManifest(m: Manifest): void {
  manifest = m;
}

export function getManifest(): Manifest {
  if (!manifest) throw new Error('the art manifest has not loaded');
  return manifest;
}

/** Every scene is laid out in the view's units; its camera zooms them up to the canvas. */
export function setupCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setViewport(0, 0, view.width, view.height);
  cam.setZoom(view.zoom);
  cam.centerOn(view.w / 2, view.h / 2);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  /** Where the fight is shown. */
  stage: Rect;
  /** The whole of the lists' side: its head, its tabs and the list itself. */
  panel: Rect;
  head: Rect;
  tabs: Rect;
  list: Rect;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * How the screen is cut up. A wide screen has the fight on the left and the
 * lists down the right; a tall one has the fight on top and the lists
 * under it, where a thumb reaches.
 */
export function layout(): Layout {
  if (view.tall) {
    const stageH = Math.round(clamp(view.h * 0.46, 330, 640));
    const panel = { x: 0, y: stageH, w: view.w, h: view.h - stageH };
    const head = { x: 0, y: panel.y, w: view.w, h: 78 };
    const tabs = { x: 0, y: head.y + head.h, w: view.w, h: 58 };
    return { stage: { x: 0, y: 0, w: view.w, h: stageH }, panel, head, tabs, list: { x: 0, y: tabs.y + tabs.h, w: view.w, h: panel.h - head.h - tabs.h } };
  }
  const panelW = Math.round(clamp(view.w * 0.36, 400, 480));
  const panel = { x: view.w - panelW, y: 0, w: panelW, h: view.h };
  const head = { x: panel.x, y: 0, w: panelW, h: 92 };
  const tabs = { x: panel.x, y: head.h, w: panelW, h: 58 };
  return { stage: { x: 0, y: 0, w: view.w - panelW, h: view.h }, panel, head, tabs, list: { x: panel.x, y: tabs.y + tabs.h, w: panelW, h: view.h - head.h - tabs.h } };
}
