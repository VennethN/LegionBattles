// A plain player, for measuring the game without one: it steers the hero
// away from what would hurt, toward what it can hit and what lies on the
// ground, and in the camp it buys what it can afford. It plays worse than a
// person who is paying attention and better than one who is not, which is
// about where a first run sits. The pace report and the tests use it; the
// game never does.

import { SLOTS, weaponOf } from './data';
import type { Omen } from './road';
import { buy, canToss, choose, combine, kindCounts, march, openPack, reroll, rerollPrice, takeRelic, takeRoad, toss, twinOf, whyNot, type RunData } from './run';
import type { Stat } from './stats';
import type { Steer, World } from './world';

/** How long the plain player takes to see what has changed, and how far off true it steers. */
const REACTION = 0.22;
const WOBBLE = 0.5;

const minds = new WeakMap<World, { at: number; steer: Steer; dice: number }>();

/**
 * Which way the plain player steers this step. It looks again only every
 * fifth of a second or so, and never steers quite true: a player who saw
 * everything at once and never slipped would say nothing about the game.
 */
export function botSteer(w: World): Steer {
  let mind = minds.get(w);
  if (!mind) {
    mind = { at: -1, steer: { x: 0, y: 0 }, dice: 12345 };
    minds.set(w, mind);
  }
  if (w.time < mind.at) return mind.steer;
  mind.at = w.time + REACTION;
  mind.dice = (Math.imul(mind.dice, 1664525) + 1013904223) >>> 0;
  const best = think(w);
  const turn = (mind.dice / 4294967296 - 0.5) * 2 * WOBBLE;
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  // It lets the move loose when it is full and there is a crowd for it, as a player who has learned it does.
  mind.steer = { x: best.x * c - best.y * sn, y: best.x * sn + best.y * c, act: w.ripe };
  // A move that goes the way the hero faces is turned on the nearest of them first: stars brought down behind him are wasted.
  if (mind.steer.act && (w.move?.id === 'starfall' || w.move?.id === 'gate')) {
    const to = nearestFoe(w);
    if (to) mind.steer = { x: to.x, y: to.y, act: true };
  }
  return mind.steer;
}

/** The way to the nearest foe, as a length of one, or null with nobody on the field. */
function nearestFoe(w: World): { x: number; y: number } | null {
  const h = w.hero;
  let best = Infinity;
  let out: { x: number; y: number } | null = null;
  for (const f of w.foes) {
    if (f.def.prop) continue;
    const d = Math.hypot(f.x - h.x, f.y - h.y);
    if (d < best && d > 1) {
      best = d;
      out = { x: (f.x - h.x) / d, y: (f.y - h.y) / d };
    }
  }
  return out;
}

/**
 * Isaura's way of riding, as the plain player does it: round the field on
 * straight legs, which couches her lance again and again. A person would
 * ride through the thick of them instead, and do better by it.
 */
function lap(w: World): Steer {
  const h = w.hero;
  const m = 180;
  const l = m;
  const r = w.w - m;
  const t = m + 30;
  const b = w.h - m;
  if (h.y <= t + 24 && h.x < r - 24) return { x: 1, y: 0 };
  if (h.x >= r - 24 && h.y < b - 24) return { x: 0, y: 1 };
  if (h.y >= b - 24 && h.x > l + 24) return { x: -1, y: 0 };
  if (h.x <= l + 24 && h.y > t + 24) return { x: 0, y: -1 };
  // Inside the ring: out to the nearest side of it.
  const sides: Array<[number, Steer]> = [[h.y - t, { x: 0, y: -1 }], [b - h.y, { x: 0, y: 1 }], [h.x - l, { x: -1, y: 0 }], [r - h.x, { x: 1, y: 0 }]];
  sides.sort((p, q) => p[0] - q[0]);
  return sides[0][1];
}

function think(w: World): Steer {
  const h = w.hero;
  let x = 0;
  let y = 0;
  // It stands where everything it carries can reach, and no nearer than it must.
  let reach = Infinity;
  for (const s of w.slots) reach = Math.min(reach, s.def.motion === 'pulse' ? (s.def.burst ?? 100) : w.rangeOf(s.def));
  // Nan keeps close: her fires do not burn down while she is near them.
  const stand = Math.max(62, Math.min(w.quirk === 'banked' ? 165 : 240, reach * 0.78));

  let nearest = Infinity;
  let nx = 0;
  let ny = 0;
  for (const f of w.foes) {
    const dx = h.x - f.x;
    const dy = h.y - f.y;
    const d = Math.max(1, Math.hypot(dx, dy) - f.def.r);
    if (d < nearest) {
      nearest = d;
      nx = -dx;
      ny = -dy;
    }
    // One that is charging, or about to burst, is given a wide berth: out of its line, not along it.
    if (f.state === 'dash' || f.doing === 'charge') {
      const along = dx * f.dx + dy * f.dy;
      const off = dx * -f.dy + dy * f.dx;
      if (along > -40 && along < 330 && Math.abs(off) < 70) {
        const side = off >= 0 ? 1 : -1;
        x += -f.dy * side * 4;
        y += f.dx * side * 4;
      }
      continue;
    }
    const danger = f.doing === 'burst' ? (f.def.burst ?? 80) + 50 : Math.max(46, stand * 0.72);
    if (d < danger) {
      const k = ((danger - d) / danger) * 3.2;
      x += (dx / (d + f.def.r)) * k;
      y += (dy / (d + f.def.r)) * k;
    }
  }
  // Steps aside from whatever is flying at it.
  for (const s of w.shots) {
    if (s.mine) continue;
    const dx = h.x - s.x;
    const dy = h.y - 14 - s.y;
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const along = (dx * s.vx + dy * s.vy) / speed;
    const off = (dx * -s.vy + dy * s.vx) / speed;
    if (along > 0 && along < 190 && Math.abs(off) < 34) {
      const side = off >= 0 ? 1 : -1;
      x += (-s.vy / speed) * side * 2.6;
      y += (s.vx / speed) * side * 2.6;
    }
  }
  // What has to be stepped out of whoever the hero is: a charge, a burst, a shot.
  const dodging = w.foes.some((f) => f.state === 'dash' || f.doing === 'charge' || f.doing === 'burst') || Math.hypot(x, y) > 2.2;
  const pressed = Math.hypot(x, y) > 0.4;
  // Isaura rides her laps unless something has to be stepped out of: a turn loses her lance.
  if (w.quirk === 'tilt' && !dodging && w.gathering < 0 && w.foes.length > 0) return lap(w);
  // Bram stands his ground behind his shield while there is someone to hit and nothing to step out of, and he is not badly hurt.
  if (w.quirk === 'standfast' && !dodging && nearest <= stand * 1.2 && h.hp / h.maxHp > 0.3) return { x: 0, y: 0 };
  // Closes with the nearest when nothing is in reach.
  if (nearest < Infinity && nearest > stand) {
    const d = Math.hypot(nx, ny) || 1;
    x += (nx / d) * 0.9;
    y += (ny / d) * 0.9;
  }
  // What the road has put on the field is gone for when nothing presses: the shrine's ring is stood in, the cage and the wagon are closed with.
  if (!dodging) {
    const sh = w.shrine;
    if (sh && !sh.done) {
      const d = Math.hypot(sh.x - h.x, sh.y - h.y);
      // In the ring it stays put, well inside the edge, unless it is being hurt badly.
      if (d < sh.r * 0.55 && h.hp / h.maxHp > 0.35) return { x: 0, y: 0 };
      x += ((sh.x - h.x) / (d || 1)) * 2.2;
      y += ((sh.y - h.y) / (d || 1)) * 2.2;
    }
    const thing = w.foes.find((f) => f.def.prop);
    if (thing) {
      const d = Math.hypot(thing.x - h.x, thing.y - h.y);
      if (d > stand) {
        x += ((thing.x - h.x) / (d || 1)) * 1.6;
        y += ((thing.y - h.y) / (d || 1)) * 1.6;
      }
    }
  }
  // Goes for what lies near, when it is not being pressed.
  if (!pressed) {
    let best = Infinity;
    let px = 0;
    let py = 0;
    for (const p of w.picks) {
      if (p.pulled || (p.kind === 'heart' && h.hp >= h.maxHp)) continue;
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (d < best && d < 300) {
        best = d;
        px = p.x - h.x;
        py = p.y - h.y;
      }
    }
    if (best < Infinity) {
      x += (px / (best || 1)) * 0.8;
      y += (py / (best || 1)) * 0.8;
    }
  }
  // Keeps off the walls, where there is nowhere to go.
  const wall = 120;
  if (h.x < wall) x += ((wall - h.x) / wall) * 1.5;
  if (h.x > w.w - wall) x -= ((h.x - (w.w - wall)) / wall) * 1.5;
  if (h.y < wall) y += ((wall - h.y) / wall) * 1.5;
  if (h.y > w.h - wall) y -= ((h.y - (w.h - wall)) / wall) * 1.5;
  const len = Math.hypot(x, y);
  if (len > 0.05) return { x: x / len, y: y / len };
  return { x: 0, y: 0 };
}

/** What the plain player values on a level: health and harm before anything clever. */
const WANT: Partial<Record<Stat, number>> = { damage: 3, haste: 2.6, maxHp: 2.4, armor: 2.2, might: 2, aim: 2, lore: 2, regen: 1.6, speed: 1.5, crit: 1.4, dodge: 1.4, lifesteal: 1.2, reach: 1, bounty: 1, luck: 0.8 };

/** Takes every choice a level is waiting on. */
export function botLevel(run: RunData): void {
  let guard = 0;
  while (run.phase === 'level' && guard++ < 50) {
    let best = 0;
    let bestScore = -1;
    run.choices.forEach((c, i) => {
      // A bond is worth about what the best of the rest is.
      const score = c.bond ? 3.2 : (WANT[c.stat] ?? 1) * (1 + c.tier * 0.8);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    choose(run, best);
  }
}

/**
 * What the plain player thinks each relic is worth. The ones that are plainly more harm come first; the ones that ask
 * to be played round, which it does not do, come last.
 */
const RELIC_WANT: Record<string, number> = {
  ageswhet: 9, echobell: 8, stormglass: 8, emberheart: 8, horn: 7.5, lastcandle: 7.5, fallen: 7, twinquiver: 7, bellows: 6.5, wolfskin: 6.5, spade: 6.5, thornmail: 6, frostbite: 6,
  whistle: 6, bowl: 5.5, sands: 5.5, shell: 5, mirror: 5, magpie: 5, ledger: 4.5, spurs: 4, seal: 4, oldmap: 4, tithe: 3.5, bonedice: 3, crown: 2,
};

/** Takes a relic for every one that is waiting to be chosen. */
export function botRelic(run: RunData): void {
  let guard = 0;
  while (run.phase === 'relic' && guard++ < 20) {
    let best = 0;
    run.relicChoices.forEach((id, i) => {
      if ((RELIC_WANT[id] ?? 5) > (RELIC_WANT[run.relicChoices[best]] ?? 5)) best = i;
    });
    takeRelic(run, best);
    // A choice for a level may follow a relic, and a relic a level.
    botLevel(run);
  }
}

/**
 * How much the plain player wants each road, hale and hurt. It takes the dangerous prizes while it is winning and
 * pays the toll when it is not. It does not always take the one it wants most: a player who did would say nothing
 * about the rest.
 */
const ROAD_WANT: Record<Omen, readonly [number, number]> = {
  quiet: [1, 1], horde: [2.4, 0.6], champions: [2.6, 0.3], forced: [2.2, 0.2], toll: [1, 4], duel: [2.4, 0.5], wounded: [2.6, 0.8], stray: [4, 3], shrine: [2.8, 1.6], wagon: [2.6, 1.2],
  burning: [2.6, 0.9], night: [2.4, 0.4], blizzard: [2.6, 1.2],
};

/** Picks a road, if roads are laid out: each as likely as it is wanted. */
export function botRoad(run: RunData): void {
  if (run.phase !== 'road') return;
  // Hale is having come out of the last wave with more than half its health.
  const hurt = run.left < 0.5 ? 1 : 0;
  const wants = run.roads.map((r) => ROAD_WANT[r.omen][hurt] ** 2);
  const all = wants.reduce((a, b) => a + b, 0);
  // Its own dice, from where the run's stand: it does not move the run's.
  let at = ((Math.imul(run.dice ^ (run.wave * 2654435761), 1664525) + 1013904223) >>> 0) / 4294967296 * all;
  let pick = 0;
  for (let i = 0; i < wants.length; i++) {
    at -= wants[i];
    if (at <= 0) {
      pick = i;
      break;
    }
  }
  takeRoad(run, pick);
}

/** Trades in the camp as the plain player does, and leaves for the next wave by one of its roads. */
export function botCamp(run: RunData): void {
  botLevel(run);
  botRelic(run);
  while (run.packs > 0) openPack(run);
  let guard = 0;
  while (run.phase === 'camp' && guard++ < 40) {
    // Joins what can be joined: one better weapon for two, and a hand free.
    const twin = run.weapons.findIndex((w, i) => twinOf(run, w.id, w.tier, i) >= 0);
    if (twin >= 0 && run.weapons.length >= SLOTS - 1) {
      combine(run, twin);
      continue;
    }
    let best = -1;
    let bestScore = 0;
    run.offers.forEach((o, i) => {
      if (whyNot(run, i) !== '') return;
      // A relic before anything; then weapons, more so one of a kind it holds already; then things.
      let score = o.kind === 'relic' ? 200 : o.kind === 'weapon' ? (run.weapons.length < SLOTS ? 100 : 70) + o.tier * 40 : 30 + o.tier * 25;
      if (o.kind === 'weapon') {
        const counts = kindCounts(run);
        for (const k of weaponOf(o.id).kinds) if (counts[k] > 0 && counts[k] < 4) score += 22;
      }
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) {
      // Fenn tosses for what he would have bought, once in a camp, when it is dear enough to be worth the toss.
      if (canToss(run, best) && run.offers[best].price >= 30) toss(run, best);
      else buy(run, best);
      continue;
    }
    // Looks at other wares when it has coins to spare and has not looked twice already.
    if (run.rerolls < 2 && run.gold >= rerollPrice(run) + 22 + run.wave * 3) {
      reroll(run);
      continue;
    }
    break;
  }
  march(run);
  botRoad(run);
}
