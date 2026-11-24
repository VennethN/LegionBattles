// npm run journey [players] [--difficulties=N] [--losses] [--copies]
//
// Plays new players through the game by its own rules, in seconds, and says
// for each world how many battles it took, how many were lost, how long a
// battle lasted and how strong the team was when its boss fell. Run it
// before and after changing a stage, a unit's numbers, a pack or what a win
// pays: it is how a wall or a walkover is found.
//
// Without --difficulties it plays every world on Easy. With it, the players
// may also go back to a world at a harder difficulty, up to the Nth, and
// they always take whichever open world and difficulty is weakest: the
// order a sensible player climbs in.
//
// The players are plain: they open every pack they get, buy the dearest pack
// they can afford, combine every copy into the best card of its unit, field
// their strongest cards, and when a stage beats them they go back a stage or
// two for coins and experience before trying again. With --copies they
// combine nothing and field copies as cards of their own, which says which of
// the two a copy is better used for.

import { DIFFICULTIES } from '../src/data/difficulties';
import { allPacks } from '../src/data/packs';
import { WORLDS } from '../src/data/worlds';
import { SETS } from '../src/data/units';
import { cardOf, cardsOf, combine } from '../src/game/cards';
import { GRADES, cardMult } from '../src/game/rarity';
import {
  bestTeam, buyPack, cardPower, clearedIn, difficultyOpen, finishStage, openPack, packOpen, packPool, stageInput, stageStanding,
  startingSave, teamSize, worldDone,
} from '../src/game/rules';
import type { SaveData } from '../src/game/state';
import { runBattle } from '../src/sim/battle';

const args = process.argv.slice(2);
const players = Number(args.find((a) => /^\d+$/.test(a)) ?? 12);
const depth = Math.min(DIFFICULTIES.length, Number(args.find((a) => a.startsWith('--difficulties='))?.split('=')[1] ?? 1));
const showLosses = args.includes('--losses');
const KEEP_COPIES = args.includes('--copies');
const CAP = 1500 * depth;

interface Leg {
  d: number;
  w: number;
  battles: number;
  losses: number;
  seconds: number;
  power: number;
  size: number;
  best: string;
  /** Cards of the team that are another card of a unit already in it. */
  copies: number;
  done: boolean;
}

const PACK_LIST = allPacks();

function prepare(save: SaveData): void {
  // Open what is held, then spend: the dearest pack on sale that can be afforded, until nothing can.
  for (;;) {
    let opened = false;
    for (const p of PACK_LIST) {
      while ((save.packs[p.id] ?? 0) > 0 && packPool(save, p).length > 0) {
        openPack(save, p.id);
        opened = true;
      }
    }
    const buyable = PACK_LIST.filter((p) => packOpen(save, p) && save.coins >= p.cost).sort((a, b) => b.cost - a.cost);
    if (buyable.length === 0) {
      if (!opened) break;
      continue;
    }
    buyPack(save, buyable[0].id);
  }
  if (!KEEP_COPIES) {
    // Every copy goes into the best card of its unit: the old card into a better pull, a worse pull into the old card.
    save.team = [];
    for (const unit of new Set(save.cards.map((c) => c.unit))) {
      const [best, ...rest] = cardsOf(save, unit);
      if (rest.length > 0) combine(save, best.id, rest.map((c) => c.id));
    }
  }
  save.team = bestTeam(save);
}

/** How strong a world's last stage is at a difficulty: what the players order their climb by. */
function strength(w: number, d: number): number {
  const world = WORLDS[w];
  const last = world.stages.length - 1;
  const at = stageStanding(world, last, d);
  // More enemies count for more than their share: they are harder to get round.
  const crowd = 1 + (0.15 * DIFFICULTIES[d].extra * 6) / world.stages[last].enemies.length;
  return SETS[world.set].power * cardMult(at.grade, at.level) * crowd;
}

function play(seed: number): { legs: Map<string, Leg>; lost: Map<string, number>; battles: number } {
  const save = startingSave(seed);
  const legs = new Map<string, Leg>();
  const lost = new Map<string, number>();
  let battles = 0;
  for (;;) {
    // The weakest world and difficulty that is open and not finished.
    let pick: [number, number] | null = null;
    for (let w = 0; w < WORLDS.length; w++) {
      for (let d = 0; d < depth; d++) {
        if (!difficultyOpen(save, w, d) || worldDone(save, WORLDS[w].id, d)) continue;
        if (!pick || strength(w, d) < strength(pick[0], pick[1])) pick = [w, d];
      }
    }
    if (!pick || battles >= CAP) break;
    const [w, d] = pick;
    const world = WORLDS[w];
    const leg: Leg = { d, w, battles: 0, losses: 0, seconds: 0, power: 0, size: 0, best: '', copies: 0, done: false };
    legs.set(`${w}:${d}`, leg);
    let stumbles = 0;
    // A rung that takes more than 500 battles is a wall: the player gives up there.
    while (battles < CAP && leg.battles < 500 && !worldDone(save, world.id, d)) {
      prepare(save);
      const front = clearedIn(save, world.id, d);
      // After a loss, a stage further back each time, until the team has grown enough to go on.
      const stage = Math.max(0, front - stumbles);
      const r = runBattle(stageInput(save, world, stage, d), false);
      const won = r.winner === 0;
      finishStage(save, w, stage, won, d);
      battles++;
      leg.battles++;
      leg.seconds += r.seconds;
      if (!won) {
        leg.losses++;
        if (stage === front) {
          const key = `${DIFFICULTIES[d].name} ${world.name} ${front + 1}`;
          lost.set(key, (lost.get(key) ?? 0) + 1);
        }
      }
      if (stage === front) stumbles = won ? 0 : Math.min(3, stumbles + 1);
      else if (won) stumbles = 0;
    }
    if (!worldDone(save, world.id, d)) break;
    {
      const team = save.team.map((p) => cardOf(save, p.card));
      leg.done = true;
      leg.power = Math.round(team.reduce((a, c) => a + cardPower(c), 0) / Math.max(1, team.length));
      leg.size = teamSize(save);
      const best = [...save.cards].sort((a, b) => cardPower(b) - cardPower(a))[0];
      leg.best = `${best.unit} ${GRADES[best.grade]}${best.level}`;
      // How many of the team are a second or third card of a unit already in it.
      leg.copies = team.length - new Set(team.map((c) => c?.unit)).size;
    }
  }
  return { legs, lost, battles };
}

const runs = Array.from({ length: players }, (_, i) => play(1000 + i * 7919));
const mid = (list: number[]): number => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const avg = (list: number[]): number => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);

console.log(`${players} new players, ${WORLDS.length} worlds, ${depth} ${depth === 1 ? 'difficulty' : 'difficulties'}`);
console.log('                   strength battles: half took under / average / slowest   lost   a battle   boss fell with');
// In the order they are climbed: weakest first.
const order: Array<[number, number]> = [];
for (let w = 0; w < WORLDS.length; w++) for (let d = 0; d < depth; d++) order.push([w, d]);
order.sort((a, b) => strength(a[0], a[1]) - strength(b[0], b[1]));
for (const [w, d] of order) {
  const all = runs.map((r) => r.legs.get(`${w}:${d}`)).filter((l): l is Leg => !!l);
  const logs = all.filter((l) => l.done);
  const name = `${DIFFICULTIES[d].name} ${WORLDS[w].name}`.padEnd(22) + strength(w, d).toFixed(1).padStart(5);
  if (logs.length === 0) {
    console.log(`${name} ${all.length === 0 ? 'nobody reached it' : 'nobody finished it'}`);
    continue;
  }
  const b = logs.map((l) => l.battles);
  console.log(
    `${name} ${String(mid(b)).padStart(7)} / ${avg(b).toFixed(0).padStart(4)} / ${String(Math.max(...b)).padStart(4)}`.padEnd(57) +
      `${Math.round((100 * avg(logs.map((l) => l.losses))) / avg(b))}%`.padStart(7) +
      `${avg(logs.map((l) => l.seconds / l.battles)).toFixed(1)} s`.padStart(10) +
      `   power ${Math.round(avg(logs.map((l) => l.power)))}, team of ${logs[0].size}` +
      (KEEP_COPIES ? `, ${avg(logs.map((l) => l.copies)).toFixed(1)} of them copies` : '') +
      `, e.g. ${logs[0].best}` +
      (logs.length < players ? `   (${logs.length} of ${players} finished)` : ''),
  );
}
console.log(`all of it: half took under ${mid(runs.map((r) => r.battles))} battles, the slowest ${Math.max(...runs.map((r) => r.battles))}`);

if (showLosses) {
  const total = new Map<string, number>();
  for (const r of runs) for (const [k, n] of r.lost) total.set(k, (total.get(k) ?? 0) + n);
  console.log('\nlosses at the front, per player (where the walls are):');
  for (const [k, n] of [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16)) {
    console.log(`  ${k.padEnd(34)} ${(n / players).toFixed(1)}`);
  }
}
