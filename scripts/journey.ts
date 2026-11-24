// npm run journey [players] [--losses]
//
// Plays new players through the whole game by its own rules, in seconds, and
// says for each world how many battles it took, how many were lost, how long
// a battle lasted and how strong the team was when its boss fell. Run it
// before and after changing a stage, a unit's numbers, a pack or what a win
// pays: it is how a wall or a walkover is found.
//
// The players are plain: they open every pack they get, buy the best pack
// they can afford, field their strongest cards, and when a stage beats them
// they go back one stage for coins and experience before trying again.

import { PACKS } from '../src/data/packs';
import { WORLDS } from '../src/data/worlds';
import { GRADES } from '../src/game/rarity';
import {
  bestTeam, buyPack, cardPower, finishStage, frontier, openPack, packOpen, packPool, stageInput, startingSave, teamSize, worldDone,
} from '../src/game/rules';
import type { SaveData } from '../src/game/state';
import { runBattle } from '../src/sim/battle';

const args = process.argv.slice(2);
const players = Number(args.find((a) => /^\d+$/.test(a)) ?? 12);
const showLosses = args.includes('--losses');
const CAP = 1500;

interface WorldLog {
  battles: number;
  losses: number;
  seconds: number;
  power: number;
  size: number;
  best: string;
}

function prepare(save: SaveData): void {
  // Open what is held, then spend: the dearest pack on sale that can be afforded, until nothing can.
  for (;;) {
    let opened = false;
    for (const p of PACKS) {
      while ((save.packs[p.id] ?? 0) > 0 && packPool(save, p).length > 0) {
        openPack(save, p.id);
        opened = true;
      }
    }
    const buyable = PACKS.filter((p) => packOpen(save, p) && save.coins >= p.cost).sort((a, b) => b.cost - a.cost);
    if (buyable.length === 0) {
      if (!opened) break;
      continue;
    }
    buyPack(save, buyable[0].id);
  }
  save.team = bestTeam(save);
}

function play(seed: number): { worlds: WorldLog[]; lost: Map<string, number>; done: boolean; battles: number } {
  const save = startingSave(seed);
  const worlds: WorldLog[] = WORLDS.map(() => ({ battles: 0, losses: 0, seconds: 0, power: 0, size: 0, best: '' }));
  const lost = new Map<string, number>();
  let battles = 0;
  let stumbles = 0;
  while (battles < CAP && !worldDone(save, WORLDS[WORLDS.length - 1].id)) {
    prepare(save);
    const [w, front] = frontier(save);
    // After a loss, a stage further back each time, until the team has grown enough to go on.
    const stage = Math.max(0, front - stumbles);
    const r = runBattle(stageInput(save, WORLDS[w], stage), false);
    const won = r.winner === 0;
    finishStage(save, w, stage, won);
    battles++;
    const log = worlds[w];
    log.battles++;
    log.seconds += r.seconds;
    if (!won) {
      log.losses++;
      if (stage === front) lost.set(`${WORLDS[w].name} ${front + 1}`, (lost.get(`${WORLDS[w].name} ${front + 1}`) ?? 0) + 1);
    }
    if (stage === front) stumbles = won ? 0 : Math.min(3, stumbles + 1);
    else if (won) stumbles = 0;
    if (won && stage === front && worldDone(save, WORLDS[w].id)) {
      const team = save.team.map((p) => p.unit);
      log.power = Math.round(team.reduce((a, u) => a + cardPower(save, u), 0) / Math.max(1, team.length));
      log.size = teamSize(save);
      const best = Object.entries(save.cards).sort((a, b) => cardPower(save, b[0]) - cardPower(save, a[0]))[0];
      log.best = `${best[0]} ${GRADES[best[1].grade]}${best[1].level}`;
    }
  }
  return { worlds, lost, done: worldDone(save, WORLDS[WORLDS.length - 1].id), battles };
}

const runs = Array.from({ length: players }, (_, i) => play(1000 + i * 7919));
const mid = (list: number[]): number => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const avg = (list: number[]): number => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length);

console.log(`${players} new players, through ${WORLDS.length} worlds (${runs.filter((r) => r.done).length} finished)`);
console.log('world            battles: half took under / average / slowest   lost   a battle   boss fell with');
WORLDS.forEach((w, i) => {
  const logs = runs.map((r) => r.worlds[i]).filter((l) => l.power > 0);
  if (logs.length === 0) {
    console.log(`${w.name.padEnd(16)} nobody finished it`);
    return;
  }
  const b = logs.map((l) => l.battles);
  console.log(
    `${w.name.padEnd(16)} ${String(mid(b)).padStart(7)} / ${avg(b).toFixed(0).padStart(4)} / ${String(Math.max(...b)).padStart(4)}`.padEnd(46) +
      `${Math.round((100 * avg(logs.map((l) => l.losses))) / avg(b))}%`.padStart(7) +
      `${avg(logs.map((l) => l.seconds / l.battles)).toFixed(1)} s`.padStart(10) +
      `   power ${Math.round(avg(logs.map((l) => l.power)))}, team of ${logs[0].size}, e.g. ${logs[0].best}`,
  );
});
console.log(`whole game: half took under ${mid(runs.map((r) => r.battles))} battles, the slowest ${Math.max(...runs.map((r) => r.battles))}`);

if (showLosses) {
  const total = new Map<string, number>();
  for (const r of runs) for (const [k, n] of r.lost) total.set(k, (total.get(k) ?? 0) + n);
  console.log('\nlosses at the front, per player (where the walls are):');
  for (const [k, n] of [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(`  ${k.padEnd(22)} ${(n / players).toFixed(1)}`);
  }
}
