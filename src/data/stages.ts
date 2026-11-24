// The line of stages: everything a player fights through, numbered from 1.
// One number says how far a player has got, and whatever opens (a bigger
// team, a pack, a dungeon, a raid) opens at a number. The owner, of this:
// "make everything into a big thing called Stage, which are basically
// numbered waves ... wave 1 - 10 will be the first world e.g, just so that
// everything fit on a linear scale and measurable scale nicely".
//
// A stretch of the line in one land is a world, and the game says which
// world a stage is in wherever it shows the stage's number. The owner again,
// a little later: "Let's actually still use worlds. But make it
// recognizeable that we're in what world we are in". So World 1 is
// Thornwood, stages 1 to 10, World 2 the dunes, 11 to 22, and World 4 is
// Thornwood again, harder: the line runs through the lands (lands.ts) in
// order and then through them again, five laps in all (laps.ts). There are
// no difficulties to pick: a later world is the harder one.
//
// How strong a stage's enemies are rises with its number. On the first lap
// a stage stands at the grade and level it is written with. After that the
// strength of a troop climbs evenly from the last stage of the first lap to
// TOP at the last stage of all, and its grade and level are worked out from
// that for whoever the land fields: a land of stronger units reaches the
// same strength at a lower grade and level, and a land whose units are
// simpler to fight is raised a little more (its `weight`). What a stage pays and teaches
// rises the same way, and so does the price of the pack it drops. Only
// + - * / are used, so that every machine works out the same line.

import { GRADES, LEVEL_STEP, cardMult, gradeMult } from '../game/rarity';
import { LANDS, landCoins, type LandDef, type StageDef } from './lands';
import { LAPS, lapOf } from './laps';
import { SETS, isStructure } from './units';

export interface Stage {
  /** Its place in the line, from 0. The number a player sees is one more. */
  index: number;
  /** Which time round the lands this is, from 0. */
  lap: number;
  /** Its land's place in LANDS, and its own place in that land. */
  land: number;
  local: number;
  /** Who stands where, its name and its kind. */
  def: StageDef;
  /**
   * How strong the line asks a troop of it to be, against a Crownlands unit
   * at the worst grade and level 1. It never falls from one stage to the
   * next. Its enemies' grade and level are worked out from it.
   */
  strength: number;
  /** What its enemies stand at. */
  grade: number;
  level: number;
  /** More enemies than it is written with. */
  extra: number;
  /** Coins for its first clear, and the experience a win gives each card that fought. */
  coins: number;
  xp: number;
  /** The pack it drops. */
  pack: string;
}

/** A world: a stretch of the line in one land. */
export interface World {
  /** Its place among the worlds, from 0. The number a player sees is one more. */
  index: number;
  lap: number;
  land: number;
  /** The first and last stages of it, as places in the line. */
  first: number;
  last: number;
  /** The land's name with the lap's mark: "Thornwood II". */
  name: string;
}

/** How strong a troop of the last stage of all is, against a Crownlands unit at the worst grade and level 1. */
export const TOP = 6.9;
/** A grade is taken for each time this fits into what a troop is multiplied by; its level makes up the rest. */
const GRADE_EVERY = 1.28;
/** What a plain stage pays at the last stage of all, before a boss's or a miniboss's share. */
const TOP_COINS = 4700;
/** What a boss's stage and a miniboss's pay over a plain one. */
const KIND_COINS = { normal: 1, miniboss: 1.25, boss: 1.6 } as const;
/** A land's pack on a later lap costs what a stage in the middle of its world pays, over this. */
const WINS_A_PACK = 1.3;

/** The second lap begins this much above where the first ended: its last boss was a wall, and what comes after must not be a stroll. */
const STEP_UP = 1.15;

/**
 * How strong a troop is at a stage of a later lap, before its land's
 * weight: from a step above the first lap's end to TOP at the last stage
 * of all, quickly at first and more slowly toward the end, as a player's
 * cards have less and less left to gain.
 */
function later(base: number, index: number, perLap: number, total: number): number {
  const t = (index - perLap) / (total - 1 - perLap);
  const from = base * STEP_UP;
  return from + (TOP - from) * ((2 * t) / (1 + t));
}

function strengthOf(land: LandDef, grade: number, level: number): number {
  return SETS[land.set].power * cardMult(grade, level);
}

function build(): { stages: Stage[]; worlds: World[] } {
  const stages: Stage[] = [];
  const worlds: World[] = [];
  const perLap = LANDS.reduce((n, l) => n + l.stages.length, 0);
  const total = perLap * LAPS.length;
  const lastLand = LANDS[LANDS.length - 1];
  const lastDef = lastLand.stages[lastLand.stages.length - 1];
  const base = strengthOf(lastLand, lastDef.grade, lastDef.level);
  for (let lap = 0; lap < LAPS.length; lap++) {
    LANDS.forEach((land, l) => {
      const first = stages.length;
      land.stages.forEach((def, local) => {
        const index = stages.length;
        let grade = def.grade;
        let level = def.level;
        let strength = strengthOf(land, grade, level);
        if (lap > 0) {
          strength = later(base, index, perLap, total);
          // What a troop of this land is multiplied by to be that strong, with as much of its land's weight as the lap counts.
          const weight = 1 + (land.weight - 1) * lapOf(lap).weight;
          const m = (strength * weight) / SETS[land.set].power;
          grade = 0;
          let fits = GRADE_EVERY;
          while (grade < GRADES.length - 1 && fits <= m) {
            grade++;
            fits *= GRADE_EVERY;
          }
          level = Math.max(1, Math.round(1 + (m / gradeMult(grade) - 1) / LEVEL_STEP));
        }
        // On the first lap a stage pays what its land is written with. After it, what a plain stage
        // pays climbs evenly from the last land's last to TOP_COINS, so that no stage pays less than
        // the one before it but for a boss's share.
        let coins = landCoins(land, local);
        if (lap > 0) {
          const t = (index - (perLap - 1)) / (total - perLap);
          coins = Math.round(((lastLand.coins[1] + (TOP_COINS - lastLand.coins[1]) * t) * KIND_COINS[def.kind]) / 5) * 5;
        }
        stages.push({
          index, lap, land: l, local, def, strength, grade, level,
          // A tower or a trap is not one of the troops a lap asks for.
          extra: Math.max(lapOf(lap).extra, lapOf(lap).least - def.enemies.filter((e) => !isStructure(e.unit)).length),
          coins,
          xp: Math.max(10, Math.round(25 * strength - 9)),
          pack: lap > 0 ? `${land.pack}@${lap}` : land.pack,
        });
      });
      worlds.push({ index: worlds.length, lap, land: l, first, last: stages.length - 1, name: `${land.name}${lapOf(lap).mark}` });
    });
  }
  return { stages, worlds };
}

const BUILT = build();

/** Every stage, in order. */
export const STAGES: readonly Stage[] = BUILT.stages;
/** Every world, in order. */
export const WORLDS: readonly World[] = BUILT.worlds;

/** The stage at a place in the line. One past either end gives the nearest. */
export function stageAt(index: number): Stage {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, Math.floor(index)))];
}

/** The world a stage is in. */
export function worldOf(index: number): World {
  const s = stageAt(index);
  return WORLDS[s.lap * LANDS.length + s.land];
}

export function landOf(index: number): LandDef {
  return LANDS[stageAt(index).land];
}

/** How strong the line asks a troop of a stage to be. */
export function stageStrength(index: number): number {
  return stageAt(index).strength;
}

/** The stage a land's units are first met at, as a place in the line: what `from` on a unit counts from. */
export function landStart(land: string): number {
  const l = LANDS.findIndex((x) => x.id === land || x.set === land);
  return l < 0 ? -1 : WORLDS[l].first;
}

/**
 * What a land's pack costs on a later lap: what a plain stage in the middle
 * of that world pays, over WINS_A_PACK, so that a pack stays about a win's
 * worth all along the line. Null on the first lap: the pack is written with
 * its price there.
 */
export function lapPackCost(land: string, lap: number): number | null {
  const l = LANDS.findIndex((x) => x.id === land);
  if (lap <= 0 || l < 0) return null;
  const world = WORLDS[lap * LANDS.length + l];
  const mid = STAGES[Math.floor((world.first + world.last) / 2)];
  return Math.round(mid.coins / KIND_COINS[mid.def.kind] / WINS_A_PACK / 10) * 10;
}
