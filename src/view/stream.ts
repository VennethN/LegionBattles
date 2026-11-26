// What the game brings in after it is already being played. The boot loads
// only what the first screen needs (a new player's first wave, or the title
// for someone back), and the rest comes in the background here, one thing
// after another so that nothing it fetches is in the way of a wave's own
// pictures: the sounds and music, every hero's and companion's picture for
// the lists, the ground behind the Upgrades screen, and the units of the
// lands ahead, the nearest first. The owner: "can we get rid of loading bars
// and instead have it asynchronously loading? this is so players get more
// quickly into the game".
//
// A screen that needs something that has not come yet asks for it here and
// waits for it (`portraits`), showing the game's mark turning meanwhile: it
// never blocks a wave.

import Phaser from 'phaser';
import type { Manifest } from '../art/manifest';
import { bank, fillBank } from '../audio/bank';
import { COMPANIONS, HEROES, LANDS_DEF, waveOf } from '../game/data';
import { ART_SCALE, view } from './config';
import { bundle, svgUrl, unitBundles } from './art/bundles';
import { cardSheet, portraitFrame } from './art/Sheet';
import { HOLD_PLACES } from './icons';
import { ads } from '../platform/ads';

/** The scene whose loader the background uses: one of its own, so that a wave's loads never wait on it. */
export const STREAM = 'Stream';

export class StreamScene extends Phaser.Scene {
  constructor() {
    super(STREAM);
  }
}

/** Everyone the lists show a whole picture of. */
export const LISTED: readonly string[] = [...HEROES.map((h) => h.unit), ...COMPANIONS.map((c) => c.unit), ...HOLD_PLACES];

let kept = new Set<string>();
let queue: Promise<void> = Promise.resolve();

/** Runs `job` after whatever the background is doing now: one load at a time on the stream's loader. */
function next<T>(job: () => Promise<T>): Promise<T> {
  const p = queue.then(job, job);
  queue = p.then(
    () => undefined,
    () => undefined,
  );
  return p;
}

/** Loads files on a scene's loader and resolves when they are in. */
function loadOn(scene: Phaser.Scene, add: (load: Phaser.Loader.LoaderPlugin) => number): Promise<void> {
  return new Promise((resolve) => {
    if (add(scene.load) === 0) {
      resolve();
      return;
    }
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.start();
  });
}

/** True once a unit's whole picture is on the lists' sheet. */
export function hasPortrait(unit: string): boolean {
  return kept.has(unit);
}

/**
 * Puts these units' whole pictures on the lists' sheet, on `scene`'s loader. The boot calls it for the first
 * screen's; `portraits` for the rest.
 */
export function keepPortraits(scene: Phaser.Scene, manifest: Manifest, units: readonly string[]): Promise<void> {
  const want = [...new Set(units)].filter((u) => !kept.has(u) && manifest.units[u]);
  if (want.length === 0) return Promise.resolve();
  return unitBundles(want.map((unit) => ({ team: 'blue', unit })))
    .then(() =>
      loadOn(scene, (load) => {
        let n = 0;
        for (const unit of want) {
          const key = `svg:portrait/blue/${unit}`;
          if (scene.textures.exists(key)) continue;
          load.svg(key, svgUrl(`assets/units/blue/${unit}/full.svg`), { scale: ART_SCALE });
          n++;
        }
        return n;
      }),
    )
    .then(() => {
      const cards = cardSheet(scene.game, manifest);
      // Tallest first, which wastes least of the sheet.
      const sorted = want.filter((u) => scene.textures.exists(`svg:portrait/blue/${u}`)).sort((a, b) => manifest.units[b].full[3] - manifest.units[a].full[3]);
      for (const unit of sorted) {
        const key = `svg:portrait/blue/${unit}`;
        const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
        // A list's picture stands on its feet: the frame turns about the middle of the ground under it.
        const box = manifest.units[unit].full;
        cards.keep(
          portraitFrame('blue', unit),
          source,
          Math.round(box[2] * ART_SCALE),
          Math.round(box[3] * ART_SCALE),
          [(96 - box[0]) / box[2], (180 - box[1]) / box[3]],
          [(box[0] + manifest.margin) * ART_SCALE, (box[1] + manifest.margin) * ART_SCALE],
        );
        scene.textures.remove(key);
        kept.add(unit);
      }
      cards.refresh();
    });
}

/** Every listed picture, at once and ahead of anything else the background has still to do. */
export function portraits(game: Phaser.Game, manifest: Manifest): Promise<void> {
  if (LISTED.every((u) => kept.has(u) || !manifest.units[u])) return Promise.resolve();
  return keepPortraits(game.scene.getScene(STREAM), manifest, LISTED);
}

let started = false;
let live = false;

/**
 * The first screen can be played: the portal is told loading is done (not when everything is in, which may be a
 * minute later), and the rest starts coming in behind it.
 */
export function playable(game: Phaser.Game, manifest: Manifest, wave: number): void {
  if (!live) {
    live = true;
    ads().loadingDone();
  }
  streamRest(game, manifest, wave);
}

/**
 * Starts bringing in the rest, once the first screen can be played. `land` is where the run stands: its land's
 * units and then the next land's come before the far ones.
 */
export function streamRest(game: Phaser.Game, manifest: Manifest, wave: number): void {
  if (started) return;
  started = true;
  const scene = game.scene.getScene(STREAM);
  // The band waits for its instruments rather than starting on stand-ins and changing halfway through.
  if (bank.state === 'empty') bank.state = 'loading';
  void next(() =>
    loadOn(scene, (load) => {
      load.binary('audio-bank', 'assets/audio/bank.bin');
      return 1;
    }).then(() => fillBank(scene.cache.binary.get('audio-bank') as ArrayBuffer | undefined)),
  );
  void next(() => keepPortraits(scene, manifest, LISTED));
  void next(() =>
    loadOn(scene, (load) => {
      if (scene.textures.exists('hold:ground')) return 0;
      // The Upgrades screen's own ground: the meadow, small. It is only ever seen dim and behind things.
      load.svg('hold:ground', 'assets/arena/meadow-wide.svg', { scale: 0.5 });
      return 1;
    }),
  );
  // The lands ahead, nearest first: only their files are fetched here, and each is packed when its wave comes.
  const at = Math.max(0, LANDS_DEF.findIndex((l) => l.id === waveOf(wave).land));
  for (let i = 0; i < LANDS_DEF.length; i++) {
    const land = LANDS_DEF[(at + i) % LANDS_DEF.length];
    const units = [...land.roster.map(([id]) => id), land.boss].filter((u) => manifest.units[u]);
    void next(() => unitBundles(units.map((unit) => ({ team: 'red', unit }))));
  }
  void next(() => Promise.all(LISTED.filter((u) => manifest.units[u]).map((unit) => bundle(`units/blue/${unit}`))).then(() => undefined));
}

/** For a test: forget what was kept. */
export function resetStream(): void {
  kept = new Set();
  started = false;
  live = false;
  queue = Promise.resolve();
}

/** The game's small mark turning: what a screen shows while what it needs is still coming. Never a bar. */
export function spinner(scene: Phaser.Scene, x: number, y: number, size = 56): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists('mark')) return null;
  const img = scene.add.image(x, y, 'mark').setDepth(1000);
  img.setDisplaySize(size, size);
  scene.tweens.add({ targets: img, angle: 360, duration: 1400, repeat: -1 });
  return img;
}

/**
 * True if every listed picture and the screen's ground are in, so that a list can be made. If not, the screen shows
 * the mark turning, asks for them ahead of anything else, and starts again when they have come.
 */
export function listsReady(scene: Phaser.Scene, manifest: Manifest, data?: object): boolean {
  if (LISTED.every((u) => kept.has(u) || !manifest.units[u]) && scene.textures.exists('hold:ground')) return true;
  spinner(scene, view.w / 2, view.h / 2);
  const stream = scene.game.scene.getScene(STREAM);
  void portraits(scene.game, manifest)
    .then(() =>
      loadOn(stream, (load) => {
        if (stream.textures.exists('hold:ground')) return 0;
        load.svg('hold:ground', 'assets/arena/meadow-wide.svg', { scale: 0.5 });
        return 1;
      }),
    )
    .then(() => {
      if (scene.scene.isActive()) scene.scene.restart(data);
    });
  return false;
}
