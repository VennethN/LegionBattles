// The two painted scenes of a land: the ground a battle is fought on, with
// the board laid in it, and the map of its stages, with a road winding from
// site to site. Each is one picture the size of the screen, drawn from the
// scenery (scenery.ts) by a seed, so that it is the same every time.
//
// A scene is drawn once and shown as one image, so everything in it costs
// the game one draw call however much there is to look at.

import { COLS, ROWS } from '../sim/constants';
import { Rng } from '../sim/rng';
import { BOARD_X, BOARD_Y, GROUND, TILE_H, TILE_W, type Ground } from './board';
import { Doc } from './kit/draw';
import {
  BUSH, CLOTH, DIRT, FROST, GRASS, HOLY, IRON, SAND, SNOW, STONE, type Material,
} from './kit/palette';
import { ellipse, path, poly, roundRect, smooth, type Pt } from './kit/path';
import {
  bareTree, bush, cactus, cairn, camp, drift, dryShrub, fence, flowers, iceSpike, log, mushrooms, palm, pine, pots, rock, ruin,
  sandrock, signpost, standard, stronghold, stump, tower, tree, tuft, type Scenery,
} from './scenery';

export const SCENE_W = 1280;
export const SCENE_H = 720;

const BOARD_W = COLS * TILE_W;
const BOARD_H = ROWS * TILE_H;

interface Look {
  /** The earth the board is cut into, and what a road is trodden to. */
  earth: Material;
  road: string;
  roadEdge: string;
  /** What stands about, big things first: the first few are tall. */
  tall: Scenery[];
  low: Scenery[];
  /** The cloth of the sites a map marks, and the stone of its stronghold. */
  cloth: Material;
  stone: Material;
  snow: boolean;
}

const LOOKS: Record<Ground, Look> = {
  meadow: {
    earth: DIRT,
    road: DIRT.fill,
    roadEdge: DIRT.shade,
    tall: [tree, tree, bush, rock(STONE, BUSH)],
    low: [stump, log, flowers(SNOW.light), flowers(HOLY.fill), mushrooms, tuft(GRASS.light, GRASS.dark), fence()],
    cloth: CLOTH.red,
    stone: STONE,
    snow: false,
  },
  desert: {
    earth: { fill: SAND.dark, shade: DIRT.fill },
    road: SAND.light,
    roadEdge: SAND.dark,
    tall: [palm, cactus, sandrock, ruin],
    low: [dryShrub, pots, tuft(SAND.light, SAND.dark), sandrock, dryShrub],
    cloth: CLOTH.red,
    stone: { fill: SAND.dark, shade: DIRT.fill },
    snow: false,
  },
  snow: {
    earth: { fill: SNOW.dark, shade: STONE.shade },
    road: SNOW.shade,
    roadEdge: SNOW.dark,
    tall: [pine, pine, bareTree, rock(STONE, { fill: SNOW.light, shade: SNOW.shade })],
    low: [iceSpike, cairn, drift, drift, fence(true), tuft(SNOW.light, SNOW.dark)],
    cloth: CLOTH.red,
    stone: IRON,
    snow: true,
  },
};

/** A soft shape of no particular outline, about a point. */
function blob(rng: Rng, cx: number, cy: number, r: number, squash = 0.6): ReturnType<typeof smooth> {
  const pts: Pt[] = [];
  const n = 8;
  const turn = rng.next() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = turn + (i / n) * 6.283;
    const k = r * (0.7 + rng.next() * 0.5);
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k * squash]);
  }
  return smooth(pts);
}

/** The land itself: its color, and lighter and darker stretches of it, so that it is not one flat sheet. */
function land(d: Doc, ground: Ground, rng: Rng): void {
  const c = GROUND[ground];
  d.flat('land', roundRect(0, 0, SCENE_W, SCENE_H, 0), c.around);
  for (let i = 0; i < 22; i++) {
    const x = rng.next() * SCENE_W;
    const y = rng.next() * SCENE_H;
    const r = 70 + rng.next() * 150;
    if (i % 2 === 0) d.lightOver('patch-lit', blob(rng, x, y, r), 0.28 + rng.next() * 0.2);
    else d.shadeOver('patch-dark', blob(rng, x, y, r), 0.22 + rng.next() * 0.2);
  }
}

/** Small things on a tile: what grows or lies on this kind of ground. They are quiet, so that the units stay the loudest thing on the board. */
function tileSpecks(d: Doc, ground: Ground, rng: Rng, x: number, y: number): void {
  const c = GROUND[ground];
  const n = 2 + rng.int(3);
  for (let i = 0; i < n; i++) {
    const px = x + 16 + rng.next() * (TILE_W - 40);
    const py = y + 20 + rng.next() * (TILE_H - 36);
    const kind = rng.int(4);
    if (ground === 'meadow') {
      if (kind < 2) d.flat('tuft', path().M(px, py).L(px + 2.5, py - 8).L(px + 5, py).L(px + 7.5, py - 6).L(px + 10, py).Z(), kind === 0 ? c.speck : GRASS.dark);
      else if (kind === 2) d.shadeOver('clover', ellipse(px, py, 11, 5), 0.2);
      else {
        d.flat('bloom', poly([[px, py - 3.4], [px + 3.4, py], [px, py + 3.4], [px - 3.4, py]]), rng.chance(0.5) ? SNOW.light : HOLY.fill);
        d.flat('bloom-heart', ellipse(px, py, 1.2, 1.2), HOLY.shade);
      }
    } else if (ground === 'desert') {
      if (kind < 2) d.flat('ripple', smooth([[px - 4, py], [px + 4, py - 3], [px + 12, py], [px + 20, py - 3], [px + 20, py], [px + 12, py + 3], [px + 4, py]], true), c.speck);
      else if (kind === 2) {
        d.flat('pebble', ellipse(px, py, 4.4, 3), SAND.dark);
        d.flat('pebble-lit', ellipse(px - 1, py - 1, 2.2, 1.4), SAND.light);
      } else d.shadeOver('crack', path().M(px, py).L(px + 7, py + 3).L(px + 5, py + 9).L(px + 12, py + 13).L(px + 6, py + 10).L(px + 8, py + 4).Z(), 0.5);
    } else {
      if (kind < 2) d.flat('drift', ellipse(px, py, 11, 4), c.speck);
      else if (kind === 2) d.shadeOver('dip', ellipse(px, py, 9, 3.4), 0.18);
      else d.flat('ice', poly([[px, py - 4], [px + 3, py], [px, py + 4], [px - 3, py]]), FROST.light);
    }
  }
}

/** A road: a trodden band with a darker edge, stones along it. */
function road(d: Doc, look: Look, rng: Rng, points: Pt[], width: number): void {
  const p = smooth(points, false);
  d.line('road-edge', p, look.roadEdge, width + 10);
  d.line('road', p, look.road, width);
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const steps = Math.max(1, Math.floor(Math.hypot(bx - ax, by - ay) / 46));
    for (let k = 0; k < steps; k++) {
      const t = (k + rng.next()) / steps;
      const x = ax + (bx - ax) * t + (rng.next() - 0.5) * width * 0.7;
      const y = ay + (by - ay) * t + (rng.next() - 0.5) * width * 0.5;
      d.shadeOver('rut', ellipse(x, y, 5 + rng.next() * 5, 2.2), 0.35);
    }
  }
}

interface Standing {
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  draw: Scenery;
}

/** Stands things in the scene, the furthest first, so that nearer ones are drawn over them. */
function stand(d: Doc, things: Standing[]): void {
  things.sort((a, b) => a.y - b.y);
  for (const t of things) d.at(t.x, t.y, t.scale, t.flip, t.draw);
}

/**
 * The ground of a battle: the land, a road up to the board from each side,
 * the board on a slab of earth with its tiles, a standard at each corner in
 * the color of the side it is on, and the land's scenery round about. The
 * strip above the board is kept low, as the back row's health bars are there.
 */
export function boardBackdrop(ground: Ground): Doc {
  const d = new Doc(`${ground}-board`);
  const look = LOOKS[ground];
  const c = GROUND[ground];
  const rng = new Rng(ground.length * 7919 + 17);
  land(d, ground, rng);

  const midY = BOARD_Y + BOARD_H / 2;
  road(d, look, rng, [[-20, midY + 30], [50, midY + 8], [110, midY - 6], [BOARD_X + 10, midY]], 46);
  road(d, look, rng, [[BOARD_X + BOARD_W - 10, midY], [1170, midY + 8], [1230, midY - 10], [SCENE_W + 20, midY + 14]], 46);

  // The board stands a little proud of the land: a slab of earth, its near edge in shadow.
  d.shadeOver('board-cast', roundRect(BOARD_X - 12, BOARD_Y - 6, BOARD_W + 36, BOARD_H + 34, 22), 0.9);
  d.flat('slab-side', roundRect(BOARD_X - 16, BOARD_Y - 14, BOARD_W + 32, BOARD_H + 40, 20), look.earth.shade);
  d.flat('slab', roundRect(BOARD_X - 16, BOARD_Y - 14, BOARD_W + 32, BOARD_H + 28, 20), look.earth.fill);
  d.lightOver('slab-lit', roundRect(BOARD_X - 16, BOARD_Y - 14, BOARD_W + 32, 8, 4), 0.5);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = BOARD_X + col * TILE_W;
      const y = BOARD_Y + row * TILE_H;
      const fill = (row + col) % 2 === 0 ? c.a : c.b;
      d.piece(`tile-${col}-${row}`, roundRect(x + 3, y + 3, TILE_W - 6, TILE_H - 6, 11), { fill, shade: c.around }, {
        shade: 4,
        outline: false,
        inner: (t) => tileSpecks(t, ground, rng, x, y),
      });
    }
  }

  const things: Standing[] = [];
  // Whose side is whose: the player's standards to the left, the enemy's to the right.
  for (const [x, y, team, flip] of [
    [BOARD_X - 34, BOARD_Y + 10, 'blue', false], [BOARD_X - 34, BOARD_Y + BOARD_H + 22, 'blue', false],
    [BOARD_X + BOARD_W + 34, BOARD_Y + 10, 'red', true], [BOARD_X + BOARD_W + 34, BOARD_Y + BOARD_H + 22, 'red', true],
  ] as const) {
    things.push({ x, y, scale: 0.9, flip, draw: standard(team) });
  }
  // Tall things down the two sides and in the corners; low things everywhere else, and only low ones above the board.
  // They keep clear of the four standards, which say whose side is whose.
  const sides: Array<[number, number]> = [
    [44, 140], [58, 262], [36, 336], [62, 474], [40, 548], [56, 668], [118, 712],
    [1238, 146], [1224, 268], [1246, 340], [1220, 480], [1242, 552], [1226, 672], [1160, 714],
  ];
  sides.forEach(([x, y], i) => {
    things.push({ x: x + (rng.next() - 0.5) * 16, y: y + (rng.next() - 0.5) * 12, scale: 0.78 + rng.next() * 0.3, flip: rng.chance(0.5), draw: look.tall[i % look.tall.length] });
  });
  const lows: Array<[number, number]> = [
    [250, 150], [420, 164], [600, 148], [800, 162], [980, 150], [1100, 170],
    [70, 410], [128, 300], [130, 530], [1150, 300], [1216, 410], [1152, 540],
    [260, 660], [470, 690], [700, 664], [900, 694], [1080, 668],
  ];
  lows.forEach(([x, y], i) => {
    things.push({ x: x + (rng.next() - 0.5) * 30, y: y + (rng.next() - 0.5) * 10, scale: 0.6 + rng.next() * 0.25, flip: rng.chance(0.5), draw: look.low[(i * 3 + rng.int(2)) % look.low.length] });
  });
  stand(d, things);
  return d;
}

// ------------------------------------------------------------ the map

/** Where the map draws the sites of a land with this many stages: the top of the screen is the map's heading. */
export function mapNodes(count: number): Pt[] {
  const rows = count <= 12 ? 2 : 3;
  const per = Math.ceil(count / rows);
  const ys = rows === 2 ? [318, 560] : [262, 440, 618];
  const out: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / per);
    const inRow = Math.min(per, count - r * per);
    const k = i - r * per;
    const t = inRow > 1 ? k / (inRow - 1) : 0.5;
    // The road runs one way along a row and back along the next, and rides up and down a little as it goes.
    const along = r % 2 === 0 ? t : 1 - t;
    const wave = ((k % 2 === 0 ? -1 : 1) * 16) + (r % 2 === 0 ? 0 : 6);
    out.push([150 + along * 980, ys[r] + wave]);
  }
  return out;
}

/**
 * The map of a land: its ground, a road from the first stage to the last,
 * and at each stage what holds it: a camp, a watchtower where a miniboss
 * waits, a stronghold for the boss. `kinds` says which each stage is.
 */
export function mapBackdrop(ground: Ground, kinds: ReadonlyArray<'normal' | 'miniboss' | 'boss'>): Doc {
  const d = new Doc(`${ground}-map`);
  const look = LOOKS[ground];
  const rng = new Rng(ground.length * 104729 + kinds.length);
  land(d, ground, rng);
  const nodes = mapNodes(kinds.length);

  // The road comes in from the edge to the first stage and winds on through them all.
  const first = nodes[0];
  const way: Pt[] = [[-30, first[1] + 40], [first[0] - 70, first[1] + 14], ...nodes];
  road(d, look, rng, way, 30);

  const things: Standing[] = [];
  nodes.forEach(([x, y], i) => {
    // The ground a site stands on: a round of trodden earth, where the game writes the stage's number.
    d.shadeOver(`plot-cast-${i}`, ellipse(x + 3, y + 5, 46, 17), 0.8);
    d.flat(`plot-${i}`, ellipse(x, y, 44, 16), look.roadEdge);
    d.flat(`plot-top-${i}`, ellipse(x, y - 3, 44, 16), look.road);
    const kind = kinds[i];
    const draw = kind === 'boss' ? stronghold(look.stone, look.cloth, look.snow) : kind === 'miniboss' ? tower(look.cloth, look.snow) : camp(look.cloth);
    things.push({ x, y: y - 14, scale: kind === 'boss' ? 0.82 : kind === 'miniboss' ? 0.8 : 0.86, flip: false, draw });
  });
  things.push({ x: first[0] - 96, y: first[1] + 34, scale: 0.8, flip: false, draw: signpost });

  // The land's scenery wherever there is room for it: not on the road, not on a site, not under the heading.
  const clear = (x: number, y: number, room: number, tall: boolean): boolean => {
    // Something tall in front of a site would stand over it, so it needs more room below one.
    for (const [nx, ny] of nodes) if (Math.abs(x - nx) < room + 44 && y > ny - 130 && y < ny + (tall ? 128 : 50)) return false;
    for (let i = 0; i + 1 < way.length; i++) {
      const [ax, ay] = way[i];
      const [bx, by] = way[i + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len)));
      if (Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)) < room) return false;
    }
    return true;
  };
  let placed = 0;
  for (let tries = 0; tries < 900 && placed < 46; tries++) {
    const x = 20 + rng.next() * (SCENE_W - 40);
    const y = 120 + rng.next() * (SCENE_H - 130);
    const big = placed % 3 !== 2;
    if (!clear(x, y, big ? 56 : 34, big)) continue;
    if (things.some((t) => Math.abs(t.x - x) < 46 && Math.abs(t.y - y) < 30)) continue;
    const list = big ? look.tall : look.low;
    things.push({ x, y, scale: (big ? 0.62 : 0.56) + rng.next() * 0.24, flip: rng.chance(0.5), draw: list[rng.int(list.length)] });
    placed++;
  }
  stand(d, things);
  return d;
}

