// A plain player, for measuring the game without one: it steers the hero
// away from what would hurt, toward what it can hit and what lies on the
// ground, and in the camp it buys what it can afford. It plays worse than a
// person who is paying attention and better than one who is not, which is
// about where a first run sits. The pace report and the tests use it; the
// game never does.

import { SLOTS } from './data';
import { buy, choose, combine, march, openPack, reroll, rerollPrice, twinOf, whyNot, type RunData } from './run';
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
  mind.steer = { x: best.x * c - best.y * sn, y: best.x * sn + best.y * c };
  return mind.steer;
}

function think(w: World): Steer {
  const h = w.hero;
  let x = 0;
  let y = 0;
  // It stands where everything it carries can reach, and no nearer than it must.
  let reach = Infinity;
  for (const s of w.slots) reach = Math.min(reach, s.def.motion === 'pulse' ? (s.def.burst ?? 100) : w.rangeOf(s.def));
  const stand = Math.max(62, Math.min(240, reach * 0.78));

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
  const pressed = Math.hypot(x, y) > 0.4;
  // Closes with the nearest when nothing is in reach.
  if (nearest < Infinity && nearest > stand) {
    const d = Math.hypot(nx, ny) || 1;
    x += (nx / d) * 0.9;
    y += (ny / d) * 0.9;
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
  return len > 0.05 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
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
      const score = (WANT[c.stat] ?? 1) * (1 + c.tier * 0.8);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    choose(run, best);
  }
}

/** Trades in the camp as the plain player does, and leaves for the next wave. */
export function botCamp(run: RunData): void {
  botLevel(run);
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
      const score = o.kind === 'weapon' ? (run.weapons.length < SLOTS ? 100 : 70) + o.tier * 40 : 30 + o.tier * 25;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) {
      buy(run, best);
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
}
