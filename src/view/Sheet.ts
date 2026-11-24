// One sheet for all the art.
//
// Every picture is an SVG file, rasterized at 2x by Phaser's SVG loader. Left
// as they are, each would be a texture of its own, and a unit part would be a
// 384 by 384 texture that is mostly empty. So each is cut to its own corners
// and packed onto one big canvas texture. Everything on the board then draws
// from one texture, which is one batch: phones are held to one texture a
// batch (Phaser's autoMobileTextures), and so is this game everywhere
// (maxTextures in main.ts), so a second texture in the middle of the units
// would cost a draw call every time.
//
// The effects, the board and the icons are packed at start and stay. Units
// are packed as battles need them and kept. If the sheet fills up it is
// wiped and packed again with only what is asked for.

import Phaser from 'phaser';
import type { Manifest, ManifestImage, ManifestPart } from '../art/manifest';
import { ART_SCALE } from './config';

export const SHEET = 'sheet';
const SIZE = 2048;
const PAD = 2;

export interface UnitKey {
  team: string;
  unit: string;
}

interface Kept {
  frame: string;
  source: CanvasImageSource;
  w: number;
  h: number;
  origin: readonly [number, number] | null;
}

export class Sheet {
  private texture: Phaser.Textures.CanvasTexture;
  private packed = new Set<string>();
  private frames: string[] = [];
  /** What is packed at start and must survive a wipe. */
  private kept: Kept[] = [];
  private penX = PAD;
  private penY = PAD;
  private rowH = 0;

  constructor(
    game: Phaser.Game,
    readonly manifest: Manifest,
  ) {
    const t = game.textures.createCanvas(SHEET, SIZE, SIZE);
    if (!t) throw new Error('sheet: could not make the canvas');
    this.texture = t;
  }

  static unitFrame(team: string, unit: string, part: string): string {
    return `units/${team}/${unit}/${part}`;
  }

  /** Room for a w by h picture, or null if there is none left. */
  private place(w: number, h: number): { x: number; y: number } | null {
    if (this.penX + w + PAD > SIZE) {
      this.penX = PAD;
      this.penY += this.rowH + PAD;
      this.rowH = 0;
    }
    if (this.penY + h + PAD > SIZE) return null;
    const spot = { x: this.penX, y: this.penY };
    this.penX += w + PAD;
    this.rowH = Math.max(this.rowH, h);
    return spot;
  }

  private draw(
    frame: string,
    source: CanvasImageSource,
    sx: number,
    sy: number,
    w: number,
    h: number,
    origin: readonly [number, number] | null,
  ): boolean {
    const spot = this.place(w, h);
    if (!spot) return false;
    this.texture.context.drawImage(source, sx, sy, w, h, spot.x, spot.y, w, h);
    const f = this.texture.add(frame, 0, spot.x, spot.y, w, h);
    if (f && origin) {
      // A sprite given this frame turns about this point without being told.
      f.customPivot = true;
      f.pivotX = origin[0];
      f.pivotY = origin[1];
    }
    this.frames.push(frame);
    return true;
  }

  /** Packs a whole picture that stays for good: an effect, a tile, an icon. */
  keep(frame: string, source: CanvasImageSource, w: number, h: number, origin: readonly [number, number] | null): void {
    this.kept.push({ frame, source, w, h, origin });
    if (!this.draw(frame, source, 0, 0, w, h, origin)) throw new Error('sheet: no room for what must always be there');
  }

  /** Queues the pictures of a folder of the manifest (fx, board, icons) on a scene's loader. */
  queue(scene: Phaser.Scene, folder: 'fx' | 'board' | 'icons'): void {
    for (const name of Object.keys(this.manifest[folder])) {
      scene.load.svg(`svg:${folder}/${name}`, `assets/${folder}/${name}.svg`, { scale: ART_SCALE });
    }
  }

  /** Packs what `queue` loaded. Frames are named like "fx/arrow". */
  keepFolder(scene: Phaser.Scene, folder: 'fx' | 'board' | 'icons', short: string): void {
    for (const [name, img] of Object.entries(this.manifest[folder]) as Array<[string, ManifestImage]>) {
      const source = scene.textures.get(`svg:${folder}/${name}`).getSourceImage() as HTMLImageElement;
      this.keep(`${short}/${name}`, source, img.width * ART_SCALE, img.height * ART_SCALE, img.origin);
    }
  }

  refresh(): void {
    this.texture.refresh();
  }

  has(k: UnitKey): boolean {
    return this.packed.has(`${k.team}/${k.unit}`);
  }

  /** Loads and packs whatever of these units is not on the sheet yet. */
  ensure(scene: Phaser.Scene, wanted: readonly UnitKey[]): Promise<void> {
    const seen = new Set<string>();
    const list = wanted.filter((k) => {
      const id = `${k.team}/${k.unit}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const missing = list.filter((k) => !this.has(k));
    if (missing.length === 0) return Promise.resolve();
    return this.load(scene, missing).then(() => {
      if (this.pack(scene, missing)) return undefined;
      // Out of room. Start the sheet again with only what this battle needs.
      this.wipe();
      return this.load(scene, list).then(() => {
        if (!this.pack(scene, list)) throw new Error('sheet: one battle does not fit');
      });
    });
  }

  private load(scene: Phaser.Scene, keys: readonly UnitKey[]): Promise<void> {
    return new Promise((resolve) => {
      let queued = 0;
      for (const k of keys) {
        for (const part of this.manifest.units[k.unit].parts) {
          const key = `svg:${Sheet.unitFrame(k.team, k.unit, part.name)}`;
          if (scene.textures.exists(key)) continue;
          scene.load.svg(key, `assets/units/${k.team}/${k.unit}/${part.name}.svg`, { scale: ART_SCALE });
          queued++;
        }
      }
      if (queued === 0) {
        resolve();
        return;
      }
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.start();
    });
  }

  private pack(scene: Phaser.Scene, keys: readonly UnitKey[]): boolean {
    for (const k of keys) {
      if (this.has(k)) continue;
      const parts: ManifestPart[] = this.manifest.units[k.unit].parts;
      // The whole unit, or none of it: check for room before drawing any part.
      const save = [this.penX, this.penY, this.rowH];
      let fits = true;
      for (const part of parts) {
        if (!this.place(part.box[2] * ART_SCALE, part.box[3] * ART_SCALE)) {
          fits = false;
          break;
        }
      }
      [this.penX, this.penY, this.rowH] = save;
      if (!fits) return false;
      for (const part of parts) {
        const frame = Sheet.unitFrame(k.team, k.unit, part.name);
        const key = `svg:${frame}`;
        const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
        const [bx, by, bw, bh] = part.box;
        this.draw(frame, source, bx * ART_SCALE, by * ART_SCALE, bw * ART_SCALE, bh * ART_SCALE, [
          (part.pivot[0] - bx) / bw,
          (part.pivot[1] - by) / bh,
        ]);
        scene.textures.remove(key);
      }
      this.packed.add(`${k.team}/${k.unit}`);
    }
    this.texture.refresh();
    return true;
  }

  private wipe(): void {
    for (const name of this.frames) this.texture.remove(name);
    this.frames = [];
    this.packed.clear();
    this.texture.context.clearRect(0, 0, SIZE, SIZE);
    this.penX = PAD;
    this.penY = PAD;
    this.rowH = 0;
    for (const k of this.kept) this.draw(k.frame, k.source, 0, 0, k.w, k.h, k.origin);
  }

  /** How much of the sheet is used, for the debug overlay. */
  usage(): string {
    return `${this.packed.size} units, ${Math.round((100 * (this.penY + this.rowH)) / SIZE)}% of ${SIZE}px`;
  }
}

let shared: Sheet | null = null;

export function sheet(game: Phaser.Game, manifest: Manifest): Sheet {
  if (!shared) shared = new Sheet(game, manifest);
  return shared;
}
