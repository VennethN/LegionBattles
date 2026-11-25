// npm run pace -- [--runs=12] [--hero=bram] [--band=biscuit,pip] [--friends] [--waves=40] [--brief] [--each] [--why]
//
// Plays runs with the plain player (src/game/bot.ts) and says how they go:
// how many come through each wave, how much health is left at its end, how
// many coins it gave and what the hero stood at. It is how the numbers in
// src/game are set: run it before and after changing one, and say what
// moved.
//
// --band names who goes along. --friends plays one hero (Bram unless
// --hero names another) alone and then with each companion in turn.
// --brief prints one line to a hero. --each prints every run's last wave.

import { COMPANIONS, HEROES, LAST_WAVE } from '../src/game/data';
import { botCamp, botSteer } from '../src/game/bot';
import { endWave, newRun, setupOf, survived } from '../src/game/run';
import { STEP, World } from '../src/game/world';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runs = Number(option('runs', '12'));
const most = Number(option('waves', '40'));
const only = option('hero', '');
const band = option('band', '').split(',').filter(Boolean);
const friends = args.includes('--friends');
const each = args.includes('--each');
const brief = args.includes('--brief') || friends;
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
  /** The share of the wave the band was on its feet for, and how many moves were let loose. */
  up: number;
  moves: number;
  by: Record<string, number>;
}

const median = (list: number[]): number => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function measure(hero: string, who: readonly string[], label: string): void {
  const rows: WaveRow[] = [];
  const ends: number[] = [];
  for (let n = 0; n < runs; n++) {
    const run = newRun(hero, 1000 + n * 7919, who);
    while (run.phase !== 'over' && run.wave <= most) {
      const setup = setupOf(run);
      // For finding out what a part of a hero is worth: the same runs without their move, their quirk, or their own weapon's growing.
      if (args.includes('--nomove')) setup.move = null;
      if (args.includes('--noquirk')) setup.quirk = null;
      if (args.includes('--nogrow') && setup.own) setup.own = { id: setup.own.id, tier: 0 };
      const world = new World(setup);
      const row = (rows[run.wave - 1] ??= { came: 0, through: 0, hpLeft: 0, gold: 0, kills: 0, level: 0, hands: 0, up: 0, moves: 0, by: {} });
      row.came++;
      let guard = 0;
      let up = 0;
      let steps = 0;
      while (!world.over && guard++ < 60 * 200) {
        world.step(botSteer(world), STEP);
        steps++;
        if (world.band.length) up += world.band.filter((a) => a.down <= 0).length / world.band.length;
        for (const e of world.drain()) if (e.t === 'move') row.moves++;
      }
      row.up += steps ? up / steps : 0;
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
  const mean = ends.reduce((a, b) => a + b, 0) / ends.length;
  // The written game is twenty waves: past them a run that got away says little, so the mean is also taken with every run stopped there.
  const written = ends.reduce((a, b) => a + Math.min(b, LAST_WAVE), 0) / ends.length;
  const won = ends.filter((e) => e >= LAST_WAVE).length;
  console.log(`${brief ? '' : '\n'}${label.padEnd(34)} ${runs} runs, waves come through: half ${String(median(ends)).padStart(2)}, mean ${mean.toFixed(1).padStart(4)} (${written.toFixed(1).padStart(4)} of the written ${LAST_WAVE}, ${won} won), least ${String(Math.min(...ends)).padStart(2)}, most ${String(Math.max(...ends)).padStart(2)}${each ? `  [${ends.join(' ')}]` : ''}`);
  if (brief) return;
  console.log('wave  came  through  health left  coins  kills  level  hands  band up  moves');
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
      (who.length ? `${Math.round((100 * r.up) / r.came)}%` : '').padStart(7),
      (r.moves / r.came).toFixed(1).padStart(5),
    ];
    const hurt = Object.entries(r.by).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${(v / r.came).toFixed(1)}`).join(', ');
    console.log(cells.join('  ') + (why ? `   ${hurt}` : ''));
  });
}

if (friends) {
  const hero = only || HEROES[0].id;
  measure(hero, [], `${hero} alone`);
  for (const c of COMPANIONS) measure(hero, [c.id], `${hero} with ${c.name}`);
} else {
  for (const hero of HEROES.filter((h) => !only || h.id === only)) measure(hero.id, band, band.length ? `${hero.name} with ${band.join(', ')}` : hero.name);
}
