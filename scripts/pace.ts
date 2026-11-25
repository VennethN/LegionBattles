// npm run pace -- [--runs=12] [--hero=knight] [--waves=40] [--each]
//
// Plays runs with the plain player (src/game/bot.ts) and says how they go:
// how many come through each wave, how much health is left at its end, how
// many coins it gave and what the hero stood at. It is how the numbers in
// src/game/data.ts are set: run it before and after changing one, and say
// what moved. --each prints every run's last wave.

import { HEROES, LAST_WAVE } from '../src/game/data';
import { botCamp, botSteer } from '../src/game/bot';
import { endWave, newRun, setupOf, statsOf, survived } from '../src/game/run';
import { STEP, World } from '../src/game/world';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runs = Number(option('runs', '12'));
const most = Number(option('waves', '40'));
const only = option('hero', '');
const each = args.includes('--each');
// --why says who hurt the hero on each wave: how a wall is found.
const why = args.includes('--why');

interface WaveRow {
  came: number;
  through: number;
  hpLeft: number;
  gold: number;
  kills: number;
  level: number;
  hands: number;
  by: Record<string, number>;
}

const median = (list: number[]): number => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

for (const hero of HEROES.filter((h) => !only || h.id === only)) {
  const rows: WaveRow[] = [];
  const ends: number[] = [];
  for (let n = 0; n < runs; n++) {
    const run = newRun(hero.id, 1000 + n * 7919);
    while (run.phase !== 'over' && run.wave <= most) {
      const world = new World(setupOf(run));
      const row = (rows[run.wave - 1] ??= { came: 0, through: 0, hpLeft: 0, gold: 0, kills: 0, level: 0, hands: 0, by: {} });
      row.came++;
      let guard = 0;
      while (!world.over && guard++ < 60 * 200) world.step(botSteer(world), STEP);
      if (world.over === 'cleared') {
        row.through++;
        row.hpLeft += world.hero.hp / world.hero.maxHp;
        row.gold += world.gold;
        row.kills += world.kills;
      }
      for (const [k, v] of Object.entries(world.hurtBy)) row.by[k] = (row.by[k] ?? 0) + v;
      endWave(run, world);
      if ((run.phase as string) !== 'over') {
        row.level += run.level;
        row.hands += run.weapons.length;
        botCamp(run);
      }
    }
    ends.push(survived(run));
  }
  console.log(`\n${hero.name}: ${runs} runs, waves come through: half ${median(ends)}, least ${Math.min(...ends)}, most ${Math.max(...ends)}${each ? `  [${ends.join(' ')}]` : ''}`);
  console.log('wave  came  through  health left  coins  kills  level  hands');
  rows.forEach((r, i) => {
    if (i >= 12 && (i + 1) % 2 === 1 && i + 1 !== LAST_WAVE) return;
    const t = Math.max(1, r.through);
    const cells = [
      String(i + 1).padStart(4),
      String(r.came).padStart(4),
      String(r.through).padStart(7),
      `${Math.round((100 * r.hpLeft) / t)}%`.padStart(11),
      String(Math.round(r.gold / t)).padStart(5),
      String(Math.round(r.kills / t)).padStart(5),
      (r.level / t).toFixed(1).padStart(5),
      (r.hands / t).toFixed(1).padStart(5),
    ];
    const who = Object.entries(r.by).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${(v / r.came).toFixed(1)}`).join(', ');
    console.log(cells.join('  ') + (why ? `   ${who}` : ''));
  });
  void statsOf;
}
