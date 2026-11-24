// The ground the legion marches over: one painted picture to each kind of
// land, with a road through its middle. The legion stands on the left of
// the road and whoever bars its way comes up it from the right.
//
// The picture is bigger than any screen shows of it: the game lays it to
// cover its view and lets the edges fall outside, so that it serves a wide
// screen and a tall one alike. What must always be seen is kept to the
// middle: the band the figures stand in (BAND) is clear of anything tall,
// what stands above it is drawn far and small, what stands below it near
// and big.
//
// It is put together from the scenery by a seed, so it is the same picture
// every time.

import { Dice } from './kit/dice';
import { Doc } from './kit/draw';
import { BUSH, DIRT, FROST, GRASS, HOLY, SAND, SNOW, STONE } from './kit/palette';
import { ellipse, path, poly, roundRect, smooth, type Pt } from './kit/path';
import { GROUND, type Ground } from './ground';
import {
  bareTree, bush, cactus, cairn, drift, dryShrub, fence, flowers, iceSpike, log, mushrooms, palm, pine, pots, rock, ruin, sandrock, stump, tree,
  tuft, type Scenery,
} from './scenery';

export const MARCH_W = 1600;
export const MARCH_H = 1000;
/** Where the figures' feet are, from the top of the picture: the back row's and the front row's. */
export const BAND: readonly [number, number] = [400, 800];

interface Look {
  road: string;
  roadEdge: string;
  /** What stands about: tall things, and low ones. */
  tall: Scenery[];
  low: Scenery[];
}

const LOOKS: Record<Ground, Look> = {
  meadow: {
    road: DIRT.fill,
    roadEdge: DIRT.shade,
    tall: [tree, tree, bush, rock(STONE, BUSH), tree],
    low: [stump, log, flowers(SNOW.light), flowers(HOLY.fill), mushrooms, tuft(GRASS.light, GRASS.dark), fence()],
  },
  desert: {
    road: SAND.light,
    roadEdge: SAND.dark,
    tall: [palm, cactus, sandrock, ruin, palm],
    low: [dryShrub, pots, tuft(SAND.light, SAND.dark), sandrock, dryShrub],
  },
  snow: {
    road: SNOW.shade,
    roadEdge: SNOW.dark,
    tall: [pine, pine, bareTree, rock(STONE, { fill: SNOW.light, shade: SNOW.shade }), pine],
    low: [iceSpike, cairn, drift, drift, fence(true), tuft(SNOW.light, SNOW.dark)],
  },
};

/** A soft shape of no particular outline, about a point. */
function blob(dice: Dice, cx: number, cy: number, r: number, squash = 0.6): ReturnType<typeof smooth> {
  const pts: Pt[] = [];
  const n = 8;
  const turn = dice.next() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * 6.283;
    const k = r * (0.7 + dice.next() * 0.5);
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k * squash]);
  }
  return smooth(pts);
}

/** Small things on open ground: what grows or lies on this kind of land. Quiet, so that the figures stay the loudest thing there. */
function speck(d: Doc, ground: Ground, dice: Dice, px: number, py: number): void {
  const c = GROUND[ground];
  const kind = dice.int(4);
  if (ground === 'meadow') {
    if (kind < 2) d.flat('tuft', path().M(px, py).L(px + 4, py - 13).L(px + 8, py).L(px + 12, py - 10).L(px + 16, py).Z(), kind === 0 ? c.speck : GRASS.dark);
    else if (kind === 2) d.shadeOver('clover', ellipse(px, py, 18, 8), 0.2);
    else {
      d.flat('bloom', poly([[px, py - 5.5], [px + 5.5, py], [px, py + 5.5], [px - 5.5, py]]), dice.chance(0.5) ? SNOW.light : HOLY.fill);
      d.flat('bloom-heart', ellipse(px, py, 2, 2), HOLY.shade);
    }
  } else if (ground === 'desert') {
    if (kind < 2) d.flat('ripple', smooth([[px - 6, py], [px + 6, py - 5], [px + 19, py], [px + 32, py - 5], [px + 32, py], [px + 19, py + 5], [px + 6, py]], true), c.speck);
    else if (kind === 2) {
      d.flat('pebble', ellipse(px, py, 7, 5), SAND.dark);
      d.flat('pebble-lit', ellipse(px - 1.5, py - 1.5, 3.5, 2.2), SAND.light);
    } else d.shadeOver('crack', path().M(px, py).L(px + 11, py + 5).L(px + 8, py + 14).L(px + 19, py + 21).L(px + 10, py + 16).L(px + 13, py + 6).Z(), 0.5);
  } else {
    if (kind < 2) d.flat('drift', ellipse(px, py, 18, 6.5), c.speck);
    else if (kind === 2) d.shadeOver('dip', ellipse(px, py, 14, 5.5), 0.18);
    else d.flat('ice', poly([[px, py - 6.5], [px + 5, py], [px, py + 6.5], [px - 5, py]]), FROST.light);
  }
}

interface Standing {
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  draw: Scenery;
}

export function marchBackdrop(ground: Ground): Doc {
  const d = new Doc(`${ground}-march`);
  const look = LOOKS[ground];
  const c = GROUND[ground];
  const dice = new Dice(ground.length * 7919 + 31);

  // The land: its color, and lighter and darker stretches of it, so that it is not one flat sheet.
  d.flat('land', roundRect(0, 0, MARCH_W, MARCH_H, 0), c.around);
  // The open ground the figures stand on is the land's lighter tone, in one long soft shape.
  d.flat('field', smooth([[-60, 372], [300, 350], [800, 364], [1300, 348], [1660, 370], [1660, 840], [1300, 858], [800, 842], [300, 860], [-60, 838]]), c.b);
  for (let i = 0; i < 30; i++) {
    const x = dice.next() * MARCH_W;
    const y = dice.next() * MARCH_H;
    const r = 90 + dice.next() * 170;
    if (i % 2 === 0) d.lightOver('patch-lit', blob(dice, x, y, r), 0.24 + dice.next() * 0.18);
    else d.shadeOver('patch-dark', blob(dice, x, y, r), 0.18 + dice.next() * 0.18);
  }

  // The road, through the middle of the band from one side of the picture to the other.
  const mid = (BAND[0] + BAND[1]) / 2 + 30;
  const way: Pt[] = [[-40, mid + 14], [260, mid - 10], [620, mid + 12], [1000, mid - 12], [1340, mid + 10], [1640, mid - 6]];
  const line = smooth(way, false);
  d.line('road-edge', line, look.roadEdge, 236);
  d.line('road', line, look.road, 212);
  d.line('road-worn', line, c.speck, 70);
  // Ruts and stones along it.
  for (let i = 0; i < 70; i++) {
    const x = dice.next() * MARCH_W;
    const y = mid + (dice.next() - 0.5) * 170;
    if (i % 4 === 0) {
      d.flat('stone', ellipse(x, y, 9 + dice.next() * 6, 6 + dice.next() * 3), ground === 'snow' ? SNOW.dark : STONE.fill);
      d.lightOver('stone-lit', ellipse(x - 2, y - 2, 4.5, 2.6), 0.9);
    } else d.shadeOver('rut', ellipse(x, y, 16 + dice.next() * 18, 3.6), 0.3);
  }
  // Specks on the open ground beside the road.
  for (let i = 0; i < 90; i++) {
    const x = dice.next() * MARCH_W;
    const above = dice.chance(0.5);
    const y = above ? 350 + dice.next() * 120 : 730 + dice.next() * 120;
    speck(d, ground, dice, x, y);
  }

  const things: Standing[] = [];
  // Far off, above the band: a line of tall things, small, with low things before them.
  for (let i = 0; i < 17; i++) {
    const x = 30 + (i / 16) * (MARCH_W - 60) + (dice.next() - 0.5) * 50;
    things.push({ x, y: 150 + dice.next() * 70, scale: 1.5 + dice.next() * 0.5, flip: dice.chance(0.5), draw: look.tall[i % look.tall.length] });
  }
  for (let i = 0; i < 12; i++) {
    const x = 60 + (i / 11) * (MARCH_W - 120) + (dice.next() - 0.5) * 70;
    things.push({ x, y: 268 + dice.next() * 60, scale: 1.25 + dice.next() * 0.45, flip: dice.chance(0.5), draw: i % 3 === 0 ? look.tall[(i + 2) % look.tall.length] : look.low[i % look.low.length] });
  }
  // Near, below the band: low things only, and bigger. Nothing tall stands here: the picture is behind the
  // figures, and a tree in front of the front row would have that row standing on its leaves.
  for (let i = 0; i < 13; i++) {
    const x = 20 + (i / 12) * (MARCH_W - 40) + (dice.next() - 0.5) * 80;
    things.push({ x, y: 940 + dice.next() * 50, scale: 1.7 + dice.next() * 0.5, flip: dice.chance(0.5), draw: look.low[(i + 3) % look.low.length] });
  }
  for (let i = 0; i < 9; i++) {
    const x = 90 + (i / 8) * (MARCH_W - 180) + (dice.next() - 0.5) * 90;
    things.push({ x, y: 876 + dice.next() * 26, scale: 1.2 + dice.next() * 0.3, flip: dice.chance(0.5), draw: look.low[(i * 2 + 1) % look.low.length] });
  }
  things.sort((a, b) => a.y - b.y);
  for (const t of things) d.at(t.x, t.y, t.scale, t.flip, t.draw);
  return d;
}
