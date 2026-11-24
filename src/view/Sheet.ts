// One sheet for all the art of a battle, and one for the menus' cards.
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
// The effects and the icons are packed at start and never move:
// sprites all over the game hold their frames. Units are packed under them
// as battles need them and kept. If the sheet fills up, only the units are
// wiped, and the battle that is starting packs its own again.

import Phaser from 'phaser';
import type { Manifest, ManifestImage, ManifestPart } from '../art/manifest';
import { ART_SCALE } from './config';
import { ShelfPacker } from './packer';

/** Everything a battle draws but the ground under it: effects, icons, digits, unit parts. */
export const SHEET = 'sheet';
/** What the menus draw: whole units for cards, the packs, the grade badges. */
export const CARDS = 'cards';
export const SHEET_SIZE = 2048;
/**
 * The card sheet is taller than it is wide. Every unit is on it twice, and
 * with the buildings, the traps and the Faithful they no longer fit a
 * square: three quarters more height holds them, with room for the units
 * still to come, and is inside the 4096 any phone's graphics take.
 */
export const CARDS_HEIGHT = 3584;

export type Folder = 'fx' | 'icons' | 'packs' | 'grades';

export interface UnitKey {
  team: string;
  unit: string;
}

export class Sheet {
  private texture: Phaser.Textures.CanvasTexture;
  private packer: ShelfPacker;
  private packed = new Set<string>();
  /** The frames of units, which a wipe takes away. */
  private unitFrames: string[] = [];
  /** Where the units' part of the sheet starts, once seal() has been called. */
  private base: [number, number, number] | null = null;

  constructor(
    game: Phaser.Game,
    readonly manifest: Manifest,
    readonly key: string = SHEET,
    readonly height: number = SHEET_SIZE,
  ) {
    const t = game.textures.createCanvas(key, SHEET_SIZE, height);
    if (!t) throw new Error('sheet: could not make the canvas');
    this.texture = t;
    this.packer = new ShelfPacker(SHEET_SIZE, height);
  }

  static unitFrame(team: string, unit: string, part: string): string {
    return `units/${team}/${unit}/${part}`;
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
    const spot = this.packer.place(w, h);
    if (!spot) return false;
    this.texture.context.drawImage(source, sx, sy, w, h, spot.x, spot.y, w, h);
    const f = this.texture.add(frame, 0, spot.x, spot.y, w, h);
    if (f && origin) {
      // A sprite given this frame turns about this point without being told.
      f.customPivot = true;
      f.pivotX = origin[0];
      f.pivotY = origin[1];
    }
    return true;
  }

  /** Packs a picture that stays for good: an effect, a tile, an icon. `box` cuts it to part of itself. */
  keep(
    frame: string,
    source: CanvasImageSource,
    w: number,
    h: number,
    origin: readonly [number, number] | null,
    box: readonly [number, number] = [0, 0],
  ): void {
    if (this.base) throw new Error('sheet: nothing more is kept once the units have their part');
    if (!this.draw(frame, source, box[0], box[1], w, h, origin)) throw new Error(`sheet "${this.key}": no room for ${frame}`);
  }

  /** Queues the pictures of a folder of the manifest on a scene's loader. */
  queue(scene: Phaser.Scene, folder: Folder): void {
    for (const name of Object.keys(this.manifest[folder])) {
      scene.load.svg(`svg:${folder}/${name}`, `assets/${folder}/${name}.svg`, { scale: ART_SCALE });
    }
  }

  /** Packs what `queue` loaded. Frames are named like "fx/arrow". */
  keepFolder(scene: Phaser.Scene, folder: Folder, short: string): void {
    const list = (Object.entries(this.manifest[folder]) as Array<[string, ManifestImage]>).sort((a, b) => b[1].height - a[1].height);
    for (const [name, img] of list) {
      const key = `svg:${folder}/${name}`;
      const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      this.keep(`${short}/${name}`, source, img.width * ART_SCALE, img.height * ART_SCALE, img.origin);
      scene.textures.remove(key);
    }
  }

  /** Everything kept is in. From here down, the sheet is the units'. */
  seal(): void {
    this.packer.newRow();
    this.base = this.packer.mark();
    this.texture.refresh();
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
      // Out of room. Take the other units off and pack only what this battle needs.
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

  /** All of these units, or none of them. Their parts go in tallest first, which wastes least. */
  private pack(scene: Phaser.Scene, keys: readonly UnitKey[]): boolean {
    const todo: Array<{ k: UnitKey; part: ManifestPart; w: number; h: number }> = [];
    for (const k of keys) {
      if (this.has(k)) continue;
      for (const part of this.manifest.units[k.unit].parts) {
        todo.push({ k, part, w: part.box[2] * ART_SCALE, h: part.box[3] * ART_SCALE });
      }
    }
    todo.sort((a, b) => b.h - a.h);
    if (!this.packer.fits(todo.map((t) => [t.w, t.h] as const))) return false;
    for (const t of todo) {
      const frame = Sheet.unitFrame(t.k.team, t.k.unit, t.part.name);
      const key = `svg:${frame}`;
      const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const [bx, by, bw, bh] = t.part.box;
      // A part's box is on the canvas; its file has a margin of page round that.
      const m = this.manifest.margin;
      this.draw(frame, source, (bx + m) * ART_SCALE, (by + m) * ART_SCALE, t.w, t.h, [(t.part.pivot[0] - bx) / bw, (t.part.pivot[1] - by) / bh]);
      this.unitFrames.push(frame);
      scene.textures.remove(key);
    }
    for (const k of keys) this.packed.add(`${k.team}/${k.unit}`);
    this.texture.refresh();
    return true;
  }

  /** Takes every unit off the sheet. What was kept at start is not touched. */
  private wipe(): void {
    if (!this.base) return;
    for (const name of this.unitFrames) this.texture.remove(name);
    this.unitFrames = [];
    this.packed.clear();
    this.packer.restore(this.base);
    const top = this.base[1];
    this.texture.context.clearRect(0, top, SHEET_SIZE, this.height - top);
  }

  /** How much of the sheet is used, for the debug overlay. */
  usage(): string {
    return `${this.packed.size} units, ${Math.round(100 * this.packer.used())}% of ${SHEET_SIZE}px`;
  }
}

let shared: Sheet | null = null;
let sharedCards: Sheet | null = null;

export function sheet(game: Phaser.Game, manifest: Manifest): Sheet {
  if (!shared) shared = new Sheet(game, manifest);
  return shared;
}

export function cardSheet(game: Phaser.Game, manifest: Manifest): Sheet {
  if (!sharedCards) sharedCards = new Sheet(game, manifest, CARDS, CARDS_HEIGHT);
  return sharedCards;
}

/** A whole unit standing still, for cards and menus. Blue ones are drawn at 2x, red at 1x. */
export function portraitFrame(team: string, unit: string): string {
  return `portrait/${team}/${unit}`;
}
