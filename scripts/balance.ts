// npm run balance [battles]
//
// Plays skirmishes (the player's four in their usual places against four
// random enemies) and says how long they last and who wins, and then how
// each unit does alone against each other. Run it before and after changing
// a number in src/data/units.ts.

import { SKIRMISH_ROSTER, UNITS } from '../src/data/units';
import { runBattle } from '../src/sim/battle';
import { defaultFormation, randomEnemyTeam } from '../src/sim/setup';

const n = Number(process.argv[2] ?? 400);
const times: number[] = [];
let wins = 0;
let draws = 0;
for (let seed = 1; seed <= n; seed++) {
  const r = runBattle(
    {
      seed,
      defs: UNITS,
      teams: [defaultFormation(SKIRMISH_ROSTER, (u) => UNITS[u].range <= 1.5), randomEnemyTeam(seed, SKIRMISH_ROSTER)],
    },
    false,
  );
  times.push(r.seconds);
  if (r.winner === 0) wins++;
  if (r.winner === -1) draws++;
}
times.sort((a, b) => a - b);
const at = (q: number): string => times[Math.min(times.length - 1, Math.floor(q * times.length))].toFixed(1);
const inBand = times.filter((t) => t >= 15 && t <= 30).length;
console.log(`${n} skirmishes, 4 against 4`);
console.log(`  length: shortest ${at(0)} s, a tenth under ${at(0.1)} s, half under ${at(0.5)} s, nine tenths under ${at(0.9)} s, longest ${at(1)} s`);
console.log(`  between 15 and 30 s: ${Math.round((100 * inBand) / n)}%`);
console.log(`  the player wins ${Math.round((100 * wins) / n)}%, draws ${Math.round((100 * draws) / n)}%`);

console.log('\none against one (row beats column in this many seconds; - for a loss)');
const ids = Object.keys(UNITS);
console.log(' '.repeat(11) + ids.map((i) => i.padStart(10)).join(''));
for (const a of ids) {
  let line = a.padEnd(11);
  for (const b of ids) {
    const r = runBattle({ seed: 1, defs: UNITS, teams: [[{ unit: a, col: 3, row: 1 }], [{ unit: b, col: 4, row: 1 }]] }, false);
    line += (r.winner === 0 ? r.seconds.toFixed(1) : r.winner === 1 ? '-' : 'draw').padStart(10);
  }
  console.log(line);
}
