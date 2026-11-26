// The shapes effects are made of: a cut, a stab, a blow's star, the chips a
// blow knocks off, dust, a crack in the ground, tongues of flame, frost,
// a holy burst, venom, runes, stars, leaves, smoke, a bell's note, a hoof's
// print, and the marked ground of what is coming. The owner, of the effects
// as they were: "So its not just circle". Each is a thing with an edge and a
// line round it, as the units are, so a heal reads as leaves going up and a
// blow on a hammer as a star and dust, not as one more disc. The white ones
// are tinted in the game, so one drawing serves every element.

import { Doc, type PieceOpts } from './kit/draw';
import { BONE, FIRE, FROST, HIGHLIGHT, HOLY, OUTLINE, SNOW, STEEL, STONE, VENOM, WOOD, type Material } from './kit/palette';
import { circle, path, poly, roundRect, smooth, star, type Path } from './kit/path';
import type { FxArt } from './fx';

const WHITE = '#ffffff';
const PALE: Material = { fill: WHITE, shade: SNOW.shade };
const TAU = Math.PI * 2;

/** Points round a centre, at a radius that wanders: an edge that is not a circle. */
function wobble(cx: number, cy: number, r: number, n: number, by: number, seed: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    // A fixed wander, the same every build: a sum of two waves at odd rates.
    const k = 1 + by * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 7 + seed * 2.3) * 0.4);
    out.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  return out;
}

/** A thick stroke with the kit's dark line round it: a rune's mark, a crack. */
function stroke(d: Doc, name: string, p: Path, color: string, width: number): void {
  d.line(`${name}-edge`, p, OUTLINE, width + 4);
  d.line(name, p, color, width);
}

function shard(name: string, mat: Material, pts: Array<[number, number]>): FxArt {
  return { name, width: 24, height: 24, origin: [0.5, 0.5], draw: (d) => d.piece('chip', poly(pts), mat, { shade: 2 }) };
}

/**
 * Draws on `d` what is laid out for a bigger canvas, at `k` of its size. The sheet the field is packed on is
 * mostly the units', so an effect is written as small as it can be and scaled up where it is shown: it is flat
 * and moves fast, and loses nothing. A line keeps its weight down to two units.
 */
function at(d: Doc, k: number): Doc {
  const to = (p: Path): Path => p.map((x, y) => [x * k, y * k]);
  const through = {
    piece(name: string, p: Path, mat: Material, opts: PieceOpts = {}) {
      const inner = opts.inner;
      d.piece(name, to(p), mat, inner ? { ...opts, inner: () => inner(through as unknown as Doc) } : opts);
      return through;
    },
    flat(name: string, p: Path, fill: string, opacity?: number) {
      d.flat(name, to(p), fill, opacity);
      return through;
    },
    line(name: string, p: Path, color?: string, width?: number) {
      d.line(name, to(p), color, Math.max(2, (width ?? 4) * k));
      return through;
    },
    glint(name: string, p: Path) {
      d.glint(name, to(p));
      return through;
    },
  };
  return through as unknown as Doc;
}

/** A picture laid out at one size and written at `k` of it. Where it is shown, `SHAPE_SIZE` says how much to scale it back up. */
function smaller(art: FxArt, k: number): FxArt {
  return { ...art, width: Math.ceil(art.width * k), height: Math.ceil(art.height * k), draw: (d) => art.draw(at(d, k)) };
}

/** How much smaller each shape is written than it is laid out: the ground's marks most, as they are biggest and softest. */
const SMALL: Record<string, number> = { crack: 0.3125, pool: 0.3125, glyphs: 0.3125, frostpatch: 0.3125, note: 1, star5: 0.75, crystal: 0.75 };

export function shapeArt(): FxArt[] {
  return SHAPES().map((art) => {
    const k = SMALL[art.name] ?? (art.width * art.height > 24 * 24 ? 0.625 : 1);
    return k === 1 ? art : smaller(art, k);
  });
}

/** The shapes as they are laid out. */
function SHAPES(): FxArt[] {
  return [
    {
      // A stab: a long streak with a point, for a spear's or a dagger's blow.
      name: 'stab',
      width: 96,
      height: 24,
      origin: [0.1, 0.5],
      draw: (d) => {
        d.piece('streak', poly([[4, 10], [66, 4], [94, 12], [66, 20], [4, 14]]), PALE, { shade: 0 });
        d.line('glint', poly([[18, 12], [80, 12]], false), HIGHLIGHT, 2);
      },
    },
    shard('shard-stone', STONE, [[4, 10], [12, 3], [21, 8], [18, 19], [7, 20]]),
    shard('shard-wood', WOOD, [[3, 9], [20, 4], [22, 9], [6, 18]]),
    shard('shard-bone', BONE, [[5, 6], [10, 4], [12, 9], [19, 14], [20, 19], [15, 20], [11, 14], [4, 11]]),
    shard('shard-metal', STEEL, [[4, 14], [11, 4], [20, 6], [16, 19]]),
    {
      // The ground broken where something heavy came down: a ring of cracks and broken edges, laid flat.
      name: 'crack',
      width: 128,
      height: 128,
      origin: [0.5, 0.5],
      draw: (d) => {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + 0.3;
          const mid = 26 + (i % 3) * 8;
          const p = poly([
            [64 + Math.cos(a) * 10, 64 + Math.sin(a) * 10],
            [64 + Math.cos(a + 0.12) * mid, 64 + Math.sin(a + 0.12) * mid],
            [64 + Math.cos(a - 0.08) * (mid + 14), 64 + Math.sin(a - 0.08) * (mid + 14)],
            [64 + Math.cos(a + 0.05) * 58, 64 + Math.sin(a + 0.05) * 58],
          ], false);
          d.line(`crack-${i}`, p, OUTLINE, 5);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          d.flat(`chunk-${i}`, poly([[64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44], [64 + Math.cos(a + 0.3) * 52, 64 + Math.sin(a + 0.3) * 52], [64 + Math.cos(a + 0.15) * 40, 64 + Math.sin(a + 0.15) * 40]]), OUTLINE, 0.7);
        }
      },
    },
    {
      // A tongue of fire, drawn as a thing: dark red outside, orange, then a yellow heart.
      name: 'tongue',
      width: 40,
      height: 64,
      origin: [0.5, 0.92],
      draw: (d) => {
        d.piece('outer', path().M(20, 2).C(26, 18, 38, 28, 36, 44).C(35, 56, 28, 61, 20, 61).C(12, 61, 5, 56, 4, 44).C(3, 30, 16, 22, 20, 2).Z(), { fill: FIRE.fill, shade: FIRE.shade }, { shade: 3 });
        d.flat('mid', path().M(21, 20).C(26, 30, 30, 38, 29, 48).C(28, 56, 24, 58, 20, 58).C(15, 58, 11, 54, 11, 47).C(11, 38, 19, 32, 21, 20).Z(), FIRE.light);
        d.flat('heart', path().M(20, 36).C(24, 42, 25, 48, 24, 52).C(23, 56, 17, 56, 16, 52).C(15, 47, 18, 42, 20, 36).Z(), HIGHLIGHT);
      },
    },
    {
      // Frost: three cut crystals growing from one root.
      name: 'crystal',
      width: 48,
      height: 56,
      origin: [0.5, 0.9],
      draw: (d) => {
        d.piece('left', poly([[10, 50], [6, 30], [12, 18], [18, 30], [20, 50]]), FROST, { shade: 3 });
        d.piece('right', poly([[28, 50], [30, 26], [38, 14], [44, 28], [40, 50]]), FROST, { shade: 3 });
        d.piece('mid', poly([[16, 52], [18, 18], [24, 4], [31, 18], [32, 52]]), FROST, { shade: 3 });
        d.glint('glint', poly([[22, 14], [25, 8], [26, 24], [23, 30]]));
      },
    },
    {
      // A single shard of ice, thrown off when something frozen breaks.
      name: 'icicle',
      width: 16,
      height: 40,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('shard', poly([[8, 2], [14, 14], [9, 38], [3, 14]]), FROST, { shade: 2 });
        d.glint('glint', poly([[8, 7], [10, 14], [8, 24]]));
      },
    },
    {
      // Holy light breaking out: rays long and short round a bright middle.
      name: 'sunburst',
      width: 96,
      height: 96,
      origin: [0.5, 0.5],
      draw: (d) => {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          const far = i % 2 === 0 ? 46 : 32;
          d.piece(`ray-${i}`, poly([[48 + Math.cos(a - 0.12) * 16, 48 + Math.sin(a - 0.12) * 16], [48 + Math.cos(a) * far, 48 + Math.sin(a) * far], [48 + Math.cos(a + 0.12) * 16, 48 + Math.sin(a + 0.12) * 16]]), HOLY, { shade: 0 });
        }
        d.piece('core', star(48, 48, 12, 20, 15), { fill: HOLY.light, shade: HOLY.fill }, { shade: 0 });
      },
    },
    {
      // A drop of venom, fat at the foot.
      name: 'drip',
      width: 20,
      height: 32,
      origin: [0.5, 0.6],
      draw: (d) => {
        d.piece('drop', path().M(10, 2).C(13, 10, 18, 16, 18, 22).C(18, 27, 14, 30, 10, 30).C(6, 30, 2, 27, 2, 22).C(2, 16, 7, 10, 10, 2).Z(), VENOM, { shade: 3 });
        d.glint('glint', poly([[6, 20], [8, 16], [9, 22]]));
      },
    },
    {
      // A bubble rising off a venom pool: pale through and through, with a glint off to one side.
      name: 'bubble',
      width: 24,
      height: 24,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('ball', circle(12, 12, 9), { fill: VENOM.light, shade: VENOM.fill }, { shade: 3 });
        d.glint('glint', poly([[7, 9], [10, 6], [11, 8]]));
      },
    },
    {
      // A rune of the arcane: angled strokes, no ring.
      name: 'rune',
      width: 48,
      height: 48,
      origin: [0.5, 0.5],
      draw: (d) => {
        stroke(d, 'stem', poly([[24, 6], [24, 42]], false), WHITE, 5);
        stroke(d, 'arms', poly([[10, 16], [24, 26], [38, 16]], false), WHITE, 5);
        stroke(d, 'foot', poly([[14, 40], [24, 34], [34, 40]], false), WHITE, 5);
      },
    },
    {
      // A star of five points: Starfall, a level gained, a blow that finds the gap.
      name: 'star5',
      width: 48,
      height: 48,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('star', star(24, 25, 5, 21, 9), PALE, { shade: 3 });
        d.glint('glint', poly([[20, 16], [24, 8], [25, 18]]));
      },
    },
    {
      // A leaf going up off someone who mends.
      name: 'leaf',
      width: 28,
      height: 20,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('leaf', path().M(3, 10).C(8, 2, 20, 2, 25, 10).C(20, 18, 8, 18, 3, 10).Z(), VENOM, { shade: 2 });
        d.line('vein', poly([[5, 10], [22, 10]], false), VENOM.shade, 2);
      },
    },
    {
      // A curl of smoke, grey, with the turn of it drawn in.
      name: 'smoke',
      width: 64,
      height: 48,
      origin: [0.5, 0.6],
      draw: (d) => {
        d.piece('curl', smooth([[8, 34], [8, 22], [18, 12], [32, 10], [44, 14], [54, 22], [56, 32], [46, 40], [30, 40], [18, 40]]), STONE, { shade: 4 });
        d.line('turn', path().M(22, 30).C(22, 20, 36, 18, 40, 26), STONE.shade, 3);
      },
    },
    {
      // A bell's note, going out with its ring.
      name: 'note',
      width: 32,
      height: 40,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('flag', poly([[16, 5], [26, 10], [26, 16], [16, 12]]), PALE, { shade: 0 });
        d.piece('stem', roundRect(14, 4, 4, 28, 2), PALE, { shade: 0 });
        d.piece('head', path().M(4, 32).C(4, 26, 18, 24, 18, 30).C(18, 36, 4, 38, 4, 32).Z(), PALE, { shade: 2 });
      },
    },
    {
      // A hoof's print pressed into the ground behind a charge.
      name: 'hoof',
      width: 24,
      height: 24,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('print', path().M(4, 6).C(4, 20, 20, 20, 20, 6).L(15, 6).C(15, 14, 9, 14, 9, 6).Z(), OUTLINE, 0.6);
      },
    },
    {
      // An ember: a little bright diamond that flies off a fire.
      name: 'ember',
      width: 16,
      height: 16,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('ember', poly([[8, 1], [14, 8], [8, 15], [2, 8]]), { fill: FIRE.light, shade: FIRE.fill }, { shade: 2 });
      },
    },
    {
      // A pool on the ground with a bubbling edge: venom lying where a cloud fell. Not a circle: its edge wanders.
      name: 'pool',
      width: 128,
      height: 128,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('pool', smooth(wobble(64, 64, 52, 14, 0.12, 1)), WHITE, 0.6);
        d.line('rim', smooth(wobble(64, 64, 52, 14, 0.12, 1)), WHITE, 5);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + 0.4;
          d.flat(`spot-${i}`, circle(64 + Math.cos(a) * 30, 64 + Math.sin(a) * 30, 5 + (i % 3) * 2), HIGHLIGHT, 0.7);
        }
      },
    },
    {
      // Holy ground: a round of marks and a star at its heart. The marks stand apart, so nothing makes a ring round a dark middle.
      name: 'glyphs',
      width: 128,
      height: 128,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('ground', smooth(wobble(64, 64, 56, 16, 0.04, 2)), WHITE, 0.32);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          const x = 64 + Math.cos(a) * 46;
          const y = 64 + Math.sin(a) * 46;
          d.line(`mark-${i}`, poly([[x - Math.sin(a) * 6, y + Math.cos(a) * 6], [x + Math.cos(a) * 5, y + Math.sin(a) * 5], [x + Math.sin(a) * 6, y - Math.cos(a) * 6]], false), WHITE, 4);
        }
        d.flat('star', star(64, 64, 8, 22, 8), WHITE, 0.85);
      },
    },
    {
      // Ground gone to ice: a jagged patch with cracks across it. White, tinted to the cold.
      name: 'frostpatch',
      width: 128,
      height: 128,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('ice', poly(wobble(64, 64, 54, 18, 0.14, 5)), WHITE, 0.7);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + 0.6;
          d.line(`crack-${i}`, poly([[64, 64], [64 + Math.cos(a) * 24, 64 + Math.sin(a) * 26], [64 + Math.cos(a + 0.2) * 46, 64 + Math.sin(a + 0.2) * 44]], false), FROST.shade, 3);
        }
      },
    },
    {
      // A charge's lane: pale, with a hard line down each long side that stays a line however far it is drawn out.
      name: 'warn-lane',
      width: 32,
      height: 32,
      origin: [0, 0.5],
      draw: (d) => {
        d.flat('lane', poly([[0, 0], [32, 0], [32, 32], [0, 32]]), WHITE, 0.75);
        d.flat('top', poly([[0, 0], [32, 0], [32, 4], [0, 4]]), WHITE);
        d.flat('foot', poly([[0, 28], [32, 28], [32, 32], [0, 32]]), WHITE);
      },
    },
    {
      // A chevron that runs down a charge's lane the way it will come.
      name: 'chevron',
      width: 32,
      height: 32,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('chevron', poly([[6, 4], [16, 4], [28, 16], [16, 28], [6, 28], [18, 16]]), WHITE);
      },
    },
  ];
}

/** How many of the sheet's units a shape is shown at for each of its own, to stand as big as it was laid out. */
export function shapeScale(name: string): number {
  const art = SHAPES().find((a) => a.name === name);
  if (!art) return 1;
  return art.width / Math.ceil(art.width * (SMALL[name] ?? (art.width * art.height > 24 * 24 ? 0.625 : 1)));
}
