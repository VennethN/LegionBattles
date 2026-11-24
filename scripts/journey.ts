// npm run journey [players] [--worlds=N] [--losses] [--copies]
//
// Plays new players along the line of stages by the game's own rules, in
// seconds, and says for each world how many battles it took, how many were
// lost, how long a battle lasted and how strong the team was when its boss
// fell. Run it before and after changing a stage, a unit's numbers, a pack
// or what a win pays: it is how a wall or a walkover is found.
//
// Without --worlds it plays the first lap of the lands, three worlds. With
// it, as many worlds as are named: --worlds=15 is the whole line.
//
// The players are plain: they open every pack they get, buy the dearest pack
// on sale while they can afford it (they do not spend what is left on heaps
// of cheap ones, as nobody opens forty packs between battles), combine every
// copy into the best card of its unit and every card that will not fight
// into one that will, press FILL TEAM, and when a stage beats them they go back a stage or two for coins
// and experience before trying again. With --copies they combine nothing
// and field copies as cards of their own, which says which of the two a
// card is better used for.

import { allPacks } from '../src/data/packs';
import { STAGES, WORLDS, stageStrength } from '../src/data/stages';
import { cardOf, cardsOf, combine } from '../src/game/cards';
import { GRADES, MAX_LEVEL } from '../src/game/rarity';
import {
  MAX_TEAM, bestTeam, buyPack, cardPower, cleared, finishStage, openPack, packOpen, packPool, stageInput, startingSave, teamSize,
} from '../src/game/rules';
import type { SaveData } from '../src/game/state';
import { runBattle } from '../src/sim/battle';

const args = process.argv.slice(2);
const players = Number(args.find((a) => /^\d+$/.test(a)) ?? 12);
const depth = Math.max(1, Math.min(WORLDS.length, Number(args.find((a) => a.startsWith('--worlds='))?.split('=')[1] ?? 3)));
const showLosses = args.includes('--losses');
const KEEP_COPIES = args.includes('--copies');
/** A world that takes more battles than this is a wall: the player gives up there. */
const WALL = 500;

interface Leg {
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
    // Only the dearer packs on sale: what is left over is kept for the next of those.
    const onSale = PACK_LIST.filter((p) => packOpen(save, p));
    const dearest = Math.max(...onSale.map((p) => p.cost));
    const buyable = onSale.filter((p) => save.coins >= p.cost && p.cost >= dearest * 0.5).sort((a, b) => b.cost - a.cost);
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
    // And every card that will not fight goes into one that will, the lowest of them first.
    // A few are kept back, so that a place that opens in the team has a card to take it.
    save.team = bestTeam(save);
    const idle = save.cards.filter((c) => !save.team.some((p) => p.card === c.id)).sort((x, y) => cardPower(y) - cardPower(x));
    for (const card of idle.slice(MAX_TEAM - save.team.length)) {
      const fighters = save.team.map((p) => cardOf(save, p.card)).filter((c) => c && c.level < MAX_LEVEL);
      fighters.sort((x, y) => (x?.level ?? 0) - (y?.level ?? 0));
      if (fighters[0]) combine(save, fighters[0].id, [card.id]);
    }
  }
  save.team = bestTeam(save);
}

function play(seed: number): { legs: Leg[]; lost: Map<number, number>; battles: number } {
  const save = startingSave(seed);
  const legs: Leg[] = [];
  const lost = new Map<number, number>();
  let battles = 0;
  for (let w = 0; w < depth; w++) {
    const world = WORLDS[w];
    const leg: Leg = { battles: 0, losses: 0, seconds: 0, power: 0, size: 0, best: '', copies: 0, done: false };
    legs.push(leg);
    let stumbles = 0;
    while (leg.battles < WALL && cleared(save) <= world.last) {
      prepare(save);
      const front = cleared(save);
      // After a loss, a stage further back each time, until the team has grown enough to go on.
      const stage = Math.max(0, front - stumbles);
      const r = runBattle(stageInput(save, stage), false);
      const won = r.winner === 0;
      finishStage(save, stage, won);
      battles++;
      leg.battles++;
      leg.seconds += r.seconds;
      if (!won) {
        leg.losses++;
        if (stage === front) lost.set(front, (lost.get(front) ?? 0) + 1);
      }
      if (stage === front) stumbles = won ? 0 : Math.min(3, stumbles + 1);
      else if (won) stumbles = 0;
    }
    if (cleared(save) <= world.last) break;
    const team = save.team.map((p) => cardOf(save, p.card));
    leg.done = true;
    leg.power = Math.round(team.reduce((a, c) => a + cardPower(c), 0) / Math.max(1, team.length));
    leg.size = teamSize(save);
    const best = [...save.cards].sort((a, b) => cardPower(b) - cardPower(a))[0];
    leg.best = `${best.unit} ${GRADES[best.grade]}${best.level}`;
    // How many of the team are a second or third card of a unit already in it.
    leg.copies = team.length - new Set(team.map((c) => c?.unit)).size;
  }
  return { legs, lost, battles };
}

const runs = Array.from({ length: players }, (_, i) => play(1000 + i * 7919));
const mid = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log(`${players} new players, ${depth} ${depth === 1 ? 'world' : 'worlds'} of ${WORLDS.length}, ${WORLDS[depth - 1].last + 1} stages of ${STAGES.length}`);
console.log('world                     stages   strength  battles: half took under / average / slowest   lost   a battle   boss fell with');
for (let w = 0; w < depth; w++) {
  const world = WORLDS[w];
  const name = `${String(w + 1).padStart(2)} ${world.name}`.padEnd(24) + `${world.first + 1}-${world.last + 1}`.padStart(8) + stageStrength(world.last).toFixed(1).padStart(10);
  const logs = runs.map((r) => r.legs[w]).filter((l): l is Leg => !!l && l.done);
  if (logs.length === 0) {
    console.log(`${name}   no one finished it`);
    continue;
  }
  const b = logs.map((l) => l.battles);
  console.log(
    `${name} ${String(mid(b)).padStart(10)} / ${avg(b).toFixed(0).padStart(4)} / ${String(Math.max(...b)).padStart(4)}`.padEnd(82) +
      `${Math.round((100 * avg(logs.map((l) => l.losses))) / avg(b))}%`.padStart(6) +
      `${avg(logs.map((l) => l.seconds / l.battles)).toFixed(1)} s`.padStart(10) +
      `   power ${Math.round(avg(logs.map((l) => l.power)))}, team of ${logs[0].size}` +
      (KEEP_COPIES ? `, ${avg(logs.map((l) => l.copies)).toFixed(1)} of them copies` : '') +
      `, e.g. ${logs[0].best}` +
      (logs.length < players ? `   (${logs.length} of ${players} finished)` : ''),
  );
}
console.log(`all of it: half took under ${mid(runs.map((r) => r.battles))} battles, the slowest ${Math.max(...runs.map((r) => r.battles))}`);

if (showLosses) {
  const total = new Map<number, number>();
  for (const r of runs) for (const [k, v] of r.lost) total.set(k, (total.get(k) ?? 0) + v);
  const worst = [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('\nlost most often, per player:');
  for (const [k, v] of worst) console.log(`  stage ${String(k + 1).padStart(3)} ${STAGES[k].def.name.padEnd(22)} ${WORLDS.find((w) => k >= w.first && k <= w.last)?.name.padEnd(18)} ${(v / players).toFixed(1)}`);
}
